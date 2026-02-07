#!/usr/bin/env python3
"""Integration-ish test for the complete local platform engine."""

from __future__ import annotations

import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from redline_complete import RedlinePlatform


def main() -> int:
    platform = RedlinePlatform()

    assert platform.login("Turbo")
    creator = platform.get_current_user()
    assert creator is not None

    # Add another jockey and join run to build an entry-fee pot.
    platform.accounts["user_j2"] = platform.accounts["user_jockey"].__class__(
        user_id="user_j2",
        username="Rocket",
        account_type=platform.accounts["user_jockey"].account_type,
        wallet=platform.accounts["user_jockey"].wallet.__class__(owner_id="user_j2", balance=300.0),
    )
    platform.accounts_by_name["Rocket"] = "user_j2"

    run = platform.runs["run_001"]
    run.participants.append("user_j2")
    run.current_odds["user_j2"] = 2.5

    # Spectator places pick.
    assert platform.login("MikeTheSpec")
    spectator = platform.get_current_user()
    assert spectator is not None
    start_balance = spectator.wallet.balance
    pick = platform.place_pick(spectator, "run_001", "user_jockey", 25.0)
    assert pick.amount == 25.0
    assert spectator.wallet.balance == start_balance - 25.0

    # Creator posts results.
    assert platform.login("Turbo")
    creator = platform.get_current_user()
    assert creator is not None
    results = platform.post_results(
        creator,
        "run_001",
        winner_id="user_jockey",
        times={"user_jockey": "10.24s", "user_j2": "10.99s"},
    )

    assert results["winner"] == "user_jockey"
    assert platform.runs["run_001"].results_posted is True
    assert platform.runs["run_001"].picks_locked is True
    assert platform.picks[pick.pick_id].won is True
    assert platform.picks[pick.pick_id].payout == 25.0 * run.current_odds["user_jockey"]

    # Role guard check: non-creator should not be able to repost.
    assert platform.login("TeamBoss")
    owner = platform.get_current_user()
    assert owner is not None
    try:
        platform.post_results(owner, "run_001", winner_id="user_jockey", times={})
        raise AssertionError("Expected PermissionError")
    except PermissionError:
        pass

    print("complete_platform_test: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
