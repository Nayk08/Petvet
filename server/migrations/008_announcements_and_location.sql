-- 008: Announcements managed by the admin + clinic location for the map.
--   - tbl_announcements: picture, title, caption, shown on the landing page.
--     Seeded with the 4 announcements that used to be hard-coded there;
--     their pictures live in Client/public/announcements/ (served by the site).
--   - tbl_clinic_settings.clinic_address: what the landing page map pins.
--   - "Announcements" sidebar module, Admin full access.
--
-- Run once per database (local + Render):
--   psql "$DATABASE_URL" -f server/migrations/008_announcements_and_location.sql

BEGIN;

CREATE TABLE tbl_announcements (
    announcement_id serial PRIMARY KEY,
    title           varchar(120) NOT NULL,
    caption         text,
    image_url       text,
    is_published    boolean NOT NULL DEFAULT true,
    is_deleted      boolean NOT NULL DEFAULT false,
    created_by      varchar(50),
    date_created    timestamp NOT NULL DEFAULT now(),
    updated_by      varchar(50),
    date_updated    timestamp,
    deleted_by      varchar(50),
    date_deleted    timestamp
);

INSERT INTO tbl_announcements (title, caption, image_url, created_by) VALUES
  ('Weekend Volumes', 'We are experiencing heavy client volumes (30 to 40 daily pets) during weekend afternoons. Please use your client dashboard to reserve slots ahead.', '/announcements/weekend-volumes.jpg', 'System'),
  ('Wednesday Vets Off', 'Reminder: our veterinarians do not hold standard clinic hours on Wednesdays. Emergency treatments must be requested through the client portal.', '/announcements/wednesday-vets-off.jpg', 'System'),
  ('Sunday Grooming Close', 'Grooming is closed on Sundays. Each groomer handles 5 to 10 pets a day, Monday to Saturday.', '/announcements/sunday-grooming.jpg', 'System'),
  ('Supplies & Vitamins', 'Fast-selling pet foods, shampoos and medications are fully restocked.', '/announcements/supplies.jpg', 'System');

ALTER TABLE tbl_clinic_settings ADD COLUMN clinic_address text;
UPDATE tbl_clinic_settings SET clinic_address = 'Commonwealth Avenue, Quezon City'
WHERE clinic_address IS NULL;

INSERT INTO tbl_user_module (module_name, module_code, sort_order, route)
VALUES ('Announcements', 'ANNOUNCEMENTS', 5, 'announcements')
ON CONFLICT (module_code) DO NOTHING;

INSERT INTO tbl_module_access
    (user_level_id, user_module_id, can_view, can_create, can_edit, can_delete, can_export)
SELECT ul.user_level_id, m.user_module_id, true, true, true, true, false
FROM tbl_user_level ul
CROSS JOIN tbl_user_module m
WHERE m.module_code = 'ANNOUNCEMENTS' AND ul.user_level = 'Admin'
  AND NOT EXISTS (
      SELECT 1 FROM tbl_module_access x
      WHERE x.user_level_id = ul.user_level_id AND x.user_module_id = m.user_module_id
  );

COMMIT;
