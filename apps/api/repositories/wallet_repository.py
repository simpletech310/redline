from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.api.models import TransactionORM, WalletORM


class WalletRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_user_id(self, user_id: str) -> WalletORM | None:
        return self.session.scalar(select(WalletORM).where(WalletORM.user_id == user_id))

    def create(self, user_id: str, initial_balance: float = 0.0) -> WalletORM:
        wallet = WalletORM(user_id=user_id, balance=initial_balance)
        self.session.add(wallet)
        self.session.flush()
        return wallet

    def add_transaction(self, wallet_id: str, amount: float, description: str, transaction_type: str) -> TransactionORM:
        tx = TransactionORM(wallet_id=wallet_id, amount=amount, description=description, transaction_type=transaction_type)
        self.session.add(tx)
        return tx
