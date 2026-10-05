-- 005: Credit product history with no real author to Norman.
--
-- Older product rows have a blank created/updated/deleted-by, or a
-- placeholder name that isn't a user account ("admin", "test",
-- "System Alignment"), which the Inventory History modal shows as unknown.
-- Every such name becomes Norman. Names of real users are left alone.
--
-- Run once per database (local + Render):
--   psql "$DATABASE_URL" -f server/migrations/005_credit_product_history_to_norman.sql

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tbl_users WHERE user_name = 'Norman') THEN
    RAISE EXCEPTION 'No user named Norman in this database; nothing changed.';
  END IF;
END $$;

-- "Not a real author": blank, or not the name of any user account.
UPDATE tbl_products SET created_by = 'Norman'
WHERE NULLIF(TRIM(created_by), '') IS NULL
   OR created_by NOT IN (SELECT user_name FROM tbl_users);

UPDATE tbl_products SET updated_by = 'Norman'
WHERE date_updated IS NOT NULL
  AND (NULLIF(TRIM(updated_by), '') IS NULL
       OR updated_by NOT IN (SELECT user_name FROM tbl_users));

UPDATE tbl_products SET deleted_by = 'Norman'
WHERE is_deleted = true
  AND (NULLIF(TRIM(deleted_by), '') IS NULL
       OR deleted_by NOT IN (SELECT user_name FROM tbl_users));

COMMIT;
