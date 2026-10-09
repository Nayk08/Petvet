-- 013: Consultation and Operation sub-services.
--
-- Consultation (category 2) sub-services have no fixed price yet: staff
-- enter the amount at payment, and prices can be set later in Maintenance.
-- Operation (category 3) sub-services carry their base price.
-- All are performed by a Veterinarian. A name that already exists is
-- skipped (names are unique across sub-services), so this is safe to re-run.
--
--   psql "$DATABASE_URL" -f server/migrations/013_consultation_operation_services.sql

BEGIN;

INSERT INTO tbl_appointment_services
  (appointment_services, category_id, description, duration_minutes, service_price, allowed_roles, created_by)
SELECT v.name, v.category_id, v.description, v.duration_minutes, v.price, ARRAY['Veterinarian'], 'System'
FROM (VALUES
  -- Consultation
  ('General Check-up',       2, 'Routine physical exam for a healthy pet', 30, NULL::numeric),
  ('Sick Visit',             2, 'Exam and diagnosis for a pet showing symptoms', 30, NULL),
  ('Vaccination',            2, 'Core or optional shots with a brief health check', 15, NULL),
  ('Deworming / Preventive', 2, 'Deworming and tick, flea, and heartworm prevention', 15, NULL),
  ('Follow-up',              2, 'Recheck after treatment, surgery, or a previous diagnosis', 15, NULL),
  ('Emergency',              2, 'Urgent care for trauma, poisoning, or breathing difficulty', 60, NULL),
  ('Surgery Consult',        2, 'Pre-surgical assessment and lab work review', 30, NULL),
  ('Post-op Check',          2, 'Wound check and suture removal after surgery', 15, NULL),
  ('Dental',                 2, 'Oral exam and cleaning or extraction assessment', 30, NULL),
  ('Dermatology',            2, 'Skin, coat, ear, and allergy problems', 30, NULL),
  ('New Pet (Puppy/Kitten)', 2, 'First exam and setting up the vaccine and deworming schedule', 30, NULL),
  ('Senior Wellness',        2, 'Screening for age-related conditions in older pets', 45, NULL),
  ('Nutrition / Weight',     2, 'Diet planning for obesity or special conditions', 20, NULL),
  ('Behavioral',             2, 'Aggression, anxiety, and house-training problems', 45, NULL),
  ('Health Certificate',     2, 'Exam and paperwork for travel or transport', 20, NULL),
  -- Operation
  ('Neuter',                3, 'Removal of the testicles in a male pet', 30, 2500),
  ('Spay',                  3, 'Removal of the ovaries and uterus in a female pet', 60, 3500),
  ('Dental Cleaning',       3, 'Scaling and polishing under anesthesia', 60, 3000),
  ('Tooth Extraction',      3, 'Removal of a damaged or infected tooth', 45, 1500),
  ('Wound Suturing',        3, 'Cleaning and stitching of cuts or bite wounds', 45, 2000),
  ('Abscess Drainage',      3, 'Lancing and flushing of an infected swelling', 30, 1500),
  ('Aural Hematoma Repair', 3, 'Draining and suturing a blood-filled ear flap', 45, 4000),
  ('Mass / Tumor Removal',  3, 'Surgical removal of a lump, often sent for biopsy', 90, 6000),
  ('Hernia Repair',         3, 'Closing an umbilical or inguinal hernia', 60, 6000),
  ('Eye Surgery',           3, 'Cherry eye repair or removal of a damaged eye', 60, 7000),
  ('Cesarean Section',      3, 'Surgical delivery of newborns', 90, 10000),
  ('Pyometra Surgery',      3, 'Emergency removal of an infected uterus', 90, 12000),
  ('Cystotomy',             3, 'Opening the bladder to remove stones', 90, 12000),
  ('Amputation',            3, 'Removal of a limb or tail due to injury or disease', 120, 12000),
  ('Foreign Body Removal',  3, 'Opening the stomach or intestine to remove a swallowed object', 120, 18000),
  ('Fracture Repair',       3, 'Fixing a broken bone with pins or plates', 150, 25000)
) AS v(name, category_id, description, duration_minutes, price)
ON CONFLICT (appointment_services) DO NOTHING;

COMMIT;
