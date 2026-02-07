from apps.api.db.session import transaction_scope
from apps.api.domain.rules import can_create_run, can_join_run
from apps.api.models import AccountType
from apps.api.repositories.accounts_repository import AccountsRepository
from apps.api.repositories.runs_repository import RunsRepository
from apps.api.repositories.wallet_repository import WalletRepository


class RunsService:
    def create_run(self, creator_id: str, payload: dict):
        with transaction_scope() as session:
            accounts_repo = AccountsRepository(session)
            runs_repo = RunsRepository(session)

            creator = accounts_repo.get_by_id(creator_id)
            if creator is None:
                raise ValueError("Creator not found")
            if not can_create_run(creator.account_type, payload["run_type"]):
                raise ValueError("User cannot create this run type")

            run = runs_repo.create(
                name=payload["name"],
                run_type=payload["run_type"],
                creator_id=creator_id,
                date_time=runs_repo.parse_datetime(payload["date_time"]),
                location=payload["location"],
                description=payload["description"],
                machine_class=payload["machine_class"],
                entry_fee=payload.get("entry_fee", 0.0),
                picks_enabled=payload.get("picks_enabled", True),
                current_odds={creator_id: 2.0},
            )
            runs_repo.add_participant(run.id, creator_id)
            return run

    def join_run(self, user_id: str, run_id: str):
        with transaction_scope() as session:
            accounts_repo = AccountsRepository(session)
            runs_repo = RunsRepository(session)
            wallet_repo = WalletRepository(session)

            user = accounts_repo.get_by_id(user_id)
            run = runs_repo.get_by_id(run_id)
            if user is None or run is None:
                raise ValueError("User or run not found")
            wallet = wallet_repo.get_by_user_id(user_id)
            if wallet is None:
                raise ValueError("Wallet not found")

            allowed, reason = can_join_run(
                account_type=user.account_type,
                already_joined=runs_repo.participant_exists(run_id, user_id),
                wallet_balance=wallet.balance,
                entry_fee=run.entry_fee,
            )
            if not allowed:
                raise ValueError(reason)

            if run.entry_fee > 0:
                wallet.balance -= run.entry_fee
                wallet_repo.add_transaction(wallet.id, -run.entry_fee, f"Entry fee - {run.name}", "entry_fee")

            runs_repo.add_participant(run_id, user_id)
            run.current_odds = {**run.current_odds, user_id: 2.2}
            return run

    def list_runs(self):
        with transaction_scope() as session:
            return RunsRepository(session).list_open()
