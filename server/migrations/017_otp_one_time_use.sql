-- 017: One-time sign-in OTP codes.
--   The portal OTP is stateless (an HMAC riding in a short-lived JWT), so a
--   correct code could be replayed any number of times until it expired.
--   This column records when a client last consumed a code; verifyOtp stamps
--   it atomically on first use and refuses any code issued at or before it,
--   so a code (and every older one) dies the instant one is used.
--
-- Run once per database (local + Render):
--   psql "$DATABASE_URL" -f server/migrations/017_otp_one_time_use.sql

BEGIN;

ALTER TABLE tbl_clients
  ADD COLUMN IF NOT EXISTS otp_consumed_at timestamptz;

COMMIT;
