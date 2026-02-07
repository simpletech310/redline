#!/usr/bin/env python3
"""Run complete local MVP checks for both demo seed data and complete platform API."""

from __future__ import annotations

import importlib.util
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

DEMO_FILE = REPO_ROOT / "redline_demo-sonnet4.5.py"

from redline_complete import Account, AccountType, RedlinePlatform, RunType


def load_demo_module():
    spec = importlib.util.spec_from_file_location("redline_demo", DEMO_FILE)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module from {DEMO_FILE}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_complete_platform_api_test() -> None:
    platform = RedlinePlatform()

    creator = Account("owner_001", "Owner", AccountType.TEAM_OWNER, wallet_balance=1000.0)
    jockey = Account("jockey_001", "Turbo", AccountType.JOCKEY, wallet_balance=200.0)
    spectator = Account("spec_001", "Mike", AccountType.SPECTATOR, wallet_balance=150.0)

    platform.add_account(creator)
    platform.add_account(jockey)
    platform.add_account(spectator)

    run = platform.create_run(
        creator_id=creator.user_id,
        run_id="run_001",
        name="Friday Night Finals",
        run_type=RunType.RACE,
        entry_fee=25.0,
        picks_enabled=True,
    )

    platform.join_run(user_id=jockey.user_id, run_id=run.run_id)

    platform.place_pick(
        user_id=spectator.user_id,
        run_id=run.run_id,
        prediction_user_id=jockey.user_id,
        amount=20.0,
    )

    platform.post_results(
        posted_by=creator.user_id,
        run_id=run.run_id,
        winner_user_id=jockey.user_id,
        times={creator.user_id: "10.42s", jockey.user_id: "10.31s"},
    )

    creator_summary = platform.get_my_runs_and_earnings(creator.user_id)
    jockey_summary = platform.get_my_runs_and_earnings(jockey.user_id)
    spectator_summary = platform.get_my_runs_and_earnings(spectator.user_id)

    assert creator_summary["run_count"] == 1
    assert jockey_summary["race_winnings"] > 0
    assert spectator_summary["pick_earnings"] > 0


def run_seeded_demo_test() -> None:
    demo = load_demo_module()
    platform = demo.RedlinePlatform()

    assert platform.login("MikeTheSpec"), "Expected seeded spectator username to log in"
    mike = platform.get_current_user()
    assert mike is not None and mike.user_id == "spec_mike"
    assert mike.following_racers, "Expected social follow graph to be seeded"

    assert platform.login("Turbo"), "Expected seeded jockey username to log in"
    turbo = platform.get_current_user()
    assert turbo is not None and turbo.user_id == "jockey_turbo"

    assert len(platform.accounts) >= 7, "Expected demo accounts to be seeded"
    assert "run_001" in platform.runs, "Expected base run seed run_001"

    run = platform.runs["run_001"]
    assert run.picks_enabled is True
    assert run.current_odds.get("jockey_ghost") is not None

    assert run.confidence_by_participant, "Expected confidence metadata for participants"
    assert run.hype_objects, "Expected hype objects to be attached to runs"

    ghost_confidence = run.confidence_by_participant.get("jockey_ghost", {})
    assert "sample_size" in ghost_confidence
    assert "implied_probability" in ghost_confidence


def main() -> int:
    if not DEMO_FILE.exists():
        print(f"ERROR: Missing demo file at {DEMO_FILE}", file=sys.stderr)
        return 1

    run_complete_platform_api_test()
    run_seeded_demo_test()

    print("complete_platform_test: PASS")
    print("- redline_complete API flow verified")
    print("- demo seeded users/runs metadata verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
