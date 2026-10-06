-- 007: Capstone consult feedback (Oct 5).
--   - Full product details, especially for medicines: brand, purpose
--     (what it's for), dosage/strength, unit/form, description.
--   - A picture per sub-service, shown on the landing page.
--   - The "List of Items" module (cart / point of sale) is renamed "Products".
--
-- Run once per database (local + Render):
--   psql "$DATABASE_URL" -f server/migrations/007_product_details_service_images.sql

BEGIN;

ALTER TABLE tbl_products
  ADD COLUMN brand varchar(100),
  ADD COLUMN purpose text,
  ADD COLUMN dosage varchar(100),
  ADD COLUMN unit varchar(50),
  ADD COLUMN description text;

ALTER TABLE tbl_appointment_services ADD COLUMN service_image text;

UPDATE tbl_user_module SET module_name = 'Products', date_updated = NOW()
WHERE module_code = 'CART';

-- Same definition as before, with the new product details appended.
CREATE OR REPLACE VIEW v_products AS
 SELECT p.product_id,
    p.product_name,
    p.product_image,
    p.product_quantity,
    p.product_price,
    p.product_expiry_date,
    p.product_expiry_date <= CURRENT_TIMESTAMP AS is_expired,
    s.status_name,
    p.created_by,
    p.date_created,
    p.updated_by,
    p.date_updated,
    p.category_id,
    c.category_name,
    p.product_expiry_date IS NOT NULL AND p.product_expiry_date > CURRENT_TIMESTAMP AND p.product_expiry_date <= (CURRENT_TIMESTAMP + '5 mons'::interval) AS expiring_soon,
    p.brand,
    p.purpose,
    p.dosage,
    p.unit,
    p.description
   FROM tbl_products p
     LEFT JOIN tbl_status s ON s.status_name::text =
        CASE
            WHEN p.product_quantity >= 101 THEN 'High Stock'::text
            WHEN p.product_quantity >= 50 AND p.product_quantity <= 100 THEN 'Average Stock'::text
            WHEN p.product_quantity >= 1 AND p.product_quantity <= 49 THEN 'Low Stock'::text
            ELSE 'Out of Stock'::text
        END
     LEFT JOIN tbl_product_categories c ON c.category_id = p.category_id
  WHERE p.is_deleted = false;

COMMIT;
