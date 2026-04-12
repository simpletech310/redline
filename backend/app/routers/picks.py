from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.models import Pick, Run, User, Wallet, Transaction
from app.routers.auth import get_current_user
from app.routers.wallet import create_transaction
from pydantic import BaseModel

router = APIRouter()


class PlacePickRequest(BaseModel):
    run_id: str
    prediction: str
    amount: float
    odds: Optional[float] = 2.0
    pick_type: str = "winner"


@router.get("/available")
def get_available_picks(db: Session = Depends(get_db)):
    picks = db.query(Pick).filter(Pick.locked == False).all()
    return [
        {
            "id": p.id, "pick_type": p.pick_type, "prediction": p.prediction,
            "odds": p.odds, "locked": p.locked, "won": p.won,
            "event_name": p.run.name if p.run else None,
            "run_format": p.run.race_format if p.run else None,
            "run_date": p.run.date_time.isoformat() if p.run and p.run.date_time else None,
        }
        for p in picks
    ]


@router.get("/my")
def get_my_picks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    picks = db.query(Pick).filter(Pick.user_id == current_user.id).all()
    return [
        {
            "id": p.id, "pick_type": p.pick_type, "prediction": p.prediction,
            "amount": p.amount, "odds": p.odds, "locked": p.locked,
            "won": p.won, "payout": p.payout,
            "event_name": p.run.name if p.run else None,
            "run_format": p.run.race_format if p.run else None,
        }
        for p in picks
    ]


@router.post("")
def place_pick(data: PlacePickRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == data.run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.picks_locked:
        raise HTTPException(status_code=400, detail="Picks are locked for this race")
    if not run.picks_enabled:
        raise HTTPException(status_code=400, detail="Picks are not enabled for this race")

    # Validate bet amount
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Bet amount must be positive")

    # Check wallet balance
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=400, detail="Wallet not found. Please add funds first.")
    if wallet.balance < data.amount:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. You have ${wallet.balance:.2f}")

    # Deduct from wallet and create transaction
    create_transaction(
        db, wallet, -data.amount,
        f"Bet on {run.name}: {data.prediction}",
        "bet"
    )

    # Create pick
    pick = Pick(
        user_id=current_user.id, run_id=data.run_id,
        prediction=data.prediction, amount=data.amount,
        odds=data.odds, pick_type=data.pick_type,
    )
    db.add(pick)
    db.commit()
    db.refresh(pick)

    return {
        "id": pick.id,
        "prediction": pick.prediction,
        "odds": pick.odds,
        "amount": pick.amount,
        "balance": wallet.balance
    }
