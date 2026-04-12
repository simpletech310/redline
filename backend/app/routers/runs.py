from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload, joinedload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.db.session import get_db
from app.models import Run, RunParticipant, User, Machine, Pick, Wallet, Transaction, RedlineCard
from sqlalchemy.orm.attributes import flag_modified
from app.routers.auth import get_current_user
from app.routers.wallet import create_transaction

router = APIRouter()


PRELOADED_DATA = {
    "Mini Bikes": {
        "race_types": [{"value": "drag", "label": "Drag"}, {"value": "circuit", "label": "Circuit"}, {"value": "sprint", "label": "Sprint"}],
        "distances": ["60ft", "1/8 Mile", "1/4 Mile", "Track"],
        "vehicle_classes": ["50cc", "70cc", "110cc", "125cc", "140cc", "150cc+", "open_mini"],
        "mods": [
            "Stage 1 Exhaust", "Stage 2 Exhaust", "Big Bore Exhaust",
            "Race Carb", "Mikuni Flatslide", "Keihin FCR",
            "Big Bore Kit", "Big Bore 170cc", "Port & Polish", "High Comp Piston", "Race Cam", "Stroker Crank",
            "Race CDI", "High Rev CDI",
            "Race Clutch", "Manual Clutch Conversion", "Close Ratio Gears",
            "Upgraded Forks", "Rear Shock Upgrade", "Full Suspension Kit", "Swingarm Extension",
            "Lightweight Wheels", "Oil Cooler"
        ],
        "vehicle_types": [
            "Pocket Bike", "Pit Bike", "Mini Moto", "KX65", "KLX110",
            "CRF50", "CRF70", "CRF110", "CRF125",
            "TTR50", "TTR110", "TTR125",
            "Z50", "XR50", "XR70", "XR100",
            "SSR125", "SSR140", "SSR160",
            "Thumpstar 125", "Thumpstar 140",
            "YCF 125", "YCF 150", "Piranha 140", "Piranha 190"
        ],
    },
    "Cars": {
        "race_types": [{"value": "drag", "label": "Drag"}, {"value": "sprint", "label": "Sprint"}, {"value": "circuit", "label": "Circuit"}],
        "distances": ["1/4 Mile", "1/8 Mile", "Standing Mile"],
        "vehicle_classes": ["stock", "street", "drag", "track", "open_car"],
        "mods": ["Cold Air Intake", "Turbo Kit", "Cam Upgrade", "Slicks"],
    },
    "Motorcycles": {
        "race_types": [{"value": "drag", "label": "Drag"}, {"value": "sport", "label": "Sport"}],
        "distances": ["1/4 Mile", "1/8 Mile", "60ft"],
        "vehicle_classes": ["300_400cc", "600cc", "750cc", "1000cc", "open_moto"],
        "mods": ["Race Exhaust", "Power Commander", "Launch Control"],
    },
    "Drift": {
        "race_types": [{"value": "tandem", "label": "Tandem"}, {"value": "solo", "label": "Solo"}],
        "distances": ["Course", "Layout A", "Layout B"],
        "vehicle_classes": ["stock", "street", "track"],
        "mods": ["Diff Upgrade", "Coilovers", "Angle Kit"],
    },
    "Go-Karts": {
        "race_types": [{"value": "sprint", "label": "Sprint"}, {"value": "endurance", "label": "Endurance"}],
        "distances": ["Circuit", "Sprint Track"],
        "vehicle_classes": ["stock", "open_car"],
        "mods": ["Carb Jet", "Chain Upgrade"],
    },
}


class RunCreate(BaseModel):
    name: str
    motorsport: Optional[str] = None
    race_type: Optional[str] = None
    race_format: Optional[str] = "single_race"
    distance: Optional[str] = None
    surface: Optional[str] = None
    conditions: Optional[str] = None
    location: str
    date_time: datetime
    entry_fee: float = 0.0
    max_participants: int = 8
    description: Optional[str] = None
    picks_enabled: bool = True
    allowed_classes: Optional[list] = []


class ParticipantJoin(BaseModel):
    vehicle_id: Optional[str] = None


