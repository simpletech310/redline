from apps.api.db.session import transaction_scope
from apps.api.models import AccountType
from apps.api.repositories.accounts_repository import AccountsRepository
from apps.api.repositories.wallet_repository import WalletRepository


class AccountsService:
    def create_account(self, username: str, email: str, account_type: AccountType, initial_balance: float = 0.0):
        with transaction_scope() as session:
            accounts_repo = AccountsRepository(session)
            wallet_repo = WalletRepository(session)
            user = accounts_repo.create(username=username, email=email, account_type=account_type)
            wallet_repo.create(user.id, initial_balance)
            return user

    def login(self, username: str):
        with transaction_scope() as session:
            return AccountsRepository(session).get_by_username(username)
