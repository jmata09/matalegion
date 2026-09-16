-- Ace's Clubhouse Rewards — schema
--
-- Two rules shape this file:
--
-- 1. The ledger is append-only. A guest's balance is always SUM(points) over
--    their entries, never a column someone can set. A mistake is corrected by
--    writing a compensating entry, not by editing history. Anything holding
--    value needs an audit trail more than it needs convenience.
-- 2. Money and points are integers. Cents, not dollars; whole points, not
--    fractions. Floats accumulate rounding error, and this is a liability on
--    the books.

CREATE TABLE IF NOT EXISTS guests (
  id             TEXT PRIMARY KEY,
  -- Normalised to ten digits so 913-555-0199 and (913) 555 0199 are one guest.
  phone          TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  email          TEXT,
  birthday_month INTEGER CHECK (birthday_month BETWEEN 1 AND 12),
  -- Staff enrol with their own numbers, exactly like a guest would. This flag
  -- is only so test accounts can be told apart later, not a permission.
  is_staff       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  archived_at    TEXT
);

CREATE TABLE IF NOT EXISTS ledger (
  id           TEXT PRIMARY KEY,
  guest_id     TEXT NOT NULL REFERENCES guests(id),
  kind         TEXT NOT NULL CHECK (kind IN ('earn', 'redeem', 'adjust')),
  source       TEXT CHECK (source IN ('Bar', 'Kitchen', 'Mini Golf', 'Events')),
  detail       TEXT,
  spend_cents  INTEGER,
  -- Signed: positive for earning, negative for redeeming. One column means a
  -- balance is a single SUM with no cases to get wrong.
  points       INTEGER NOT NULL,
  multiplier   REAL,
  promo        TEXT,
  reward_id    TEXT,
  -- The Toast check GUID once ingestion is live. UNIQUE is what makes a
  -- replayed webhook a no-op instead of double credit.
  external_ref TEXT UNIQUE,
  recorded_by  TEXT,
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_guest ON ledger (guest_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger (created_at DESC);
