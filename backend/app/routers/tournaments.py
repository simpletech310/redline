from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
import uuid
import random
from app.db.session import get_db
from app.models import Tournament, User
from app.routers.auth import get_current_user

router = APIRouter()


class TournamentCreate(BaseModel):
    name: str
    location: str
    date_time: datetime
    motorsport: Optional[str] = None
    entry_fee_cents: int = 0
    prize_pool_cents: int = 0
    max_participants: int = 8


@router.get("")
def get_tournaments(db: Session = Depends(get_db)):
    ts = db.query(Tournament).order_by(Tournament.date_time).all()
    return [
        {
            "id": t.id, "name": t.name, "motorsport": t.motorsport,
            "location": t.location, "date_time": t.date_time.isoformat(),
            "entry_fee_cents": t.entry_fee_cents, "prize_pool_cents": t.prize_pool_cents,
            "max_participants": t.max_participants, "status": t.status,
        }
        for t in ts
    ]


@router.get("/{tournament_id}")
def get_tournament(tournament_id: str, db: Session = Depends(get_db)):
    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {
        "id": t.id, "name": t.name, "motorsport": t.motorsport,
        "location": t.location, "date_time": t.date_time.isoformat(),
        "entry_fee_cents": t.entry_fee_cents, "prize_pool_cents": t.prize_pool_cents,
        "max_participants": t.max_participants, "current_round": t.current_round,
        "status": t.status, "bracket": t.bracket or {},
        "creator_id": t.creator_id,
    }


@router.post("", status_code=201)
def create_tournament(data: TournamentCreate,
                      current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    if str(getattr(current_user.account_type, 'value', current_user.account_type)) != "team_owner":
        raise HTTPException(status_code=403, detail="Only team owners can create tournaments")
    t = Tournament(
        creator_id=current_user.id, name=data.name, location=data.location,
        date_time=data.date_time, motorsport=data.motorsport,
        entry_fee_cents=data.entry_fee_cents, prize_pool_cents=data.prize_pool_cents,
        max_participants=data.max_participants,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"id": t.id, "name": t.name}


@router.post("/{tournament_id}/join")
def join_tournament(tournament_id: str,
                    current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Join a tournament during registration phase."""
    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if t.status != "registration":
        raise HTTPException(status_code=400, detail="Registration is closed")

    # Check if spectator
    account_type = str(getattr(current_user.account_type, 'value', current_user.account_type))
    if account_type == "spectator":
        raise HTTPException(status_code=403, detail="Spectators cannot join tournaments")

    # Initialize bracket if needed
    bracket = t.bracket or {"participants": [], "rounds": []}
    participants = bracket.get("participants", [])

    # Check if already joined
    if current_user.username in participants:
        raise HTTPException(status_code=400, detail="Already registered")

    # Check capacity
    if len(participants) >= t.max_participants:
        raise HTTPException(status_code=400, detail="Tournament is full")

    # Add to participants
    participants.append(current_user.username)
    bracket["participants"] = participants
    t.bracket = bracket
    flag_modified(t, "bracket")
    db.commit()

    return {"joined": True, "participant_count": len(participants)}


@router.get("/{tournament_id}/participants")
def get_participants(tournament_id: str, db: Session = Depends(get_db)):
    """Get list of tournament participants."""
    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")

    bracket = t.bracket or {}
    return {"participants": bracket.get("participants", [])}


@router.post("/{tournament_id}/start")
def start_tournament(tournament_id: str,
                     current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """Close registration and generate initial bracket (team_owner only)."""
    t = db.query(Tournament).filter(
        Tournament.id == tournament_id,
        Tournament.creator_id == current_user.id
    ).first()
    if not t:
        raise HTTPException(status_code=403, detail="Not authorized")
    if t.status != "registration":
        raise HTTPException(status_code=400, detail="Tournament already started or completed")

    bracket = t.bracket or {}
    participants = bracket.get("participants", [])

    if len(participants) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 participants")

    # Shuffle for random seeding
    random.shuffle(participants)

    # Generate bracket rounds
    rounds = []

    # Round 1: Pair up participants
    round1 = []
    for i in range(0, len(participants), 2):
        match = {
            "id": str(uuid.uuid4()),
            "round": 1,
            "position": i // 2,
            "player1": participants[i],
            "player2": participants[i + 1] if i + 1 < len(participants) else None,
            "winner": None
        }
        # Auto-advance if only one player (bye)
        if match["player2"] is None:
            match["winner"] = match["player1"]
        round1.append(match)
    rounds.append(round1)

    # Calculate how many rounds we need
    num_rounds = 1
    remaining = len(round1)
    while remaining > 1:
        remaining = (remaining + 1) // 2
        num_rounds += 1

    # Create placeholder rounds
    for r in range(2, num_rounds + 1):
        prev_round = rounds[-1]
        next_round = []
        for i in range(0, len(prev_round), 2):
            match = {
                "id": str(uuid.uuid4()),
                "round": r,
                "position": i // 2,
                "player1": None,
                "player2": None,
                "winner": None
            }
            next_round.append(match)
        if next_round:
            rounds.append(next_round)

    bracket["rounds"] = rounds
    bracket["participants"] = participants
    t.bracket = bracket
    t.status = "in_progress"
    t.current_round = 1
    flag_modified(t, "bracket")
    db.commit()

    return {"status": "in_progress", "bracket": bracket}


class MatchResultRequest(BaseModel):
    winner: str


@router.post("/{tournament_id}/matches/{match_id}/result")
def post_match_result(tournament_id: str, match_id: str,
                      data: MatchResultRequest,
                      current_user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """Post result for a match and advance winner (team_owner only)."""
    t = db.query(Tournament).filter(
        Tournament.id == tournament_id,
        Tournament.creator_id == current_user.id
    ).first()
    if not t:
        raise HTTPException(status_code=403, detail="Not authorized")
    if t.status != "in_progress":
        raise HTTPException(status_code=400, detail="Tournament is not in progress")

    bracket = t.bracket or {}
    rounds = bracket.get("rounds", [])

    # Find the match
    match_found = None
    match_round_idx = None
    match_position = None

    for round_idx, round_matches in enumerate(rounds):
        for match in round_matches:
            if match["id"] == match_id:
                match_found = match
                match_round_idx = round_idx
                match_position = match["position"]
                break
        if match_found:
            break

    if not match_found:
        raise HTTPException(status_code=404, detail="Match not found")

    # Validate winner
    if data.winner not in [match_found["player1"], match_found["player2"]]:
        raise HTTPException(status_code=400, detail="Invalid winner")

    if match_found["winner"]:
        raise HTTPException(status_code=400, detail="Match result already posted")

    # Set winner
    match_found["winner"] = data.winner

    # Advance winner to next round if there is one
    if match_round_idx + 1 < len(rounds):
        next_round = rounds[match_round_idx + 1]
        next_match_position = match_position // 2
        if next_match_position < len(next_round):
            next_match = next_round[next_match_position]
            # Determine slot (player1 or player2)
            if match_position % 2 == 0:
                next_match["player1"] = data.winner
            else:
                next_match["player2"] = data.winner

    # Check if tournament is complete (final match decided)
    final_match = rounds[-1][0] if rounds else None
    if final_match and final_match.get("winner"):
        t.status = "completed"

    t.bracket = bracket
    flag_modified(t, "bracket")
    db.commit()

    return {
        "match_id": match_id,
        "winner": data.winner,
        "tournament_status": t.status
    }
