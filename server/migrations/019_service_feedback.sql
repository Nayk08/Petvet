-- 019: Client feedback after a completed visit.
--   One row per appointment: the client rates the service (1-5) and the
--   groomer/vet who handled it (1-5), with an optional comment. staff_id is
--   a snapshot of the appointment's assigned staff at rating time, so a later
--   reassignment doesn't move the rating to someone else. show_on_website is
--   the client's consent to show the comment on the public landing page.
--
-- Run once per database (local + Render):
--   psql "$DATABASE_URL" -f server/migrations/019_service_feedback.sql

BEGIN;

CREATE TABLE IF NOT EXISTS tbl_service_feedback (
  feedback_id SERIAL PRIMARY KEY,
  appointment_id INT NOT NULL UNIQUE REFERENCES tbl_appointments(appointment_id),
  client_id INT NOT NULL REFERENCES tbl_clients(client_id),
  staff_id INT REFERENCES tbl_users(users_id),
  service_rating SMALLINT NOT NULL CHECK (service_rating BETWEEN 1 AND 5),
  staff_rating SMALLINT CHECK (staff_rating BETWEEN 1 AND 5),
  comment VARCHAR(500),
  show_on_website BOOLEAN NOT NULL DEFAULT TRUE,
  date_created TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Optional photo the client attaches (Cloudinary URL). Separate statement so
-- re-running this file adds it to a table created by the first version.
ALTER TABLE tbl_service_feedback
  ADD COLUMN IF NOT EXISTS feedback_image TEXT;

CREATE INDEX IF NOT EXISTS idx_service_feedback_staff_id
  ON tbl_service_feedback(staff_id);

COMMIT;
