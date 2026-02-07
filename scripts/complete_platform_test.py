#!/usr/bin/env python3
"""Run a complete local MVP test of the Redline demo platform."""

from __future__ import annotations

import importlib.util
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

DEMO_FILE = REPO_ROOT / "redline_demo-sonnet4.5.py"


def load_demo_module():
    spec = importlib.util.spec_from_file_location("redline_demo", DEMO_FILE)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module from {DEMO_FILE}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_complete_test() -> None:
    demo = load_demo_module()
    platform = demo.RedlinePlatform()

    # Seeded username checks
    assert platform.login("MikeTheSpec"), "Expected seeded spectator username to log in"
    mike = platform.get_current_user()
    assert mike is not None and mike.user_id == "spec_mike"
    assert mike.following_racers, "Expected social follow graph to be seeded"

    assert platform.login("Turbo"), "Expected seeded jockey username to log in"
    turbo = platform.get_current_user()
    assert turbo is not None and turbo.user_id == "jockey_turbo"

    # Core seeded objects
    assert len(platform.accounts) >= 7, "Expected demo accounts to be seeded"
    assert "run_001" in platform.runs, "Expected base run seed run_001"

    run = platform.runs["run_001"]
    assert run.picks_enabled is True
    assert run.current_odds.get("jockey_ghost") is not None

    # Ranking-confidence/hype metadata seeds should be available
    assert run.confidence_by_participant, "Expected confidence metadata for participants"
    assert run.hype_objects, "Expected hype objects to be attached to runs"

    ghost_confidence = run.confidence_by_participant.get("jockey_ghost", {})
    assert "sample_size" in ghost_confidence
    assert "implied_probability" in ghost_confidence

    print("Complete MVP test passed.")
    print("- Seeded usernames (MikeTheSpec, Turbo) are valid")
    print("- Accounts/runs initialized")
    print("- Ranking confidence and hype metadata initialized")


def main() -> int:
    if not DEMO_FILE.exists():
        print(f"ERROR: Missing demo file at {DEMO_FILE}", file=sys.stderr)
        return 1

    run_complete_test()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
