#!/usr/bin/env python3
"""REDLINE complete local MVP.

This module provides a production-style core engine that can run locally without
Stripe/Supabase/Vercel/Render keys while preserving the business loop:
Race -> Result -> Stats -> Picks -> Money -> Trust -> Visibility.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional


class AccountType(str, Enum):
    SPECTATOR = "Spectator"
    JOCKEY = "Jockey"
    TEAM_OWNER = "Team Owner"


class RunType(str, Enum):
    RACE = "Race"
    TOURNAMENT = "Tournament"


class AccessType(str, Enum):
    NONE = "No Access"
    GENERAL = "General Access"
    VIP = "VIP Access"
    PIT = "Pit Access"
    RACER_ONLY = "Racer-Only"


class MachineClass(str, Enum):
    STREET = "Street"
    SPORT = "Sport"
    PRO = "Pro"
    UNLIMITED = "Unlimited"


@dataclass
class WalletTxn:
    amount: float
    txn_type: str
    description: str
    created_at: str
    balance_after: float


@dataclass
class Wallet:
    owner_id: str
    balance: float = 0.0
    transactions: List[WalletTxn] = field(default_factory=list)

    def apply(self, amount: float, txn_type: str, description: str) -> None:
        self.balance += amount
        self.transactions.append(
            WalletTxn(
                amount=round(amount, 2),
                txn_type=txn_type,
                description=description,
                created_at=datetime.utcnow().isoformat(),
                balance_after=round(self.balance, 2),
            )
        )


@dataclass
class RedlineCard:
    name: str
    bio: str
    classes: List[MachineClass]
    total_runs: int = 0
    wins: int = 0
    losses: int = 0
    podiums: int = 0
    best_time_s: Optional[float] = None
    avg_time_s: Optional[float] = None
    trust_score: float = 90.0
    verified: bool = False
    history: List[Dict[str, Any]] = field(default_factory=list)

    @property
    def win_rate(self) -> float:
        if self.total_runs == 0:
            return 0.0
        return round((self.wins / self.total_runs) * 100, 1)

    def add_result(self, run_name: str, place: int, time_s: float) -> None:
        self.total_runs += 1
        if place == 1:
            self.wins += 1
        else:
            self.losses += 1
        if place <= 3:
            self.podiums += 1

        if self.best_time_s is None or time_s < self.best_time_s:
            self.best_time_s = time_s

        prior_total = self.avg_time_s * (self.total_runs - 1) if self.avg_time_s else 0.0
        self.avg_time_s = round((prior_total + time_s) / self.total_runs, 3)

        self.history.insert(
            0,
            {
                "date": datetime.utcnow().date().isoformat(),
                "run": run_name,
                "place": place,
                "time_s": time_s,
            },
        )


@dataclass
class Account:
    user_id: str
    username: str
    account_type: AccountType
    card: Optional[RedlineCard] = None
    wallet: Wallet = field(default_factory=lambda: Wallet(owner_id=""))
    team_owner_id: Optional[str] = None
    team_members: List[str] = field(default_factory=list)


@dataclass
class Machine:
    machine_id: str
    owner_id: str
    nickname: str
    year: int
    make: str
    model: str
    machine_class: MachineClass
    hp: int
    weight_lbs: int
    engine: str
    parts: List[str]


@dataclass
class Pick:
    pick_id: str
    user_id: str
    run_id: str
    predicted_winner_id: str
    amount: float
    odds: float
    locked: bool = False
    won: Optional[bool] = None
    payout: float = 0.0


@dataclass
class Run:
    run_id: str
    creator_id: str
    name: str
    run_type: RunType
    machine_class: MachineClass
    date_time: str
    location: str
    description: str
    entry_fee: float
    access_type: AccessType
    access_price: float
    picks_enabled: bool
    participants: List[str] = field(default_factory=list)
    access_buyers: List[str] = field(default_factory=list)
    current_odds: Dict[str, float] = field(default_factory=dict)
    picks_locked: bool = False
    results_posted: bool = False
    results: Dict[str, Any] = field(default_factory=dict)


class RedlineCompletePlatform:
    PLATFORM_CUT = 0.10

    def __init__(self) -> None:
        self.accounts: Dict[str, Account] = {}
        self.machines: Dict[str, Machine] = {}
        self.runs: Dict[str, Run] = {}
        self.picks: Dict[str, Pick] = {}
        self.platform_revenue: float = 0.0
        self._seed()

    def _seed(self) -> None:
        ghost = self.create_account("jockey_ghost", "Ghost", AccountType.JOCKEY, 2200, "Marcus 'Ghost' Rivera")
        turbo = self.create_account("jockey_turbo", "Turbo", AccountType.JOCKEY, 1400, "Tony 'Turbo' Vance")
        apex = self.create_account("jockey_apex", "Apex", AccountType.JOCKEY, 1900, "Apex Chen")
        owner = self.create_account("owner_king", "KingRodriguez", AccountType.TEAM_OWNER, 5000, "King's Court Racing")
        spec = self.create_account("spec_mike", "MikeTheSpec", AccountType.SPECTATOR, 600)

        owner.team_members.extend([ghost.user_id, turbo.user_id])
        ghost.team_owner_id = owner.user_id
        turbo.team_owner_id = owner.user_id

        self.add_machine(
            Machine(
                machine_id="machine_ghost_1",
                owner_id=ghost.user_id,
                nickname="Black Mamba",
                year=1995,
                make="Nissan",
                model="240SX",
                machine_class=MachineClass.STREET,
                hp=480,
                weight_lbs=2650,
                engine="SR20DET Turbo",
                parts=["Garrett GT3076R", "AEM Infinity", "Nismo 5-speed"],
            )
        )

        run = self.create_run(
            creator_id=ghost.user_id,
            name="New Year's Eve Street Battle",
            run_type=RunType.RACE,
            machine_class=MachineClass.STREET,
            days_out=2,
            location="Terminal Island",
            description="Head to head street battle",
            entry_fee=500,
            access_type=AccessType.GENERAL,
            access_price=25,
            picks_enabled=True,
        )
        self.join_run(turbo.user_id, run.run_id)
        self.place_pick(spec.user_id, run.run_id, ghost.user_id, 50)
        self._recompute_odds(run.run_id)
        # keep apex referenced to avoid lints/unused in narrative terms
        _ = apex

    def create_account(
        self,
        user_id: str,
        username: str,
        account_type: AccountType,
        starting_balance: float,
        card_name: Optional[str] = None,
    ) -> Account:
        card = None
        if account_type in {AccountType.JOCKEY, AccountType.TEAM_OWNER}:
            card = RedlineCard(
                name=card_name or username,
                bio="Redline competitor",
                classes=[MachineClass.STREET, MachineClass.SPORT],
                trust_score=96.0 if account_type == AccountType.JOCKEY else 93.0,
                verified=account_type == AccountType.JOCKEY,
            )

        acc = Account(
            user_id=user_id,
            username=username,
            account_type=account_type,
            card=card,
            wallet=Wallet(owner_id=user_id, balance=starting_balance),
        )
        self.accounts[user_id] = acc
        return acc

    def add_machine(self, machine: Machine) -> None:
        if machine.owner_id not in self.accounts:
            raise ValueError("Owner does not exist")
        owner = self.accounts[machine.owner_id]
        if owner.account_type != AccountType.JOCKEY:
            raise ValueError("Only jockeys can own machines")
        self.machines[machine.machine_id] = machine

    def create_run(
        self,
        creator_id: str,
        name: str,
        run_type: RunType,
        machine_class: MachineClass,
        days_out: int,
        location: str,
        description: str,
        entry_fee: float,
        access_type: AccessType,
        access_price: float,
        picks_enabled: bool,
    ) -> Run:
        creator = self.accounts[creator_id]
        if run_type == RunType.TOURNAMENT and creator.account_type != AccountType.TEAM_OWNER:
            raise ValueError("Only team owners can create tournaments")
        if run_type == RunType.RACE and creator.account_type not in {AccountType.JOCKEY, AccountType.TEAM_OWNER}:
            raise ValueError("Only jockeys or team owners can create races")

        run_id = f"run_{len(self.runs)+1:03d}"
        run = Run(
            run_id=run_id,
            creator_id=creator_id,
            name=name,
            run_type=run_type,
            machine_class=machine_class,
            date_time=(datetime.utcnow() + timedelta(days=days_out)).isoformat(),
            location=location,
            description=description,
            entry_fee=round(entry_fee, 2),
            access_type=access_type,
            access_price=round(access_price, 2),
            picks_enabled=picks_enabled,
            participants=[],
        )

        if creator.account_type == AccountType.JOCKEY:
            run.participants.append(creator_id)
            if entry_fee > 0:
                self._charge_entry(creator_id, run)

        self.runs[run_id] = run
        self._recompute_odds(run_id)
        return run

    def _charge_entry(self, user_id: str, run: Run) -> None:
        wallet = self.accounts[user_id].wallet
        if wallet.balance < run.entry_fee:
            raise ValueError("Insufficient funds for entry fee")
        wallet.apply(-run.entry_fee, "entry_fee", f"Entry fee for {run.name}")

    def join_run(self, user_id: str, run_id: str) -> None:
        account = self.accounts[user_id]
        run = self.runs[run_id]
        if account.account_type != AccountType.JOCKEY:
            raise ValueError("Only jockeys can join runs")
        if run.results_posted:
            raise ValueError("Cannot join a finalized run")
        if user_id in run.participants:
            return
        self._charge_entry(user_id, run)
        run.participants.append(user_id)
        self._recompute_odds(run_id)

    def buy_access(self, user_id: str, run_id: str) -> None:
        run = self.runs[run_id]
        buyer = self.accounts[user_id]
        if run.access_type in {AccessType.NONE, AccessType.RACER_ONLY}:
            raise ValueError("Run does not allow spectator access")
        if buyer.account_type != AccountType.SPECTATOR:
            raise ValueError("Only spectators can buy access")
        if buyer.wallet.balance < run.access_price:
            raise ValueError("Insufficient funds for access")

        buyer.wallet.apply(-run.access_price, "access_purchase", f"Access for {run.name}")
        run.access_buyers.append(user_id)

    def _recompute_odds(self, run_id: str) -> None:
        run = self.runs[run_id]
        if not run.participants:
            return
        weights: Dict[str, float] = {}
        for pid in run.participants:
            card = self.accounts[pid].card
            win_rate = card.win_rate if card else 50.0
            trust = card.trust_score if card else 90.0
            weights[pid] = max(0.1, (win_rate / 100) * 0.7 + (trust / 100) * 0.3)

        total = sum(weights.values())
        run.current_odds = {}
        for pid, w in weights.items():
            implied_prob = w / total
            odds = round(max(1.2, 1 / implied_prob), 2)
            run.current_odds[pid] = odds

    def place_pick(self, user_id: str, run_id: str, predicted_winner_id: str, amount: float) -> Pick:
        user = self.accounts[user_id]
        run = self.runs[run_id]
        if run.results_posted or run.picks_locked:
            raise ValueError("Picks are closed")
        if not run.picks_enabled:
            raise ValueError("Picks are disabled for this run")
        if user.account_type == AccountType.TEAM_OWNER:
            raise ValueError("Team owners cannot place picks")
        if predicted_winner_id not in run.participants:
            raise ValueError("Predicted winner must be a participant")
        if user.wallet.balance < amount:
            raise ValueError("Insufficient balance")

        self._recompute_odds(run_id)
        odds = run.current_odds[predicted_winner_id]

        pick_id = f"pick_{len(self.picks)+1:04d}"
        pick = Pick(
            pick_id=pick_id,
            user_id=user_id,
            run_id=run_id,
            predicted_winner_id=predicted_winner_id,
            amount=round(amount, 2),
            odds=odds,
        )
        self.picks[pick_id] = pick
        user.wallet.apply(-amount, "pick_placed", f"Pick on {predicted_winner_id} in {run.name}")
        return pick

    def post_results(self, creator_id: str, run_id: str, winner_id: str, times_s: Dict[str, float]) -> Dict[str, Any]:
        run = self.runs[run_id]
        if run.creator_id != creator_id:
            raise ValueError("Only run creator can post results")
        if run.results_posted:
            raise ValueError("Results are immutable once posted")
        if winner_id not in run.participants:
            raise ValueError("Winner must be run participant")

        run.picks_locked = True
        pool_entries = run.entry_fee * len(run.participants)
        pool_access = run.access_price * len(run.access_buyers)

        # Picks pool from this run only
        picks_for_run = [p for p in self.picks.values() if p.run_id == run_id]
        pool_picks = sum(p.amount for p in picks_for_run)

        fee_entries = round(pool_entries * self.PLATFORM_CUT, 2)
        fee_access = round(pool_access * self.PLATFORM_CUT, 2)
        fee_picks = round(pool_picks * self.PLATFORM_CUT, 2)

        self.platform_revenue += fee_entries + fee_access + fee_picks

        winner_payout = round(pool_entries - fee_entries, 2)
        self.accounts[winner_id].wallet.apply(winner_payout, "race_win", f"Win payout from {run.name}")

        # Creator receives access sales minus cut
        if pool_access > 0:
            access_payout = round(pool_access - fee_access, 2)
            self.accounts[run.creator_id].wallet.apply(access_payout, "access_revenue", f"Access sales for {run.name}")

        # Settle picks pari-mutuel-ish (using stored odds)
        for pick in picks_for_run:
            pick.locked = True
            if pick.predicted_winner_id == winner_id:
                pick.won = True
                gross = round(pick.amount * pick.odds, 2)
                # small fee already collected at pool level; do not double-fee winner payout
                pick.payout = gross
                self.accounts[pick.user_id].wallet.apply(gross, "pick_win", f"Pick win on {run.name}")
            else:
                pick.won = False
                pick.payout = 0.0

        sorted_times = sorted(times_s.items(), key=lambda item: item[1])
        places = {uid: idx + 1 for idx, (uid, _) in enumerate(sorted_times)}

        for uid in run.participants:
            if uid not in times_s:
                raise ValueError("Missing time for participant")
            place = places[uid]
            card = self.accounts[uid].card
            if card:
                card.add_result(run.name, place, times_s[uid])
                if uid == run.creator_id:
                    card.trust_score = min(100.0, round(card.trust_score + 0.2, 2))
                else:
                    card.trust_score = max(0.0, round(card.trust_score + (0.1 if place <= 3 else -0.1), 2))

        run.results_posted = True
        run.results = {
            "winner": winner_id,
            "times_s": times_s,
            "winner_payout": winner_payout,
            "platform_fee_total": round(fee_entries + fee_access + fee_picks, 2),
            "posted_at": datetime.utcnow().isoformat(),
        }
        return run.results

    def get_my_runs_and_earnings(self, user_id: str) -> Dict[str, Any]:
        account = self.accounts[user_id]
        if account.account_type != AccountType.JOCKEY:
            raise ValueError("Only jockeys have run earnings projections")
        runs = [r for r in self.runs.values() if user_id in r.participants and not r.results_posted]

        total_investment = sum(r.entry_fee for r in runs)
        potential = 0.0
        for run in runs:
            pot = run.entry_fee * len(run.participants)
            potential += pot * (1 - self.PLATFORM_CUT)

        win_rate = (account.card.win_rate / 100) if account.card else 0.0
        realistic = round(potential * win_rate, 2)
        return {
            "count_upcoming": len(runs),
            "total_investment": round(total_investment, 2),
            "max_potential": round(potential, 2),
            "realistic_projection": realistic,
            "trust": account.card.trust_score if account.card else None,
        }


def demo_summary() -> None:
    platform = RedlineCompletePlatform()
    run = next(iter(platform.runs.values()))
    print("REDLINE Complete local MVP")
    print(f"Accounts: {len(platform.accounts)} | Runs: {len(platform.runs)} | Picks: {len(platform.picks)}")
    print(f"Featured run: {run.run_id} {run.name}")
    print(f"Participants: {run.participants}")
    print(f"Current odds: {run.current_odds}")


if __name__ == "__main__":
    demo_summary()
