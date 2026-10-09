-- 014: Fixed prices for the consultation sub-services added in 013.
--
-- Only fills a price that is still empty, so a price already set in
-- Maintenance is kept. Prices can be changed later in Maintenance.
--
--   psql "$DATABASE_URL" -f server/migrations/014_consultation_prices.sql

BEGIN;

UPDATE tbl_appointment_services s
SET service_price = v.price, updated_by = 'System', date_updated = NOW()
FROM (VALUES
  ('General Check-up',        400),
  ('Sick Visit',              500),
  ('Vaccination',             350),
  ('Deworming / Preventive',  300),
  ('Follow-up',               250),
  ('Emergency',              1500),
  ('Surgery Consult',         600),
  ('Post-op Check',           300),
  ('Dental',                  500),
  ('Dermatology',             600),
  ('New Pet (Puppy/Kitten)',  500),
  ('Senior Wellness',         800),
  ('Nutrition / Weight',      400),
  ('Behavioral',              700),
  ('Health Certificate',      500)
) AS v(name, price)
WHERE s.appointment_services = v.name
  AND s.category_id = 2
  AND s.service_price IS NULL;

COMMIT;