class ResultEntry(BaseModel):
    user_id: str
    placement: Optional[int] = None
    best_et: Optional[float] = None
    reaction_time: Optional[float] = None
    false_start: bool = False
    dnf_mechanical: bool = False
    dnf_rider_error: bool = False
    first_off_line: bool = False
    verified: bool = False


class PostResultsRequest(BaseModel):
    results: List[ResultEntry]


def _serialize_run(r: Run, participants=None) -> dict:
    return {
        "run_id": r.id, "id": r.id, "name": r.name,
        "motorsport": r.motorsport, "race_type": r.race_type,
        "race_format": r.race_format, "distance": r.distance,
        "surface": r.surface, "conditions": r.conditions,
        "location": r.location, "date_time": r.date_time.isoformat(),
        "entry_fee": r.entry_fee, "max_participants": r.max_participants,
        "description": r.description, "picks_enabled": r.picks_enabled,
        "results_posted": r.results_posted, "creator_id": r.creator_id,
        "allowed_classes": r.allowed_classes or [],
        "participant_count": len(r.participants) if r.participants else 0,
        "participants": participants,
    }


def _serialize_participant(p: RunParticipant) -> dict:
    vehicle = None
    if p.vehicle:
        m = p.vehicle
        vehicle = {
            "id": m.id, "name": m.name, "vehicle_type": m.vehicle_type,
            "vehicle_class": m.vehicle_class, "build_level": m.build_level,
            "inferred_stats": m.inferred_stats or {},
        }
    return {
        "id": p.id, "user_id": p.user_id,
        "username": p.user.username if p.user else None,
        "vehicle_id": p.vehicle_id, "vehicle": vehicle,
        "odds": p.odds, "placement": p.placement, "best_et": p.best_et,
        "reaction_time": p.reaction_time, "false_start": p.false_start,
        "dnf_mechanical": p.dnf_mechanical, "dnf_rider_error": p.dnf_rider_error,
    }


@router.get("/preloaded/{sport}")
def get_preloaded(sport: str):
    canonical = next((k for k in PRELOADED_DATA if k.lower() == sport.lower().replace("-", " ")), None)
    data = PRELOADED_DATA.get(canonical or sport, PRELOADED_DATA["Cars"])
    return data


@router.get("/available")
def get_available_runs(db: Session = Depends(get_db)):
    runs = db.query(Run).filter(Run.results_posted == False, Run.status == "open").order_by(Run.date_time).all()
    return [_serialize_run(r) for r in runs]


@router.get("/my")
def get_my_runs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    participated = db.query(RunParticipant).filter(RunParticipant.user_id == current_user.id).all()
    run_ids = [p.run_id for p in participated]
    created = db.query(Run).filter(Run.creator_id == current_user.id).all()
    all_ids = list(set(run_ids + [r.id for r in created]))
    runs = db.query(Run).filter(Run.id.in_(all_ids)).order_by(Run.date_time).all()
    return [_serialize_run(r) for r in runs]


