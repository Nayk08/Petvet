-- 009: Fill in product details (brand, purpose, dosage/strength, unit,
-- description) for the existing catalog. Only EMPTY fields are filled —
-- anything staff already entered is kept. Brand is set only where the
-- product name itself names it. Medicines/vaccines carry general purposes
-- only (no dosing schedules); strengths come from the product name.
--
-- Run once per database (local + Render):
--   psql "$DATABASE_URL" -f server/migrations/009_product_details_data.sql

BEGIN;

UPDATE tbl_products p SET
  brand       = COALESCE(p.brand, d.brand),
  purpose     = COALESCE(p.purpose, d.purpose),
  dosage      = COALESCE(p.dosage, d.dosage),
  unit        = COALESCE(p.unit, d.unit),
  description = COALESCE(p.description, d.description),
  date_updated = NOW()
FROM (VALUES
  -- Grooming Supplies
  ('Dog Shampoo Oatmeal 500ml', NULL, 'Gentle cleansing shampoo that soothes dry, itchy skin.', NULL, '500 ml bottle', 'Lather on a wet coat, then rinse well. For external use only.'),
  ('Ear Cleaner Solution 100ml', NULL, 'Routine ear cleaning; loosens wax and debris.', NULL, '100 ml bottle', 'For external use only. Ask the vet if the ear is red, swollen or smelly.'),
  ('Flea Shampoo 250ml', NULL, 'Bath shampoo that helps remove and kill fleas.', NULL, '250 ml bottle', 'For external use only. Keep away from eyes and mouth.'),
  ('Grooming Brush Slicker', NULL, 'Removes loose fur, mats and tangles.', NULL, 'piece', NULL),
  ('Nail Clippers Pet', NULL, 'Trims dog and cat nails.', NULL, 'piece', 'Avoid cutting into the quick (the pink part of the nail).'),

  -- Medical & Surgical Supplies
  ('Alcohol 70% 500ml', NULL, 'Antiseptic for disinfecting skin, surfaces and instruments.', '70%', '500 ml bottle', 'Flammable. For external use only.'),
  ('Anesthesia Mask Set', NULL, 'Masks for delivering oxygen or gas anesthesia during procedures.', NULL, 'set', 'Clinic use.'),
  ('Betadine Solution 120ml', 'Betadine', 'Povidone-iodine antiseptic for cleaning wounds and skin.', NULL, '120 ml bottle', 'For external use only.'),
  ('Cotton Rolls (pack)', NULL, 'Absorbent cotton for cleaning and padding wounds.', NULL, 'pack', NULL),
  ('Digital Thermometer Pet', NULL, 'Takes a pet''s body temperature.', NULL, 'piece', 'Clean before and after each use.'),
  ('Gauze Bandage Roll', NULL, 'Wraps and protects wound dressings.', NULL, 'roll', NULL),
  ('Stethoscope Veterinary', NULL, 'Listens to heart and lung sounds during check-ups.', NULL, 'piece', 'Clinic use.'),
  ('Surgical Gloves Medium (box)', NULL, 'Disposable gloves for examinations and procedures.', 'Size medium', 'box', 'Single use.'),
  ('Syringe 5ml (box of 100)', NULL, 'Disposable syringes for injections and oral medicine.', '5 ml', 'box of 100', 'Single use. Dispose of safely.'),

  -- Medicine & Supplements
  ('Advocate Spot-On (Cat)', 'Advocate', 'Monthly spot-on against fleas, ear mites, heartworm and common intestinal worms in cats.', NULL, 'pipette', 'Use only as directed by the veterinarian.'),
  ('Advocate Spot-On (Dog 2-4kg)', 'Advocate', 'Monthly spot-on against fleas, mites, heartworm and common intestinal worms in dogs.', 'For dogs 2-4 kg', 'pipette', 'Use only as directed by the veterinarian.'),
  ('Amoxicillin 250mg (Vet)', NULL, 'Antibiotic for bacterial infections.', '250 mg', NULL, 'Prescription medicine. Use only as directed by the veterinarian and finish the full course.'),
  ('Antibacterial Skin Ointment', NULL, 'Helps prevent infection in minor cuts, scrapes and skin irritation.', NULL, 'tube', 'For external use only. Ask the vet if it does not improve.'),
  ('Bravecto Spot-On (Cat)', 'Bravecto', 'Long-lasting flea and tick protection for cats.', NULL, 'pipette', 'Use only as directed by the veterinarian.'),
  ('Bravecto Tablet (Dog, All Sizes)', 'Bravecto', 'Long-lasting flea and tick protection for dogs.', 'Sized by the dog''s weight', 'chewable tablet', 'Use only as directed by the veterinarian.'),
  ('Nexgard Tablet (Dog)', 'NexGard', 'Monthly chewable that kills fleas and ticks on dogs.', 'Sized by the dog''s weight', 'chewable tablet', 'Use only as directed by the veterinarian.'),
  ('Pet Multivitamin Syrup 100ml', NULL, 'Daily vitamin and mineral supplement.', NULL, '100 ml bottle', 'Follow the label or the vet''s advice for the amount.'),
  ('Tick Collar Large Dog', NULL, 'Wearable collar that repels ticks and fleas.', 'For large dogs', 'collar', 'Replace as recommended on the package.'),
  ('Vitamin B Complex Injectable', NULL, 'Vitamin B supplement given by injection to support appetite and recovery.', NULL, 'injectable vial', 'Given by the veterinarian only.'),

  -- Pet Accessories
  ('Automatic Water Dispenser', NULL, 'Keeps a steady supply of fresh drinking water.', NULL, 'piece', NULL),
  ('Cat Carrier Backpack', NULL, 'Carries a cat safely on trips and vet visits.', NULL, 'piece', NULL),
  ('Cat Harness Set', NULL, 'Harness and leash for walking a cat safely.', NULL, 'set', NULL),
  ('Cat Litter Clumping 10L', NULL, 'Clumping litter that makes cleaning the litter box easy.', NULL, '10 L bag', NULL),
  ('Cat Scratching Post', NULL, 'Gives cats a place to scratch, sparing furniture.', NULL, 'piece', NULL),
  ('Dog Bed Medium', NULL, 'Comfortable bed for medium-size dogs.', 'Medium', 'piece', NULL),
  ('Dog Collar Adjustable M', NULL, 'Adjustable everyday collar.', 'Size M', 'piece', NULL),
  ('Nylabone Chew Toy Medium', 'Nylabone', 'Durable chew toy that satisfies chewing.', 'Medium', 'piece', 'Replace when worn down.'),
  ('Pet Carrier Small', NULL, 'Carrier for small pets for travel and vet visits.', 'Small', 'piece', NULL),
  ('Pet Feeding Bowl Stainless', NULL, 'Food or water bowl that is easy to clean.', NULL, 'piece', NULL),
  ('Puppy Training Pads 30pk', NULL, 'Absorbent pads for potty training.', NULL, 'pack of 30', NULL),

  -- Pet Food
  ('Cat Treats Salmon Flavor', NULL, 'Salmon-flavored treats for cats.', NULL, 'pack', 'Treats only; not a complete meal.'),
  ('Dog Treats Dental Chew 500g', NULL, 'Chew treats that help reduce plaque and tartar.', NULL, '500 g pack', 'Treats only; not a complete meal.'),
  ('Pedigree Adult Dry Dog Food 3kg', 'Pedigree', 'Complete dry food for adult dogs.', NULL, '3 kg bag', NULL),
  ('Purina Pro Plan Puppy 3kg', 'Purina Pro Plan', 'Complete dry food for growing puppies.', NULL, '3 kg bag', NULL),
  ('Royal Canin Kitten Formula 2kg', 'Royal Canin', 'Complete dry food for growing kittens.', NULL, '2 kg bag', NULL),
  ('Whiskas Cat Food Pouch 85g', 'Whiskas', 'Wet food for adult cats.', NULL, '85 g pouch', NULL),

  -- Vaccines
  ('5-in-1 Vaccine Dog', NULL, 'Core combination vaccine for dogs (including distemper, hepatitis, parvovirus and parainfluenza).', '1 dose', 'single-dose vial', 'Given by the veterinarian only.'),
  ('Feline 3-in-1 Vaccine', NULL, 'Core vaccine for cats against feline rhinotracheitis, calicivirus and panleukopenia.', '1 dose', 'single-dose vial', 'Given by the veterinarian only.'),
  ('Rabies Vaccine 1ml', NULL, 'Rabies vaccine for dogs and cats.', '1 ml', 'single-dose vial', 'Given by the veterinarian only.')
) AS d(product_name, brand, purpose, dosage, unit, description)
WHERE p.product_name = d.product_name;

COMMIT;
