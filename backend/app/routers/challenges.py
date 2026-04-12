from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models import Challenge, User, Run, RunParticipant, AccountType
from app.routers.auth import get_current_user

router = APIRouter()


class ChallengeCreate(BaseModel):
    challenged_id: str
    motorsport: Optional[str] = None
    vehicle_class: Optional[str] = None
    location: str
    proposed_time: datetime
    stakes: float = 0.0
    message: Optional[str] = None


class ChallengeAccept(BaseModel):
    vehicle_id: Optional[str] = None
    counter_message: Optional[str] = None


def _serialize_challenge(c: Challenge) -> dict:
    return {
        "id": c.id,
        "challenger": {
            "id": c.challenger.id,
            "username": c.challenger.username,
        } if c.challenger else None,
        "challenged": {
            "id": c.challenged.id,
            "username": c.challenged.username,
        } if c.challenged else None,
        "motorsport": c.motorsport,
        "vehicle_class": c.vehicle_class,
        "location": c.location,
        "proposed_time": c.proposed_time.isoformat() if c.proposed_time else None,
        "stakes": c.stakes,
        "message": c.message,
        "status": c.status,
        "run_id": c.run_id,
        "expires_at": c.expires_at.isoformat() if c.expires_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@router.get("")
def get_challenges(db: Session = Depends(get_db)):
    """Get public callout board - all pending challenges."""
    challenges = db.query(Challenge).filter(
        Challenge.status == "pending",
        Challenge.expires_at > datetime.utcnow()
    ).order_by(Challenge.created_at.desc()).limit(50).all()
    return {"challenges": [_serialize_challenge(c) for c in challenges]}


@router.get("/my")
def get_my_challenges(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get challenges I've sent or received."""
    sent = db.query(Challenge).filter(Challenge.challenger_id == current_user.id).order_by(Challenge.created_at.desc()).all()
    received = db.query(Challenge).filter(Challenge.challenged_id == current_user.id).order_by(Challenge.created_at.desc()).all()
    return {
        "sent": [_serialize_challenge(c) for c in sent],
        "received": [_serialize_challenge(c) for c in received],
    }


@router.get("/{challenge_id}")
def get_challenge(challenge_id: str, db: Session = Depends(get_db)):
    """Get challenge details."""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return _serialize_challenge(challenge)


@router.post("", status_code=201)
def create_challenge(data: ChallengeCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Issue a challenge to another jockey."""
    # Only jockeys and team owners can issue challenges
    account_type = str(getattr(current_user.account_type, 'value', current_user.account_type))
    if account_type == "spectator":
        raise HTTPException(status_code=403, detail="Spectators cannot issue challenges")

    # Check challenged user exists and is a jockey
    challenged = db.query(User).filter(User.id == data.challenged_id).first()
    if not challenged:
        raise HTTPException(status_code=404, detail="User not found")

    challenged_type = str(getattr(challenged.account_type, 'value', challenged.account_type))
    if challenged_type == "spectator":
        raise HTTPException(status_code=400, detail="Cannot challenge a spectator")

    if data.challenged_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot challenge yourself")

    # Check for existing pending challenge between these users
    existing = db.query(Challenge).filter(
        Challenge.challenger_id == current_user.id,
        Challenge.challenged_id == data.challenged_id,
        Challenge.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending challenge with this user")

    # Create challenge with 48-hour expiration
    challenge = Challenge(
        challenger_id=current_user.id,
        challenged_id=data.challenged_id,
        motorsport=data.motorsport,
        vehicle_class=data.vehicle_class,
        location=data.location,
        proposed_time=data.proposed_time,
        stakes=data.stakes,
        message=data.message,
        expires_at=datetime.utcnow() + timedelta(hours=48),
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    return _serialize_challenge(challenge)


@router.post("/{challenge_id}/accept")
def accept_challenge(challenge_id: str, data: ChallengeAccept, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Accept a challenge - creates a 1v1 race."""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if challenge.challenged_id != current_user.id:
        raise HTTPException(status_code=403, detail="This challenge is not for you")

    if challenge.status != "pending":
        raise HTTPException(status_code=400, detail=f"Challenge is already {challenge.status}")

    if challenge.expires_at < datetime.utcnow():
        challenge.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Challenge has expired")

    # Create a 1v1 race from this challenge
    run = Run(
        name=f"Challenge: {challenge.challenger.username} vs {challenge.challenged.username}",
        creator_id=challenge.challenger_id,
        motorsport=challenge.motorsport,
        race_type="challenge",
        location=challenge.location,
        date_time=challenge.proposed_time,
        entry_fee=challenge.stakes,
        max_participants=2,
        picks_enabled=True,
        description=f"Challenge match. Stakes: ${challenge.stakes}",
    )
    db.add(run)
    db.flush()  # Get the run ID

    # Add both participants
    challenger_participant = RunParticipant(
        run_id=run.id,
        user_id=challenge.challenger_id,
        odds=2.0
    )
    challenged_participant = RunParticipant(
        run_id=run.id,
        user_id=current_user.id,
        vehicle_id=data.vehicle_id,
        odds=2.0
    )
    db.add(challenger_participant)
    db.add(challenged_participant)

    # Update challenge status
    challenge.status = "accepted"
    challenge.run_id = run.id
    challenge.responded_at = datetime.utcnow()

    db.commit()

    return {
        "accepted": True,
        "run_id": run.id,
        "challenge": _serialize_challenge(challenge)
    }


@router.post("/{challenge_id}/decline")
def decline_challenge(challenge_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Decline a challenge."""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if challenge.challenged_id != current_user.id:
        raise HTTPException(status_code=403, detail="This challenge is not for you")

    if challenge.status != "pending":
        raise HTTPException(status_code=400, detail=f"Challenge is already {challenge.status}")

    challenge.status = "declined"
    challenge.responded_at = datetime.utcnow()
    db.commit()

    return {"declined": True}


@router.delete("/{challenge_id}")
def cancel_challenge(challenge_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Cancel a pending challenge you issued."""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if challenge.challenger_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only cancel challenges you issued")

    if challenge.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot cancel - challenge is {challenge.status}")

    db.delete(challenge)
    db.commit()

    return {"cancelled": True}
