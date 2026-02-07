from apps.api.db.session import transaction_scope
from apps.api.repositories.wallet_repository import WalletRepository


class WalletService:
    def get_wallet(self, user_id: str):
        with transaction_scope() as session:
            return WalletRepository(session).get_by_user_id(user_id)

    def apply_transaction(self, user_id: str, amount: float, description: str, transaction_type: str):
        with transaction_scope() as session:
            repo = WalletRepository(session)
            wallet = repo.get_by_user_id(user_id)
            if wallet is None:
                raise ValueError("Wallet not found")
            wallet.balance += amount
            repo.add_transaction(wallet.id, amount, description, transaction_type)
            return wallet