@router.get("/{run_id}")
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = (
        db.query(Run)
        .options(
            selectinload(Run.participants)
            .joinedload(RunParticipant.vehicle),
            selectinload(Run.participants)
            .joinedload(RunParticipant.user),
        )
        .filter(Run.id == run_id)
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    participants = [_serialize_participant(p) for p in run.participants]
    return _serialize_run(run, participants=participants)


@router.post("", status_code=201)
def create_run(data: RunCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    run = Run(
        creator_id=current_user.id,
        name=data.name, motorsport=data.motorsport,
        race_type=data.race_type, race_format=data.race_format,
        distance=data.distance, surface=data.surface,
        conditions=data.conditions, location=data.location,
        date_time=data.date_time, entry_fee=data.entry_fee,
        max_participants=data.max_participants, description=data.description,
        picks_enabled=data.picks_enabled, allowed_classes=data.allowed_classes,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return {"run_id": run.id, "name": run.name}


class QuickRunCreate(BaseModel):
    name: str
    motorsport: str
    location: str
    date_time: datetime


@router.post("/quick", status_code=201)
def create_quick_run(data: QuickRunCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a quick race - simplified creation for jockeys."""
    # Only jockeys and team owners can create runs (not spectators)
    account_type = str(getattr(current_user.account_type, 'value', current_user.account_type))
    if account_type == "spectator":
        raise HTTPException(status_code=403, detail="Spectators cannot create races")

    run = Run(
        creator_id=current_user.id,
        name=data.name,
        motorsport=data.motorsport,
        location=data.location,
        date_time=data.date_time,
        race_type="quick",
        max_participants=8,
        picks_enabled=True,
    )
    db.add(run)
    db.flush()

    # Auto-join the creator as first participant
    creator_participant = RunParticipant(
        run_id=run.id,
        user_id=current_user.id,
        odds=2.0
    )
    db.add(creator_participant)
    db.commit()
    db.refresh(run)

    return {"run_id": run.id, "name": run.name, "joined": True}


@router.post("/{run_id}/join")
def join_run(run_id: str, body: ParticipantJoin,
             current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.results_posted:
        raise HTTPException(status_code=400, detail="Race has already completed")

    existing = db.query(RunParticipant).filter(
        RunParticipant.run_id == run_id, RunParticipant.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already joined")

    p = RunParticipant(run_id=run_id, user_id=current_user.id, vehicle_id=body.vehicle_id, odds=2.0)
    db.add(p)
    db.commit()
    return {"joined": True}


def update_participant_stats(db: Session, participant: RunParticipant, run: Run):
    """Update a participant's RedlineCard stats after race results are posted."""
    card = db.query(RedlineCard).filter(RedlineCard.user_id == participant.user_id).first()
    if not card:
        return

    # Initialize stats if empty
    stats = card.core_stats or {}
    sport_stats = card.sport_stats or {}
    motorsport = run.motorsport or "Other"

    # Core stats updates
    stats["total_races"] = stats.get("total_races", 0) + 1

    if participant.placement == 1:
        stats["wins"] = stats.get("wins", 0) + 1
    elif participant.placement and participant.placement > 1:
        stats["losses"] = stats.get("losses", 0) + 1

    # Calculate win rate
    total = stats.get("total_races", 1)
    stats["win_rate"] = round(stats.get("wins", 0) / total, 3) if total > 0 else 0

    # Best ET (lower is better)
    if participant.best_et:
        current_best = stats.get("best_et")
        if current_best is None or participant.best_et < current_best:
            stats["best_et"] = participant.best_et

    # Running average for reaction time
    if participant.reaction_time:
        prev_avg = stats.get("avg_reaction_time")
        prev_count = stats.get("total_races", 1) - 1
        if prev_avg is None or prev_count == 0:
            stats["avg_reaction_time"] = round(participant.reaction_time, 3)
        else:
            stats["avg_reaction_time"] = round(
                (prev_avg * prev_count + participant.reaction_time) / (prev_count + 1), 3
            )

    # Per-sport stats
    if motorsport not in sport_stats:
        sport_stats[motorsport] = {
            "races": 0, "wins": 0, "best_et": None, "avg_reaction_time": None
        }

    sport_stats[motorsport]["races"] = sport_stats[motorsport].get("races", 0) + 1

    if participant.placement == 1:
        sport_stats[motorsport]["wins"] = sport_stats[motorsport].get("wins", 0) + 1

    if participant.best_et:
        ms_best = sport_stats[motorsport].get("best_et")
        if ms_best is None or participant.best_et < ms_best:
            sport_stats[motorsport]["best_et"] = participant.best_et

    if participant.reaction_time:
        ms_prev_avg = sport_stats[motorsport].get("avg_reaction_time")
        ms_prev_count = sport_stats[motorsport].get("races", 1) - 1
        if ms_prev_avg is None or ms_prev_count == 0:
            sport_stats[motorsport]["avg_reaction_time"] = round(participant.reaction_time, 3)
        else:
            sport_stats[motorsport]["avg_reaction_time"] = round(
                (ms_prev_avg * ms_prev_count + participant.reaction_time) / (ms_prev_count + 1), 3
            )

    # Update card
    card.core_stats = stats
    card.sport_stats = sport_stats
    flag_modified(card, "core_stats")
    flag_modified(card, "sport_stats")


@router.post("/{run_id}/results")
def post_results(run_id: str, data: PostResultsRequest,
                 current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id, Run.creator_id == current_user.id).first()
    if not run:
        raise HTTPException(status_code=403, detail="Only the host can post results")
    if run.results_posted:
        raise HTTPException(status_code=400, detail="Results already posted")

    # Update participant placements and find winner
    winner_username = None
    for entry in data.results:
        p = db.query(RunParticipant).filter(
            RunParticipant.run_id == run_id, RunParticipant.user_id == entry.user_id
        ).first()
        if p:
            p.placement = entry.placement
            p.best_et = entry.best_et
            p.reaction_time = entry.reaction_time
            p.false_start = entry.false_start
            p.dnf_mechanical = entry.dnf_mechanical
            p.dnf_rider_error = entry.dnf_rider_error
            p.first_off_line = entry.first_off_line

            # Track winner
            if entry.placement == 1 and p.user:
                winner_username = p.user.username

            # Update participant's stats on their RedlineCard
            update_participant_stats(db, p, run)

    # Gather all participants for pick resolution
    all_participants = db.query(RunParticipant).filter(RunParticipant.run_id == run_id).all()
    participant_map = {p.user.username: p for p in all_participants if p.user}

    # Find best reaction time participant
    best_rt_participant = None
    best_rt = 999.0
    for p in all_participants:
        if p.reaction_time and p.reaction_time < best_rt:
            best_rt = p.reaction_time
            best_rt_participant = p

    # Find first off line participant
    first_off = [p for p in all_participants if p.first_off_line]
    first_off_username = first_off[0].user.username if first_off and first_off[0].user else None

    # Find winner's ET for over/under
    winner_et = None
    for p in all_participants:
        if p.placement == 1 and p.best_et:
            winner_et = p.best_et
            break

    # Resolve all picks for this run
    picks = db.query(Pick).filter(Pick.run_id == run_id).all()
    picks_resolved = 0
    total_payouts = 0.0

    for pick in picks:
        pick.locked = True
        pick_won = False

        # Resolve based on pick type
        if pick.pick_type == "winner":
            pick_won = (winner_username and pick.prediction == winner_username)

        elif pick.pick_type == "reaction_time":
            # Bet on who has the best reaction time
            if best_rt_participant and best_rt_participant.user:
                pick_won = (pick.prediction == best_rt_participant.user.username)

        elif pick.pick_type == "first_off_line":
            # Bet on who leaves first
            pick_won = (first_off_username and pick.prediction == first_off_username)

        elif pick.pick_type == "h2h":
            # Head-to-head between two participants
            p1 = participant_map.get(pick.prediction)
            p2 = participant_map.get(pick.secondary_prediction) if pick.secondary_prediction else None
            if p1 and p2 and p1.placement and p2.placement:
                pick_won = (p1.placement < p2.placement)  # Lower placement = better

        elif pick.pick_type == "time_over_under":
            # Bet on winner's ET being over/under threshold
            if winner_et and pick.threshold_value and pick.threshold_direction:
                if pick.threshold_direction == "over":
                    pick_won = (winner_et > pick.threshold_value)
                elif pick.threshold_direction == "under":
                    pick_won = (winner_et < pick.threshold_value)

        # Process result
        if pick_won:
            pick.won = True
            pick.payout = pick.amount * pick.odds

            # Credit winner's wallet
            wallet = db.query(Wallet).filter(Wallet.user_id == pick.user_id).first()
            if wallet:
                create_transaction(
                    db, wallet, pick.payout,
                    f"Won {pick.pick_type} bet on {run.name}",
                    "payout"
                )
                total_payouts += pick.payout
        else:
            pick.won = False
            pick.payout = 0.0

        picks_resolved += 1

    run.results_posted = True
    run.status = "completed"
    run.picks_locked = True
    db.commit()

    return {
        "posted": True,
        "winner": winner_username,
        "picks_resolved": picks_resolved,
        "total_payouts": total_payouts
    }
