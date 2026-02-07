#!/usr/bin/env python3
"""Production-minded local Redline MVP engine.

This module focuses on deterministic business logic that can be executed without
external providers, while preserving role checks, posting results, and payout
behavior.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional


class AccountType(Enum):
    SPECTATOR = "Spectator"
    JOCKEY = "Jockey"
    TEAM_OWNER = "Team Owner"


class PickType(Enum):
    WINNER = "Winner"


@dataclass
class Wallet:
    owner_id: str
    balance: float = 0.0
    transactions: List[Dict[str, Any]] = field(default_factory=list)

    def add_transaction(self, amount: float, description: str, transaction_type: str) -> None:
        self.balance += amount
        self.transactions.append(
            {
                "amount": amount,
                "description": description,
                "type": transaction_type,
                "timestamp": datetime.utcnow().isoformat(),
                "balance_after": self.balance,
            }
        )


@dataclass
class Account:
    user_id: str
    username: str
    account_type: AccountType
    wallet: Wallet


@dataclass
class Run:
    run_id: str
    name: str
    creator_id: str
    date_time: str
    entry_fee: float
    participants: List[str]
    picks_enabled: bool = True
    picks_locked: bool = False
    results_posted: bool = False
    results: Dict[str, Any] = field(default_factory=dict)
    current_odds: Dict[str, float] = field(default_factory=dict)


@dataclass
class Pick:
    pick_id: str
    user_id: str
    run_id: str
    pick_type: PickType
    prediction: str
    amount: float
    odds: float
    locked: bool = False
    won: Optional[bool] = None
    payout: float = 0.0


class RedlinePlatform:
    def __init__(self) -> None:
        self.accounts: Dict[str, Account] = {}
        self.accounts_by_name: Dict[str, str] = {}
        self.runs: Dict[str, Run] = {}
        self.picks: Dict[str, Pick] = {}
        self.current_user_id: Optional[str] = None
        self._seed_demo_data()

    def _seed_demo_data(self) -> None:
        spectator = Account("user_spec", "MikeTheSpec", AccountType.SPECTATOR, Wallet("user_spec", 500.0))
        jockey = Account("user_jockey", "Turbo", AccountType.JOCKEY, Wallet("user_jockey", 300.0))
        owner = Account("user_owner", "TeamBoss", AccountType.TEAM_OWNER, Wallet("user_owner", 1000.0))

        for account in (spectator, jockey, owner):
            self.accounts[account.user_id] = account
            self.accounts_by_name[account.username] = account.user_id

        self.runs["run_001"] = Run(
            run_id="run_001",
            name="Christmas Eve Grudge Match",
            creator_id=jockey.user_id,
            date_time=(datetime.now() + timedelta(days=1)).isoformat(),
            entry_fee=50.0,
            participants=[jockey.user_id],
            picks_enabled=True,
            current_odds={jockey.user_id: 2.2},
        )

    def login(self, username: str) -> bool:
        user_id = self.accounts_by_name.get(username)
        if not user_id:
            return False
        self.current_user_id = user_id
        return True

    def get_current_user(self) -> Optional[Account]:
        if not self.current_user_id:
            return None
        return self.accounts[self.current_user_id]

    def join_run(self, account: Account, run_id: str) -> None:
        run = self.runs.get(run_id)
        if run is None:
            raise ValueError("Run not found")
        if account.account_type != AccountType.JOCKEY:
            raise PermissionError("Only jockeys can join runs")
        if account.user_id in run.participants:
            return
        if account.wallet.balance < run.entry_fee:
            raise ValueError("Insufficient funds for entry fee")

        account.wallet.add_transaction(-run.entry_fee, f"Entry fee - {run.name}", "entry_fee")
        run.participants.append(account.user_id)
        run.current_odds[account.user_id] = 2.0

    def place_pick(self, account: Account, run_id: str, prediction: str, amount: float) -> Pick:
        run = self.runs.get(run_id)
        if run is None:
            raise ValueError("Run not found")
        if account.account_type not in (AccountType.SPECTATOR, AccountType.JOCKEY):
            raise PermissionError("Only spectators and jockeys can place picks")
        if not run.picks_enabled or run.picks_locked:
            raise ValueError("Picks are closed")
        if prediction not in run.current_odds:
            raise ValueError("Prediction is not an active participant")
        if amount <= 0:
            raise ValueError("Pick amount must be positive")
        if account.wallet.balance < amount:
            raise ValueError("Insufficient funds")

        pick_id = f"pick_{len(self.picks) + 1:03d}"
        pick = Pick(
            pick_id=pick_id,
            user_id=account.user_id,
            run_id=run_id,
            pick_type=PickType.WINNER,
            prediction=prediction,
            amount=amount,
            odds=run.current_odds[prediction],
        )

        self.picks[pick_id] = pick
        account.wallet.add_transaction(-amount, f"Pick placed - {run.name}", "pick_placed")
        return pick

    def post_results(self, account: Account, run_id: str, winner_id: str, times: Dict[str, str]) -> Dict[str, Any]:
        run = self.runs.get(run_id)
        if run is None:
            raise ValueError("Run not found")
        if run.creator_id != account.user_id:
            raise PermissionError("Only the run creator can post results")
        if run.results_posted:
            raise ValueError("Results already posted")
        if winner_id not in run.participants:
            raise ValueError("Winner must be a participant")

        total_pot = run.entry_fee * len(run.participants)
        platform_cut = total_pot * 0.10
        winner_payout = total_pot - platform_cut

        run.results = {
            "winner": winner_id,
            "times": times,
            "payout": winner_payout,
            "platform_cut": platform_cut,
        }
        run.results_posted = True
        run.picks_locked = True

        winner = self.accounts[winner_id]
        winner.wallet.add_transaction(winner_payout, f"Win - {run.name}", "race_win")

        run_picks = [pick for pick in self.picks.values() if pick.run_id == run_id]
        for pick in run_picks:
            pick.locked = True
            if pick.prediction == winner_id:
                pick.won = True
                pick.payout = pick.amount * pick.odds
                picker = self.accounts[pick.user_id]
                picker.wallet.add_transaction(pick.payout, f"Pick win - {run.name}", "pick_win")
            else:
                pick.won = False

        return run.results


__all__ = [
    "Account",
    "AccountType",
    "Pick",
    "PickType",
    "RedlinePlatform",
    "Run",
    "Wallet",
]
