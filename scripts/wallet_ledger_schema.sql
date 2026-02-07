-- Wallet/Ledger schema for Redline money movement accounting

CREATE TABLE IF NOT EXISTS wallet_accounts (
  wallet_account_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  stripe_connect_account_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  ledger_entry_id TEXT PRIMARY KEY,
  wallet_account_id TEXT NOT NULL REFERENCES wallet_accounts(wallet_account_id),
  amount NUMERIC(12,2) NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT NOT NULL,
  race_id TEXT,
  pick_id TEXT,
  settlement_id TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfers (
  transfer_id TEXT PRIMARY KEY,
  from_wallet_account_id TEXT,
  to_wallet_account_id TEXT,
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT NOT NULL,
  race_id TEXT,
  pick_id TEXT,
  settlement_id TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payouts (
  payout_id TEXT PRIMARY KEY,
  beneficiary_wallet_account_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  race_id TEXT,
  settlement_id TEXT,
  status TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settlements (
  settlement_id TEXT PRIMARY KEY,
  race_id TEXT NOT NULL,
  winner_id TEXT NOT NULL,
  winner_payout NUMERIC(12,2) NOT NULL,
  pick_count INT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
