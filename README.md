# REDLINE

Local-first setup so you can test **before** adding Stripe, Supabase, Vercel, or Render keys.

## 1) Create virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.back.txt
pip install rich
```

## 2) Optional env file (no keys needed to test)

```bash
cp .env.example .env
```

You can leave every value empty for local testing.

## 3) Run local no-keys smoke test

```bash
python scripts/no_keys_smoke_test.py
```

This validates that demo initialization and core in-memory flows work without external credentials.

## 4) Run interactive terminal demo

```bash
python redline_demo-sonnet4.5.py
```

## What this verifies without API keys

- Account login and role handling in demo mode.
- Run board + run state in local memory.
- Picks placement behavior and wallet transaction updates.
- Ability to keep building while infrastructure keys are still pending.

## Next step after smoke test

Once this passes, start wiring providers in this order:
1. Supabase schema + auth/session model
2. Stripe Connect + webhook reconciliation
3. Render API deploy
4. Vercel web client deploy

## API (FastAPI + Postgres/Supabase)

A new API is available at `apps/api` with service-layer modules and repository-backed data access.

Run locally:

```bash
uvicorn apps.api.main:app --reload
```
