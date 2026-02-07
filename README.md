# REDLINE

Local-first setup so you can test **before** adding Stripe, Supabase, Vercel, or Render keys.

## Quick start (existing demo)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.back.txt
```

Optional env scaffold:

```bash
cp .env.example .env
```

Run no-keys smoke test:

```bash
python scripts/no_keys_smoke_test.py
```

Run interactive terminal demo:

```bash
python redline_demo-sonnet4.5.py
```

## Complete local MVP engine (new)

Use the complete version with core role rules, runs, picks, trust, immutable results,
wallet payouts, and earnings projections:

```bash
python redline_complete.py
```

Run end-to-end validation:

```bash
python scripts/complete_platform_test.py
```

## What the complete local MVP includes

- 3 account types with permission checks (Spectator, Jockey, Team Owner).
- Run creation/join flow (tournament restricted to Team Owner).
- Picks and access purchases with wallet ledger transactions.
- Automatic platform cut (10%) on entries, access, and pick pool.
- Result posting with immutable lock and payout settlement.
- Redline Card stat updates (wins/losses/times/history/trust).
- Jockey “My Runs & Earnings” projection output.

## Next integration phase

After local MVP validation, wire hosted services in this order:
1. Supabase auth + persistent schema + RLS
2. Stripe Connect onboarding + webhooks + reconciliation
3. Render API service deploy
4. Vercel web app deploy
