import type { Database } from './database.ts';

const schema = `
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS api_rate_limits (
  rate_key TEXT PRIMARY KEY, bucket TEXT NOT NULL, hits INTEGER NOT NULL CHECK(hits >= 0), reset_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS api_rate_limits_expiry_idx ON api_rate_limits(reset_at);
CREATE INDEX IF NOT EXISTS api_rate_limits_bucket_idx ON api_rate_limits(bucket);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('MEMBER','ADMIN')),
  admin_role TEXT CHECK(admin_role IN ('MEMBER','ADMIN','SUPPORT','MINING_OPERATOR','FINANCE_OPERATOR','PRODUCT_MANAGER','FINANCE_APPROVER','MASTER_ADMIN','READ_ONLY')),
  is_demo INTEGER NOT NULL CHECK(is_demo IN (0,1)), referral_code TEXT NOT NULL UNIQUE,
  sponsor_id TEXT REFERENCES users(id), created_at TEXT NOT NULL, blocked INTEGER NOT NULL DEFAULT 0,
  mfa_secret TEXT, mfa_pending_secret TEXT, last_totp_step BIGINT
);
CREATE INDEX IF NOT EXISTS users_scope_idx ON users(scope);
CREATE INDEX IF NOT EXISTS users_sponsor_idx ON users(sponsor_id);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), csrf_token TEXT NOT NULL,
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL,
  consumed_at TEXT
);
CREATE TABLE IF NOT EXISTS plans (
  scope TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, coin TEXT NOT NULL,
  algorithm TEXT NOT NULL, machine TEXT NOT NULL, price_cents BIGINT NOT NULL CHECK(price_cents > 0 AND price_cents <= 100000000),
  duration_days INTEGER NOT NULL CHECK(duration_days BETWEEN 1 AND 3650),
  rate_bps INTEGER NOT NULL CHECK(rate_bps BETWEEN 0 AND 10000), power_weight INTEGER NOT NULL,
  color TEXT NOT NULL, image TEXT NOT NULL, status TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(scope,id)
);
CREATE TABLE IF NOT EXISTS product_rules (
  scope TEXT NOT NULL, id TEXT NOT NULL, label TEXT NOT NULL, status TEXT NOT NULL,
  description TEXT NOT NULL, source TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(scope,id)
);
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), plan_id TEXT NOT NULL,
  principal_cents BIGINT NOT NULL CHECK(principal_cents > 0), snapshot TEXT NOT NULL,
  status TEXT NOT NULL, started_at TEXT NOT NULL, expires_at TEXT NOT NULL,
  purchased_key TEXT NOT NULL UNIQUE, is_demo INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS contracts_user_idx ON contracts(user_id);
CREATE TABLE IF NOT EXISTS mining_cycles (
  id TEXT PRIMARY KEY, contract_id TEXT NOT NULL REFERENCES contracts(id), cycle_number INTEGER NOT NULL,
  starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, settled_at TEXT, earned_cents BIGINT NOT NULL DEFAULT 0,
  paused_at TEXT,
  UNIQUE(contract_id,cycle_number)
);
CREATE TABLE IF NOT EXISTS accounting_journals (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, business_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL, description TEXT NOT NULL, is_demo INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS accounting_lines (
  id TEXT PRIMARY KEY, journal_id TEXT NOT NULL REFERENCES accounting_journals(id),
  account TEXT NOT NULL, amount_cents BIGINT NOT NULL CHECK(amount_cents <> 0)
);
CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
  journal_id TEXT NOT NULL REFERENCES accounting_journals(id), business_key TEXT NOT NULL UNIQUE,
  wallet TEXT NOT NULL CHECK(wallet IN ('deposit','earnings','affiliate')),
  amount_cents BIGINT NOT NULL CHECK(amount_cents <> 0 AND amount_cents BETWEEN -1000000000000 AND 1000000000000),
  kind TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL,
  reference TEXT NOT NULL, is_demo INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_user_idx ON ledger_entries(user_id,created_at);
CREATE TABLE IF NOT EXISTS idempotency_commands (
  scope TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), command TEXT NOT NULL,
  command_key TEXT NOT NULL, payload_hash TEXT NOT NULL, result_id TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,command,command_key)
);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, amount_cents BIGINT NOT NULL CHECK(amount_cents > 0), fee_cents BIGINT NOT NULL DEFAULT 0,
  net_cents BIGINT NOT NULL, wallet TEXT NOT NULL, status TEXT NOT NULL,
  provider TEXT, external_reference TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  is_demo INTEGER NOT NULL, request_key TEXT NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS payments_user_idx ON payments(user_id);
CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY, payment_id TEXT NOT NULL REFERENCES payments(id), event_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL, description TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS market_positions (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
  principal_cents BIGINT NOT NULL CHECK(principal_cents > 0), status TEXT NOT NULL,
  created_at TEXT NOT NULL, closed_at TEXT, snapshot TEXT NOT NULL, is_demo INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS market_accruals (
  id TEXT PRIMARY KEY, position_id TEXT NOT NULL REFERENCES market_positions(id), period INTEGER NOT NULL,
  amount_cents BIGINT NOT NULL CHECK(amount_cents >= 0), created_at TEXT NOT NULL,
  UNIQUE(position_id,period)
);
CREATE TABLE IF NOT EXISTS career_periods (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), month TEXT NOT NULL,
  snapshot TEXT NOT NULL, formula_version TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE(user_id,month)
);
CREATE TABLE IF NOT EXISTS profit_sharing_rates (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, date TEXT NOT NULL, rate_bps INTEGER NOT NULL CHECK(rate_bps BETWEEN 90 AND 110),
  actor_id TEXT NOT NULL REFERENCES users(id), source TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE(scope,date)
);
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL,
  created_at TEXT NOT NULL, reply TEXT, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, code TEXT NOT NULL, discount_bps INTEGER NOT NULL CHECK(discount_bps BETWEEN 1 AND 9999),
  max_uses INTEGER NOT NULL CHECK(max_uses > 0), uses INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, UNIQUE(scope,code)
);
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id TEXT PRIMARY KEY, coupon_id TEXT NOT NULL REFERENCES coupons(id), contract_id TEXT NOT NULL REFERENCES contracts(id),
  user_id TEXT NOT NULL REFERENCES users(id), discount_cents BIGINT NOT NULL, UNIQUE(coupon_id,contract_id)
);
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, contract_id TEXT NOT NULL REFERENCES contracts(id),
  buyer_id TEXT NOT NULL REFERENCES users(id), recipient_id TEXT NOT NULL REFERENCES users(id),
  level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 7), rate_bps INTEGER,
  base_cents BIGINT NOT NULL, amount_cents BIGINT, status TEXT NOT NULL,
  snapshot TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(contract_id,level)
);
CREATE TABLE IF NOT EXISTS commission_reversals (
  id TEXT PRIMARY KEY, commission_id TEXT NOT NULL UNIQUE REFERENCES affiliate_commissions(id),
  reason TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS contract_cancellations (
  contract_id TEXT PRIMARY KEY REFERENCES contracts(id), cancelled_at TEXT NOT NULL,
  reason TEXT NOT NULL, actor_id TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS career_funding (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, contract_id TEXT NOT NULL REFERENCES contracts(id),
  month TEXT NOT NULL, bucket TEXT NOT NULL CHECK(bucket IN ('salary','bonus','reserve')),
  amount_cents BIGINT NOT NULL CHECK(amount_cents >= 0), business_key TEXT NOT NULL UNIQUE,
  policy_version TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS career_funding_reversals (
  id TEXT PRIMARY KEY, funding_id TEXT NOT NULL UNIQUE REFERENCES career_funding(id),
  amount_cents BIGINT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS career_closings (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, month TEXT NOT NULL, actor_id TEXT NOT NULL REFERENCES users(id),
  snapshot TEXT NOT NULL, formula_version TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(scope,month)
);
CREATE TABLE IF NOT EXISTS career_awards (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
  month TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('salary','bonus')),
  amount_cents BIGINT NOT NULL CHECK(amount_cents >= 0), status TEXT NOT NULL,
  business_key TEXT NOT NULL UNIQUE, snapshot TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, actor_id TEXT REFERENCES users(id), action TEXT NOT NULL,
  target TEXT NOT NULL, details TEXT NOT NULL, created_at TEXT NOT NULL
);
`;

