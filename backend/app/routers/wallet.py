from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.models import Wallet, Transaction, User
from app.routers.auth import get_current_user

router = APIRouter()


class DepositRequest(BaseModel):
    amount: float


def create_transaction(db: Session, wallet: Wallet, amount: float,
                       description: str, txn_type: str) -> Transaction:
    """Helper to create a transaction and update wallet balance.
    Use positive amount for credits, negative for debits."""
    wallet.balance += amount
    txn = Transaction(
        wallet_id=wallet.id,
        amount=amount,
        description=description,
        transaction_type=txn_type,
        balance_after=wallet.balance
    )
    db.add(txn)
    return txn


@router.get("")
def get_wallet(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        return {"balance": 0.0}
    return {"id": wallet.id, "balance": wallet.balance}


@router.get("/history")
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        return []
    txns = db.query(Transaction).filter(Transaction.wallet_id == wallet.id).order_by(Transaction.created_at.desc()).limit(50).all()
    return [
        {
            "id": t.id, "amount": t.amount, "description": t.description,
            "transaction_type": t.transaction_type, "balance_after": t.balance_after,
            "created_at": t.created_at.isoformat(),
        }
        for t in txns
    ]


@router.post("/deposit")
def deposit(data: DepositRequest,
            current_user: User = Depends(get_current_user),
            db: Session = Depends(get_db)):
    """Add funds to wallet (simulated for MVP)."""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if data.amount > 10000:
        raise HTTPException(status_code=400, detail="Maximum deposit is $10,000")

    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        # Create wallet if it doesn't exist
        wallet = Wallet(user_id=current_user.id, balance=0.0)
        db.add(wallet)
        db.flush()

    txn = create_transaction(
        db, wallet, data.amount,
        f"Deposit ${data.amount:.2f}",
        "deposit"
    )
    db.commit()

    return {"balance": wallet.balance, "transaction_id": txn.id}
