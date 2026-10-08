-- 012: Weight tiers for the size-dependent grooming sub-services.
--
-- Same weight bands as Full Grooming (Toy <=4, Small <=10, Medium <=25,
-- Large <=40 kg, Giant above). Small add-ons (Ear Cleaning, Nail Trimming,
-- Face Trim, ...) keep their flat price. Matched by sub-service name; a name
-- that doesn't exist is skipped. Safe to re-run (existing tiers untouched).
-- Prices can be changed later in Maintenance > Grooming.
--
--   psql "$DATABASE_URL" -f server/migrations/012_grooming_tier_prices.sql

BEGIN;

INSERT INTO tbl_grooming_price_tiers (appointment_services_id, tier_name, max_weight_kg, price)
SELECT s.appointment_services_id, v.tier_name, v.max_weight_kg, v.price
FROM (VALUES
  ('Premium/Deluxe Grooming', 'Toy',     4, 500),
  ('Premium/Deluxe Grooming', 'Small',  10, 700),
  ('Premium/Deluxe Grooming', 'Medium', 25, 950),
  ('Premium/Deluxe Grooming', 'Large',  40, 1300),
  ('Premium/Deluxe Grooming', 'Giant', NULL, 1700),

  ('Haircut & Styling', 'Toy',     4, 350),
  ('Haircut & Styling', 'Small',  10, 500),
  ('Haircut & Styling', 'Medium', 25, 700),
  ('Haircut & Styling', 'Large',  40, 950),
  ('Haircut & Styling', 'Giant', NULL, 1250),

  ('De-shedding Treatment', 'Toy',     4, 400),
  ('De-shedding Treatment', 'Small',  10, 550),
  ('De-shedding Treatment', 'Medium', 25, 750),
  ('De-shedding Treatment', 'Large',  40, 1000),
  ('De-shedding Treatment', 'Giant', NULL, 1300),

  ('Flea & Tick Bath', 'Toy',     4, 350),
  ('Flea & Tick Bath', 'Small',  10, 450),
  ('Flea & Tick Bath', 'Medium', 25, 600),
  ('Flea & Tick Bath', 'Large',  40, 800),
  ('Flea & Tick Bath', 'Giant', NULL, 1000),

  ('Medicated Bath', 'Toy',     4, 300),
  ('Medicated Bath', 'Small',  10, 400),
  ('Medicated Bath', 'Medium', 25, 550),
  ('Medicated Bath', 'Large',  40, 750),
  ('Medicated Bath', 'Giant', NULL, 950),

  ('Pawdicure', 'Toy',     4, 150),
  ('Pawdicure', 'Small',  10, 200),
  ('Pawdicure', 'Medium', 25, 250),
  ('Pawdicure', 'Large',  40, 300),
  ('Pawdicure', 'Giant', NULL, 350)
) AS v(service_name, tier_name, max_weight_kg, price)
JOIN tbl_appointment_services s
  ON s.appointment_services = v.service_name AND s.category_id = 1
ON CONFLICT (appointment_services_id, tier_name) DO NOTHING;

COMMIT;
