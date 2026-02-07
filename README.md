# REDLINE

Local-first setup so you can validate the MVP **before** adding Stripe, Supabase, Vercel, or Render keys.

## Canonical local test flow (quick start + no keys + complete MVP test)

### 1) Create a virtual environment and install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.back.txt
pip install rich
```

### 2) Optional env file (all keys can remain empty)

```bash
cp .env.example .env
```

### 3) Run no-keys smoke test

```bash
python scripts/no_keys_smoke_test.py
```

Validates import-safe module loading and core in-memory flows using seeded users.

### 4) Run complete MVP test

```bash
python scripts/complete_platform_test.py
```

Validates seeded accounts/runs plus ranking-confidence/hype metadata from a repo-root invocation.

### 5) (Optional) Run the interactive terminal demo

```bash
python redline_demo-sonnet4.5.py
```

## What this verifies without API keys

- Account login and role handling in demo mode.
- Run board + run state in local memory.
- Picks placement behavior and wallet transaction updates.
- Ranking feed confidence + hype metadata generation.

## Next step after local tests pass

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
