-- ---------------------------------------------------------------------------------------------
-- 1. Real date types. One test booking (end before start) is put back in order first.
-- ---------------------------------------------------------------------------------------------
UPDATE reservations SET start_date = end_date, end_date = start_date WHERE end_date < start_date;

ALTER TABLE reservations
    ALTER COLUMN start_date TYPE date USING start_date::date,
    ALTER COLUMN end_date TYPE date USING end_date::date,
    ALTER COLUMN original_end_date TYPE date USING original_end_date::date;

ALTER TABLE property_availability ALTER COLUMN date TYPE date USING date::date;

-- ---------------------------------------------------------------------------------------------
-- 2. Money as exact decimals (no more binary rounding on sums)
-- ---------------------------------------------------------------------------------------------
ALTER TABLE reservations
    ALTER COLUMN advance_amount TYPE numeric(12, 2),
    ALTER COLUMN total_amount TYPE numeric(12, 2),
    ALTER COLUMN base_amount TYPE numeric(12, 2),
    ALTER COLUMN negotiated_price_per_day TYPE numeric(12, 2),
    ALTER COLUMN refund_amount TYPE numeric(12, 2),
    ALTER COLUMN samsar_refund_amount TYPE numeric(12, 2),
    ALTER COLUMN samsar_gain TYPE numeric(12, 2),
    ALTER COLUMN paid_after_advance TYPE numeric(12, 2);

ALTER TABLE properties
    ALTER COLUMN price_per_day TYPE numeric(12, 2),
    ALTER COLUMN price_per_week TYPE numeric(12, 2),
    ALTER COLUMN price_per_month TYPE numeric(12, 2);

ALTER TABLE property_seasonal_prices ALTER COLUMN price_per_day TYPE numeric(12, 2);

-- ---------------------------------------------------------------------------------------------
-- 3. Payments: every amount received from the client is recorded.
--    Until now the advance was counted when paid and the balance was assumed paid at the start of the
--    stay; those assumptions become recorded payments so the totals stay the same.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE reservation_payments (
    id bigserial PRIMARY KEY,
    reservation_id bigint NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
    amount numeric(12, 2) NOT NULL CHECK (amount > 0),
    paid_on date NOT NULL,
    kind varchar(20) NOT NULL,
    note varchar(500),
    recorded_by bigint REFERENCES users (id) ON DELETE SET NULL,
    created_at timestamp(6) NOT NULL DEFAULT now()
);
CREATE INDEX idx_reservation_payments_reservation ON reservation_payments (reservation_id);

INSERT INTO reservation_payments (reservation_id, amount, paid_on, kind, note, recorded_by)
SELECT id, advance_amount, COALESCE(created_at::date, start_date), 'advance', NULL, samsar_id
FROM reservations
WHERE advance_amount > 0 AND status <> 'pending';

INSERT INTO reservation_payments (reservation_id, amount, paid_on, kind, note, recorded_by)
SELECT id, total_amount - COALESCE(advance_amount, 0), start_date, 'payment', 'Solde (repris des anciennes données)', samsar_id
FROM reservations
WHERE status IN ('in-progress', 'completed') AND total_amount - COALESCE(advance_amount, 0) > 0;

INSERT INTO reservation_payments (reservation_id, amount, paid_on, kind, note, recorded_by)
SELECT id, paid_after_advance, start_date, 'payment', 'Payé avant l''annulation (repris des anciennes données)', samsar_id
FROM reservations
WHERE status = 'cancelled' AND paid_after_advance > 0;

ALTER TABLE reservations DROP COLUMN paid_after_advance;

-- The payments replace this derived table
DROP TABLE revenue_history;

-- ---------------------------------------------------------------------------------------------
-- 4. History of what was done on each booking, kept even if the booking is deleted
-- ---------------------------------------------------------------------------------------------
CREATE TABLE reservation_events (
    id bigserial PRIMARY KEY,
    reservation_id bigint NOT NULL,
    property_id bigint NOT NULL,
    actor_id bigint,
    actor_name varchar(255),
    action varchar(40) NOT NULL,
    details text,
    created_at timestamp(6) NOT NULL DEFAULT now()
);
CREATE INDEX idx_reservation_events_reservation ON reservation_events (reservation_id);

INSERT INTO reservation_events (reservation_id, property_id, actor_id, actor_name, action, created_at)
SELECT r.id, r.property_id, r.samsar_id, u.name, 'created', COALESCE(r.created_at, now())
FROM reservations r LEFT JOIN users u ON u.id = r.samsar_id;

-- ---------------------------------------------------------------------------------------------
-- 5. Sessions and email verification. Existing accounts are considered verified.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN email_verified boolean NOT NULL DEFAULT true;
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;
ALTER TABLE users ADD COLUMN token_version integer NOT NULL DEFAULT 0;

ALTER TABLE password_reset_tokens RENAME TO user_tokens;
ALTER TABLE user_tokens ADD COLUMN purpose varchar(30) NOT NULL DEFAULT 'password_reset';

-- ---------------------------------------------------------------------------------------------
-- 6. The database itself refuses two confirmed or in-progress stays on the same nights of a house
-- ---------------------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE reservations ADD CONSTRAINT reservations_no_overlap
    EXCLUDE USING gist (property_id WITH =, daterange(start_date, end_date, '[]') WITH &&)
    WHERE (status IN ('confirmed', 'in-progress'));

-- ---------------------------------------------------------------------------------------------
-- 7. House types: only the values of the list remain ("sss" and empty values become "not specified")
-- ---------------------------------------------------------------------------------------------
UPDATE properties SET configuration = NULL WHERE configuration IS NOT NULL AND configuration !~ '^S\+[0-9]$';
