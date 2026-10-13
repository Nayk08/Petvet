-- 016: Client profile pictures.
--
-- Clients can upload their own profile picture from the client portal
-- (stored on Cloudinary, like staff pictures; this holds the image URL).
-- NULL = no picture (the portal shows their initials instead).
--
--   psql "$DATABASE_URL" -f server/migrations/016_client_picture.sql

BEGIN;

ALTER TABLE tbl_clients ADD COLUMN IF NOT EXISTS client_picture TEXT;

COMMIT;
