#!/usr/bin/env python3
"""End-to-end smoke test for redline_complete.py."""

import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from redline_complete import Account, AccountType, RedlinePlatform, RunType


def main() -> None:
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

    print("complete_platform_test: PASS")


if __name__ == "__main__":
    main()
