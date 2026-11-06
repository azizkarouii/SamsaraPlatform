-- What the client paid beyond the advance, recorded when a stay in progress is cancelled
ALTER TABLE reservations ADD COLUMN paid_after_advance double precision;

-- Notifications are stored as a translation key + parameters and shown in the reader's language.
-- Older rows keep their French title and message.
ALTER TABLE notifications ADD COLUMN message_key varchar(255);
ALTER TABLE notifications ADD COLUMN message_params text;

CREATE TABLE password_reset_tokens (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash varchar(64) NOT NULL UNIQUE,
    expires_at timestamp(6) NOT NULL,
    used_at timestamp(6)
);

-- The house type becomes a fixed list: "s+2", "S2" and " s + 2 " all mean "S+2"
UPDATE properties
SET configuration = 'S+' || substring(configuration from '[0-9]')
WHERE configuration ~* '^\s*s\s*\+?\s*[0-9]\s*$';
