-- 011: Grooming weight tiers per sub-service.
--
-- Tiers used to be one shared set for all of Grooming, so every grooming
-- sub-service charged the same. Each tier now belongs to one grooming
-- sub-service (Full Groom, Bath Only, ...) with its own prices. A grooming
-- sub-service with no tiers is charged its own flat service_price.
-- The existing tiers move to the first grooming sub-service, so its prices
-- don't change.
--
-- Run once per database (local + Render):
--   psql "$DATABASE_URL" -f server/migrations/011_tiers_per_grooming_service.sql

BEGIN;

ALTER TABLE tbl_grooming_price_tiers
  ADD COLUMN appointment_services_id integer
  REFERENCES tbl_appointment_services (appointment_services_id) ON DELETE CASCADE;

UPDATE tbl_grooming_price_tiers
SET appointment_services_id = (
  SELECT appointment_services_id FROM tbl_appointment_services
  WHERE category_id = 1 ORDER BY appointment_services_id LIMIT 1
);

-- Tiers with no grooming sub-service to belong to can never apply.
DELETE FROM tbl_grooming_price_tiers WHERE appointment_services_id IS NULL;

ALTER TABLE tbl_grooming_price_tiers
  ALTER COLUMN appointment_services_id SET NOT NULL,
  DROP CONSTRAINT tbl_grooming_price_tiers_tier_name_key,
  ADD CONSTRAINT uq_tier_name_per_service UNIQUE (appointment_services_id, tier_name);

CREATE INDEX idx_tiers_service ON tbl_grooming_price_tiers (appointment_services_id);

COMMIT;