export async function migrate(db: Database) {
  await db.script(schema);
  // Additive migration: preserve legacy role values and all existing foreign keys/rows.
  const adminRoleColumn=db.dialect==='sqlite'
    ? (await db.all('PRAGMA table_info(users)')).some(column=>column.name==='admin_role')
    : !!await db.get("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='users' AND column_name='admin_role'");
  if(!adminRoleColumn)await db.script("ALTER TABLE users ADD COLUMN admin_role TEXT CHECK(admin_role IN ('MEMBER','ADMIN','SUPPORT','MINING_OPERATOR','FINANCE_OPERATOR','PRODUCT_MANAGER','FINANCE_APPROVER','MASTER_ADMIN','READ_ONLY'));");
  // Additive migration: paused cycles keep pending cycles; existing settlement rows are untouched.
  const cyclePauseColumn=db.dialect==='sqlite'
    ? (await db.all('PRAGMA table_info(mining_cycles)')).some(column=>column.name==='paused_at')
    : !!await db.get("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='mining_cycles' AND column_name='paused_at'");
  if(!cyclePauseColumn)await db.script('ALTER TABLE mining_cycles ADD COLUMN paused_at TEXT;');
  if (db.dialect === 'sqlite') {
    for (const table of ['ledger_entries', 'market_accruals', 'accounting_journals', 'accounting_lines', 'audit_events', 'payment_events', 'career_periods', 'affiliate_commissions', 'commission_reversals', 'career_funding', 'career_funding_reversals', 'career_closings', 'career_awards', 'contract_cancellations', 'profit_sharing_rates']) {
      await db.script(`CREATE TRIGGER IF NOT EXISTS ${table}_no_update BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT,'append-only table'); END;
        CREATE TRIGGER IF NOT EXISTS ${table}_no_delete BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT,'append-only table'); END;`);
    }
    await db.script(`CREATE TRIGGER IF NOT EXISTS users_sponsor_immutable BEFORE UPDATE OF sponsor_id ON users
      WHEN NEW.sponsor_id IS NOT OLD.sponsor_id BEGIN SELECT RAISE(ABORT,'sponsor is immutable'); END;`);
    await db.script(`CREATE TRIGGER IF NOT EXISTS contracts_snapshot_immutable BEFORE UPDATE OF snapshot,principal_cents,plan_id,started_at,expires_at,user_id,scope,purchased_key,is_demo ON contracts BEGIN SELECT RAISE(ABORT,'contract snapshot is immutable'); END;
      CREATE TRIGGER IF NOT EXISTS market_snapshot_immutable BEFORE UPDATE OF snapshot,principal_cents,user_id,scope,created_at,is_demo ON market_positions BEGIN SELECT RAISE(ABORT,'market snapshot is immutable'); END;`);
  } else {
    await db.script(`CREATE OR REPLACE FUNCTION amng_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'append-only table'; END; $$;`);
    for (const table of ['ledger_entries', 'market_accruals', 'accounting_journals', 'accounting_lines', 'audit_events', 'payment_events', 'career_periods', 'affiliate_commissions', 'commission_reversals', 'career_funding', 'career_funding_reversals', 'career_closings', 'career_awards', 'contract_cancellations', 'profit_sharing_rates']) {
      await db.script(`DROP TRIGGER IF EXISTS ${table}_immutable ON ${table};
        CREATE TRIGGER ${table}_immutable BEFORE UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION amng_append_only();`);
    }
    await db.script(`CREATE OR REPLACE FUNCTION amng_sponsor_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.sponsor_id IS DISTINCT FROM OLD.sponsor_id THEN RAISE EXCEPTION 'sponsor is immutable'; END IF; RETURN NEW; END; $$;
      DROP TRIGGER IF EXISTS users_sponsor_immutable ON users;
      CREATE TRIGGER users_sponsor_immutable BEFORE UPDATE OF sponsor_id ON users FOR EACH ROW EXECUTE FUNCTION amng_sponsor_immutable();`);
    await db.script(`DROP TRIGGER IF EXISTS contracts_snapshot_immutable ON contracts;
      CREATE TRIGGER contracts_snapshot_immutable BEFORE UPDATE OF snapshot,principal_cents,plan_id,started_at,expires_at,user_id,scope,purchased_key,is_demo ON contracts FOR EACH ROW EXECUTE FUNCTION amng_append_only();
      DROP TRIGGER IF EXISTS market_snapshot_immutable ON market_positions;
      CREATE TRIGGER market_snapshot_immutable BEFORE UPDATE OF snapshot,principal_cents,user_id,scope,created_at,is_demo ON market_positions FOR EACH ROW EXECUTE FUNCTION amng_append_only();`);
  }
  await db.run('INSERT INTO schema_migrations(version,applied_at) VALUES(?,?) ON CONFLICT(version) DO NOTHING', [1, new Date().toISOString()]);
  await db.run('INSERT INTO schema_migrations(version,applied_at) VALUES(?,?) ON CONFLICT(version) DO NOTHING', [2, new Date().toISOString()]);
  await db.run('INSERT INTO schema_migrations(version,applied_at) VALUES(?,?) ON CONFLICT(version) DO NOTHING', [3, new Date().toISOString()]);
  await db.run('INSERT INTO schema_migrations(version,applied_at) VALUES(?,?) ON CONFLICT(version) DO NOTHING', [4, new Date().toISOString()]);
  await db.run('INSERT INTO schema_migrations(version,applied_at) VALUES(?,?) ON CONFLICT(version) DO NOTHING', [5, new Date().toISOString()]);
}
