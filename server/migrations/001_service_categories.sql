-- 001: Fixed service categories + sub-services with their own duration.
--
-- tbl_appointment_services rows become the "sub-services". Each now belongs
-- to exactly one of three fixed categories (Grooming / Consultation /
-- Operation). Categories are seed data only — the API has no endpoint to
-- add, rename or delete them.
--
-- Run once per database (local + Render):
--   psql "$DATABASE_URL" -f server/migrations/001_service_categories.sql
-- The whole file is one transaction: it applies fully or not at all.

BEGIN;

CREATE TABLE tbl_service_categories (
    category_id   integer PRIMARY KEY,
    category_name varchar(50) NOT NULL UNIQUE,
    sort_order    integer NOT NULL
);

INSERT INTO tbl_service_categories (category_id, category_name, sort_order) VALUES
    (1, 'Grooming', 1),
    (2, 'Consultation', 2),
    (3, 'Operation', 3);

ALTER TABLE tbl_appointment_services
    ADD COLUMN category_id integer REFERENCES tbl_service_categories (category_id);

-- Existing catalog: Grooming -> Grooming, Operation -> Operation, every
-- other (medical / laboratory) service -> Consultation. This replaces the
-- old free-text `category` column ('Grooming' / 'Medical' / 'Laboratory').
UPDATE tbl_appointment_services
SET category_id = CASE
        WHEN appointment_services = 'Grooming' OR category = 'Grooming' THEN 1
        WHEN appointment_services = 'Operation' THEN 3
        ELSE 2
    END;

-- Every sub-service needs a category and a duration (the booking end time
-- is computed from it).
UPDATE tbl_appointment_services SET duration_minutes = 60 WHERE duration_minutes IS NULL;
ALTER TABLE tbl_appointment_services
    ALTER COLUMN category_id SET NOT NULL,
    ALTER COLUMN duration_minutes SET NOT NULL,
    ADD CONSTRAINT chk_service_duration CHECK (duration_minutes > 0),
    DROP COLUMN category;

-- Appointment lists filter by category (Consultation / Grooming / Operation
-- pages). New columns go at the end — CREATE OR REPLACE VIEW can only append.
CREATE OR REPLACE VIEW v_appointments AS
 SELECT a.appointment_id,
    a.client_id,
    c.name AS client_name,
    c.email,
    c.mobile_no,
    a.pets_id,
    p.pets_name,
    a.appointment_services_id,
    s.appointment_services AS service_name,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.appointment_status_id,
    st.appointment_status_name,
    a.notes,
    a.is_deleted,
    a.created_by,
    a.updated_by,
    a.deleted_by,
    a.date_created,
    a.date_updated,
    a.date_deleted,
    a.assigned_staff_id,
    u.user_name AS staff_name,
    s.service_price,
    s.category_id,
    sc.category_name
   FROM tbl_appointments a
     JOIN tbl_clients c ON c.client_id = a.client_id
     JOIN tbl_pets p ON p.pets_id = a.pets_id
     JOIN tbl_appointment_services s ON s.appointment_services_id = a.appointment_services_id
     JOIN tbl_service_categories sc ON sc.category_id = s.category_id
     JOIN tbl_appointment_status st ON st.appointment_status_id = a.appointment_status_id
     LEFT JOIN tbl_users u ON u.users_id = a.assigned_staff_id;

-- Overlap checks look up a staff member's / pet's appointments on a date.
CREATE INDEX IF NOT EXISTS idx_appointments_staff_date ON tbl_appointments (assigned_staff_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_pet_date ON tbl_appointments (pets_id, appointment_date);

COMMIT;
