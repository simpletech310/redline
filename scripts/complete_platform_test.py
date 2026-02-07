#!/usr/bin/env python3
"""End-to-end checks for redline_complete.py."""

import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from redline_complete import AccessType, MachineClass, RedlineCompletePlatform, RunType


def main() -> int:
    platform = RedlineCompletePlatform()

    # Add spectator access purchase flow.
    run = next(iter(platform.runs.values()))
    spec_before = platform.accounts["spec_mike"].wallet.balance
    platform.buy_access("spec_mike", run.run_id)
    assert platform.accounts["spec_mike"].wallet.balance == spec_before - run.access_price

    # Add another racer and a pick so result settlement has multiple outcomes.
    platform.join_run("jockey_apex", run.run_id)
    platform.place_pick("jockey_turbo", run.run_id, "jockey_turbo", 25)

    # Post immutable results.
    result = platform.post_results(
        creator_id="jockey_ghost",
        run_id=run.run_id,
        winner_id="jockey_ghost",
        times_s={
            "jockey_ghost": 10.81,
            "jockey_turbo": 11.04,
            "jockey_apex": 11.19,
        },
    )
    assert result["winner"] == "jockey_ghost"
    assert platform.runs[run.run_id].results_posted is True

    # Results should be immutable.
    try:
        platform.post_results(
            creator_id="jockey_ghost",
            run_id=run.run_id,
            winner_id="jockey_turbo",
            times_s={"jockey_ghost": 10.9, "jockey_turbo": 10.8, "jockey_apex": 11.2},
        )
        raise AssertionError("Expected immutable results protection")
    except ValueError as exc:
        assert "immutable" in str(exc)

    # Tournament permission enforcement.
    try:
        platform.create_run(
            creator_id="jockey_ghost",
            name="Unauthorized Tournament",
            run_type=RunType.TOURNAMENT,
            machine_class=MachineClass.PRO,
            days_out=7,
            location="Irwindale",
            description="Should fail",
            entry_fee=1000,
            access_type=AccessType.VIP,
            access_price=100,
            picks_enabled=True,
        )
        raise AssertionError("Expected tournament permission guard")
    except ValueError as exc:
        assert "team owners" in str(exc)

    # Earnings projections for jockey.
    projection = platform.get_my_runs_and_earnings("jockey_turbo")
    assert "realistic_projection" in projection

    print("complete_platform_test passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
