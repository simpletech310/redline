from apps.api.db.session import transaction_scope
from apps.api.domain.rules import settle_pot
from apps.api.domain.state_machine import transition_on_results_posted
from apps.api.repositories.picks_repository import PicksRepository
from apps.api.repositories.results_repository import ResultsRepository
from apps.api.repositories.runs_repository import RunsRepository
from apps.api.repositories.wallet_repository import WalletRepository


class ResultsService:
    def post_results(self, actor_id: str, run_id: str, winner_id: str, times: dict[str, str]):
        with transaction_scope() as session:
            runs_repo = RunsRepository(session)
            picks_repo = PicksRepository(session)
            results_repo = ResultsRepository(session)
            wallet_repo = WalletRepository(session)

            run = runs_repo.get_by_id(run_id)
            if run is None:
                raise ValueError("Run not found")
            if run.creator_id != actor_id:
                raise ValueError("Only creator can post results")
            if run.results_posted:
                raise ValueError("Results already posted")

            participants = runs_repo.participants(run_id)
            settlement = settle_pot(run.entry_fee, len(participants))
            run.results_posted = True
            run.picks_locked = True
            run_state = transition_on_results_posted()

            winner_wallet = wallet_repo.get_by_user_id(winner_id)
            if winner_wallet:
                winner_wallet.balance += settlement.winner_payout
                wallet_repo.add_transaction(
                    winner_wallet.id,
                    settlement.winner_payout,
                    f"Win - {run.name}",
                    "race_win",
                )

            picks = picks_repo.list_by_run(run_id)
            for pick in picks:
                pick.locked = True
                if pick.prediction == winner_id:
                    pick.won = True
                    pick.payout = pick.amount * pick.odds
                    picker_wallet = wallet_repo.get_by_user_id(pick.user_id)
                    if picker_wallet:
                        picker_wallet.balance += pick.payout
                        wallet_repo.add_transaction(
                            picker_wallet.id,
                            pick.payout,
                            f"Pick win - {run.name}",
                            "pick_win",
                        )
                else:
                    pick.won = False

            snapshot = results_repo.create_snapshot(run_id=run_id, winner_id=winner_id, times=times, payout=settlement.winner_payout)
            return {"snapshot_id": snapshot.id, "run_state": run_state.value}
