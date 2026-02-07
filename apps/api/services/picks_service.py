from apps.api.db.session import transaction_scope
from apps.api.domain.rules import can_make_pick
from apps.api.models import PickType
from apps.api.repositories.picks_repository import PicksRepository
from apps.api.repositories.runs_repository import RunsRepository
from apps.api.repositories.wallet_repository import WalletRepository


class PicksService:
    def make_pick(self, user_id: str, run_id: str, prediction: str, amount: float):
        with transaction_scope() as session:
            runs_repo = RunsRepository(session)
            picks_repo = PicksRepository(session)
            wallet_repo = WalletRepository(session)

            run = runs_repo.get_by_id(run_id)
            wallet = wallet_repo.get_by_user_id(user_id)
            if run is None or wallet is None:
                raise ValueError("Run or wallet not found")

            allowed, reason = can_make_pick(run.picks_enabled, run.picks_locked, wallet.balance, amount)
            if not allowed:
                raise ValueError(reason)

            odds = run.current_odds.get(prediction, 2.0)
            pick = picks_repo.create(
                user_id=user_id,
                run_id=run_id,
                pick_type=PickType.WINNER,
                prediction=prediction,
                amount=amount,
                odds=odds,
                locked=False,
            )
            wallet.balance -= amount
            wallet_repo.add_transaction(wallet.id, -amount, f"Pick - {run.name}", "pick_placed")
            return pick
