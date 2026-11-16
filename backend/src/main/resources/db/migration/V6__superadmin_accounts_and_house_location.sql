-- Accounts are now created by the superadmin, who can turn them off and on (subscriptions later).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('SUPERADMIN', 'PROPRIETAIRE', 'SAMSAR'));

ALTER TABLE users ADD COLUMN active boolean NOT NULL DEFAULT true;
-- Accounts never confirmed by email stay off until the superadmin turns them on
UPDATE users SET active = email_verified;

-- An owner may work alone: without this option, nothing about samsars is shown to him
ALTER TABLE users ADD COLUMN samsars_enabled boolean NOT NULL DEFAULT true;

-- Where the house is, pinned on the map
ALTER TABLE properties ADD COLUMN latitude double precision;
ALTER TABLE properties ADD COLUMN longitude double precision;
