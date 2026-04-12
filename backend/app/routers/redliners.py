from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import User, RedlineCard, RunParticipant, Run
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


@router.get("")
def search_redliners(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(User)
    if q:
        query = query.filter(User.username.ilike(f"%{q}%"))
    users = query.limit(30).all()
    return {
        "racers": [
            {
                "id": u.id, "username": u.username, "account_type": str(u.account_type.value if hasattr(u.account_type, 'value') else u.account_type),
                "region": u.region,
                "card": {
                    "trust_score": u.card.trust_score if u.card else 0,
                    "stats": u.card.core_stats if u.card else {},
                } if u.card else None,
            }
            for u in users
        ]
    }


@router.get("/{user_id}")
def get_redliner(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id, "username": user.username,
        "account_type": str(user.account_type.value if hasattr(user.account_type, 'value') else user.account_type),
        "region": user.region,
        "card": {
            "name": user.card.name if user.card else user.username,
            "bio": user.card.bio if user.card else "",
            "trust_score": user.card.trust_score if user.card else 0,
            "stats": user.card.core_stats if user.card else {},
        },
        "machines": [
            {"id": m.id, "name": m.name, "vehicle_type": m.vehicle_type, "build_level": m.build_level,
             "inferred_stats": m.inferred_stats or {}}
            for m in user.machines if m.is_public
        ],
    }


@router.get("/{user_id}/stats")
def get_redliner_stats(user_id: str, db: Session = Depends(get_db)):
    """Get detailed stats breakdown for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    card = user.card
    core_stats = card.core_stats if card else {}
    sport_stats = card.sport_stats if card else {}

    return {
        "user_id": user.id,
        "username": user.username,
        "core_stats": {
            "total_races": core_stats.get("total_races", 0),
            "wins": core_stats.get("wins", 0),
            "losses": core_stats.get("losses", 0),
            "win_rate": core_stats.get("win_rate", 0),
            "best_et": core_stats.get("best_et"),
            "avg_reaction_time": core_stats.get("avg_reaction_time"),
        },
        "sport_stats": sport_stats,
        "trust_score": card.trust_score if card else 0,
    }


@router.get("/{user_id}/race-history")
def get_redliner_history(user_id: str, page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    """Get paginated race history for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    offset = (page - 1) * limit

    # Get participations with completed runs
    participations = (
        db.query(RunParticipant)
        .join(Run)
        .filter(
            RunParticipant.user_id == user_id,
            Run.results_posted == True
        )
        .order_by(Run.date_time.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Get total count
    total = (
        db.query(RunParticipant)
        .join(Run)
        .filter(
            RunParticipant.user_id == user_id,
            Run.results_posted == True
        )
        .count()
    )

    return {
        "races": [
            {
                "run_id": p.run.id,
                "run_name": p.run.name,
                "motorsport": p.run.motorsport,
                "location": p.run.location,
                "date_time": p.run.date_time.isoformat() if p.run.date_time else None,
                "placement": p.placement,
                "best_et": p.best_et,
                "reaction_time": p.reaction_time,
                "won": p.placement == 1,
                "vehicle": {
                    "id": p.vehicle.id,
                    "name": p.vehicle.name,
                    "vehicle_type": p.vehicle.vehicle_type,
                } if p.vehicle else None,
            }
            for p in participations
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit,
        }
    }
