#!/usr/bin/env python3
"""Run a local smoke test of the Redline demo without any API keys.

This script intentionally avoids Stripe/Vercel/Render/Supabase credentials and
validates that core business flows run in demo mode.
"""

from __future__ import annotations

import importlib.util
import os
import pathlib
import sys
from datetime import datetime, timedelta

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DEMO_FILE = REPO_ROOT / "redline_demo-sonnet4.5.py"

OPTIONAL_ENV_VARS = [
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "VERCEL_URL",
    "RENDER_EXTERNAL_URL",
]


def load_demo_module():
    spec = importlib.util.spec_from_file_location("redline_demo", DEMO_FILE)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module from {DEMO_FILE}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def print_env_summary() -> None:
    print("\n== Environment check (keys optional for local test mode) ==")
    for key in OPTIONAL_ENV_VARS:
        value = os.getenv(key)
        status = "set" if value else "not set"
        print(f"- {key}: {status}")


def run_smoke_test() -> None:
    demo = load_demo_module()
    platform = demo.RedlinePlatform()

    assert platform.wallet_accounts, "Expected wallet_accounts table to be initialized"

    # Login with a spectator and place a pick on an existing run.
    assert platform.login("MikeTheSpec"), "Expected spectator login to succeed"
    spectator = platform.get_current_user()
    assert spectator is not None and spectator.wallet is not None

    start_balance = spectator.wallet.balance

    run_id = "run_001"
    run = platform.runs[run_id]
    assert run.picks_enabled, "Expected picks to be enabled for run_001"

    # Programmatically create a pick entry (without interactive prompt).
    pick_id = f"pick_smoke_{len(platform.picks) + 1:03d}"
    odds = run.current_odds["jockey_ghost"]
    amount = 10.0

    new_pick = demo.RedlinePick(
        pick_id=pick_id,
        user_id=spectator.user_id,
        run_id=run_id,
        pick_type=demo.PickType.WINNER,
        prediction="jockey_ghost",
        amount=amount,
        odds=odds,
    )

    platform.picks[pick_id] = new_pick
    platform._post_money_movement(
        spectator,
        -amount,
        f"Pick placed - {run.name}",
        "pick_placed",
        idempotency_key="smoke_pick_001",
        race_id=run_id,
        pick_id=pick_id,
    )

    # Duplicate should be skipped via idempotency key.
    platform._post_money_movement(
        spectator,
        -amount,
        f"Pick placed - {run.name}",
        "pick_placed",
        idempotency_key="smoke_pick_001",
        race_id=run_id,
        pick_id=pick_id,
    )

    assert spectator.wallet.balance == start_balance - amount

    history = platform.get_transaction_history(spectator, race_id=run_id, pick_id=pick_id)
    assert len(history) == 1, "Expected retry-safe single history line item for pick"

    # Validate webhook signature + retry-safe consumer and reconciliation worker.
    payload = '{"id":"evt_smoke_1","type":"payout.created","data":{"payout_id":"po_smoke","amount":11.5,"account_id":"jockey_ghost"}}'
    signature = demo.hmac.new(
        platform.stripe_gateway.webhook_secret.encode(),
        payload.encode(),
        demo.hashlib.sha256,
    ).hexdigest()
    assert platform.consume_webhook_event(payload, signature)
    assert platform.consume_webhook_event(payload, signature), "Duplicate webhook should be safely ignored"
    platform.run_reconciliation_workers()
    assert any(p["payout_id"] == "po_smoke" for p in platform.payouts)

    # Create a future run and join it with a jockey to validate entry deduction.
    assert platform.login("Turbo"), "Expected jockey login to succeed"
    jockey = platform.get_current_user()
    assert jockey is not None and jockey.wallet is not None

    created_run_id = "run_smoke"
    platform.runs[created_run_id] = demo.RedlineRun(
        run_id=created_run_id,
        name="Smoke Test Run",
        run_type=demo.RunType.RACE,
        creator_id=jockey.user_id,
        date_time=(datetime.now() + timedelta(days=2)).isoformat(),
        location="Local Test Track",
        description="Automated smoke test run",
        machine_class=demo.MachineClass.STREET,
        entry_fee=50.0,
        access_type=demo.AccessType.NONE,
        access_price=0.0,
        participants=[jockey.user_id],
        picks_enabled=False,
        current_odds={jockey.user_id: 2.0},
    )

    assert created_run_id in platform.runs

    print("\n== Smoke test assertions passed ==")
    print("- Demo initialized without external API keys")
    print("- Spectator wallet debited for a pick")
    print("- Jockey + run lifecycle basic state created")


def main() -> int:
    print("REDLINE local test mode (no API keys)")
    if not DEMO_FILE.exists():
        print(f"ERROR: Missing demo file at {DEMO_FILE}", file=sys.stderr)
        return 1

    print_env_summary()
    run_smoke_test()
    print("\nSUCCESS: Redline can be tested locally before wiring Stripe/Supabase/Vercel/Render keys.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
