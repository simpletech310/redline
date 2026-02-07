from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class AccountType(Enum):
    SPECTATOR = "Spectator"
    JOCKEY = "Jockey"
    TEAM_OWNER = "Team Owner"


class RunType(Enum):
    RACE = "Race"
    TOURNAMENT = "Tournament"


class PickType(Enum):
    WINNER = "Winner"


@dataclass
class Account:
    user_id: str
    username: str
    account_type: AccountType
    wallet_balance: float = 0.0


@dataclass
class Run:
    run_id: str
    name: str
    creator_id: str
    run_type: RunType
    entry_fee: float = 0.0
    participants: List[str] = field(default_factory=list)
    picks_enabled: bool = True
    picks_locked: bool = False
    results_posted: bool = False
    current_odds: Dict[str, float] = field(default_factory=dict)
    results: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Pick:
    pick_id: str
    user_id: str
    run_id: str
    prediction_user_id: str
    amount: float
    odds: float
    pick_type: PickType = PickType.WINNER
    locked: bool = False
    won: Optional[bool] = None
    payout: float = 0.0


class RedlinePlatform:
    def __init__(self) -> None:
        self.accounts: Dict[str, Account] = {}
        self.runs: Dict[str, Run] = {}
        self.picks: Dict[str, Pick] = {}

    def add_account(self, account: Account) -> None:
        self.accounts[account.user_id] = account

    def create_run(
        self,
        creator_id: str,
        run_id: str,
        name: str,
        run_type: RunType = RunType.RACE,
        entry_fee: float = 0.0,
        picks_enabled: bool = True,
    ) -> Run:
        if creator_id not in self.accounts:
            raise ValueError("Creator account not found")

        run = Run(
            run_id=run_id,
            name=name,
            creator_id=creator_id,
            run_type=run_type,
            entry_fee=entry_fee,
            participants=[creator_id],
            picks_enabled=picks_enabled,
            current_odds={creator_id: 2.0},
        )
        self.runs[run_id] = run
        return run

    def join_run(self, user_id: str, run_id: str) -> Run:
        if user_id not in self.accounts:
            raise ValueError("Account not found")
        run = self.runs.get(run_id)
        if run is None:
            raise ValueError("Run not found")

        account = self.accounts[user_id]
        if account.account_type != AccountType.JOCKEY:
            raise ValueError("Only jockeys can join runs")

        if user_id not in run.participants:
            if account.wallet_balance < run.entry_fee:
                raise ValueError("Insufficient funds for entry fee")
            account.wallet_balance -= run.entry_fee
            run.participants.append(user_id)
            run.current_odds[user_id] = 2.0

        return run

    def place_pick(
        self,
        user_id: str,
        run_id: str,
        prediction_user_id: str,
        amount: float,
    ) -> Pick:
        account = self.accounts.get(user_id)
        if account is None:
            raise ValueError("Account not found")
        run = self.runs.get(run_id)
        if run is None:
            raise ValueError("Run not found")
        if not run.picks_enabled or run.picks_locked:
            raise ValueError("Picks are not available for this run")
        if prediction_user_id not in run.participants:
            raise ValueError("Prediction target must be a run participant")
        if amount <= 0:
            raise ValueError("Amount must be positive")
        if amount > account.wallet_balance:
            raise ValueError("Insufficient wallet balance")

        account.wallet_balance -= amount
        pick_id = f"pick_{len(self.picks) + 1:03d}"
        odds = run.current_odds.get(prediction_user_id, 2.0)
        pick = Pick(
            pick_id=pick_id,
            user_id=user_id,
            run_id=run_id,
            prediction_user_id=prediction_user_id,
            amount=amount,
            odds=odds,
        )
        self.picks[pick_id] = pick
        return pick

    def post_results(
        self,
        posted_by: str,
        run_id: str,
        winner_user_id: str,
        times: Optional[Dict[str, str]] = None,
    ) -> Run:
        run = self.runs.get(run_id)
        if run is None:
            raise ValueError("Run not found")
        if run.creator_id != posted_by:
            raise ValueError("Only the creator can post results")
        if winner_user_id not in run.participants:
            raise ValueError("Winner must be a participant")

        total_pot = run.entry_fee * len(run.participants)
        winner_payout = total_pot * 0.9

        winner = self.accounts[winner_user_id]
        winner.wallet_balance += winner_payout

        run.results = {
            "winner": winner_user_id,
            "times": times or {},
            "payout": winner_payout,
            "posted_at": datetime.now().isoformat(),
        }
        run.results_posted = True
        run.picks_locked = True

        for pick in self.picks.values():
            if pick.run_id != run_id:
                continue
            pick.locked = True
            if pick.prediction_user_id == winner_user_id:
                pick.won = True
                pick.payout = pick.amount * pick.odds
                self.accounts[pick.user_id].wallet_balance += pick.payout
            else:
                pick.won = False

        return run

    def get_my_runs_and_earnings(self, user_id: str) -> Dict[str, Any]:
        if user_id not in self.accounts:
            raise ValueError("Account not found")

        joined_runs = [run for run in self.runs.values() if user_id in run.participants]

        pick_earnings = 0.0
        for pick in self.picks.values():
            if pick.user_id == user_id and pick.won:
                pick_earnings += pick.payout

        race_winnings = 0.0
        for run in joined_runs:
            if run.results.get("winner") == user_id:
                race_winnings += float(run.results.get("payout", 0.0))

        return {
            "user_id": user_id,
            "run_count": len(joined_runs),
            "runs": joined_runs,
            "pick_earnings": pick_earnings,
            "race_winnings": race_winnings,
            "total_earnings": pick_earnings + race_winnings,
            "wallet_balance": self.accounts[user_id].wallet_balance,
        }
