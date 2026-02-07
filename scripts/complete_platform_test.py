#!/usr/bin/env python3
"""Comprehensive local, no-keys platform check for the Redline demo."""

from __future__ import annotations

import importlib.util
import pathlib
import sys
from datetime import datetime, timedelta

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DEMO_FILE = REPO_ROOT / "redline_demo-sonnet4.5.py"


def load_demo_module():
    spec = importlib.util.spec_from_file_location("redline_demo", DEMO_FILE)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module from {DEMO_FILE}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_complete_platform_test() -> None:
    demo = load_demo_module()
    platform = demo.RedlinePlatform()

    # Baseline seed checks.
    assert platform.accounts, "Expected seeded accounts"
    assert platform.runs, "Expected seeded runs"

    seed_run = platform.runs["run_001"]
    assert seed_run.confidence_by_participant, "Expected seeded confidence metadata"
    assert seed_run.hype_objects, "Expected seeded hype objects"

    # Spectator pick lifecycle.
    assert platform.login("MikeTheSpec"), "Expected spectator login"
    spectator = platform.get_current_user()
    assert spectator is not None and spectator.wallet is not None
    start_spectator_balance = spectator.wallet.balance

    pick_id = f"pick_complete_{len(platform.picks) + 1:03d}"
    pick_amount = 12.5
    pick_odds = seed_run.current_odds["jockey_ghost"]
    platform.picks[pick_id] = demo.RedlinePick(
        pick_id=pick_id,
        user_id=spectator.user_id,
        run_id=seed_run.run_id,
        pick_type=demo.PickType.WINNER,
        prediction="jockey_ghost",
        amount=pick_amount,
        odds=pick_odds,
    )
    spectator.wallet.add_transaction(-pick_amount, f"Pick placed - {seed_run.name}", "pick_placed")
    assert spectator.wallet.balance == start_spectator_balance - pick_amount

    # Jockey creates a deterministic test run and joins with another jockey.
    assert platform.login("Turbo"), "Expected jockey login"
    creator = platform.get_current_user()
    assert creator is not None and creator.wallet is not None

    test_run_id = "run_complete"
    test_run = demo.RedlineRun(
        run_id=test_run_id,
        name="Complete Platform Test Run",
        run_type=demo.RunType.RACE,
        creator_id=creator.user_id,
        date_time=(datetime.now() + timedelta(days=3)).isoformat(),
        location="Local CI Raceway",
        description="Automated full-platform check",
        machine_class=demo.MachineClass.STREET,
        entry_fee=0.0,
        access_type=demo.AccessType.NONE,
        access_price=0.0,
        participants=[creator.user_id],
        picks_enabled=True,
        current_odds={creator.user_id: 1.9},
    )
    platform.runs[test_run_id] = test_run
    assert test_run_id in platform.runs

    challenger = platform.accounts["jockey_nitro"]
    test_run.participants.append(challenger.user_id)
    test_run.current_odds[challenger.user_id] = 2.4

    # Deterministically post results without interactive prompts.
    winner_id = creator.user_id
    times = {
        creator.user_id: "10.42s",
        challenger.user_id: "10.67s",
    }
    test_run.results = {
        "winner": winner_id,
        "times": times,
        "payout": 0.0,
    }
    test_run.results_posted = True
    test_run.picks_locked = True

    winner = platform.accounts[winner_id]
    assert winner.redline_card is not None
    prior_wins = winner.redline_card.stats.get("wins", 0)
    winner.redline_card.stats["wins"] = prior_wins + 1
    winner.redline_card.history.insert(
        0,
        {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "event": test_run.name,
            "result": "1st",
            "time": times[winner_id],
        },
    )

    assert test_run.results_posted is True
    assert test_run.results["winner"] == creator.user_id
    assert winner.redline_card.stats["wins"] == prior_wins + 1

    # Follow graph/subscriptions sanity checks.
    assert spectator.following_racers, "Expected seeded followed racers"
    assert spectator.notification_subscriptions, "Expected seeded notification subscriptions"

    print("SUCCESS: complete platform test passed")


def main() -> int:
    if not DEMO_FILE.exists():
        print(f"ERROR: Missing demo file at {DEMO_FILE}", file=sys.stderr)
        return 1
    run_complete_platform_test()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
