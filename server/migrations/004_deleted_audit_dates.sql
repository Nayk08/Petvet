-- 004: Record WHEN a product or payment was deleted (who was already stored
-- in deleted_by), for the Inventory History modal and the Payment view modal.
--
-- Run once per database (local + Render):
--   psql "$DATABASE_URL" -f server/migrations/004_deleted_audit_dates.sql

BEGIN;

ALTER TABLE tbl_products ADD COLUMN date_deleted timestamp;
ALTER TABLE tbl_payments ADD COLUMN date_deleted timestamp;

-- Rows deleted before this column existed: deleting was their last update,
-- so date_updated is the best record of when it happened.
UPDATE tbl_products SET date_deleted = date_updated WHERE is_deleted = true;
UPDATE tbl_payments SET date_deleted = date_updated WHERE is_deleted = true;

-- Same definition as 002, with deleted_by + date_deleted appended
-- (CREATE OR REPLACE VIEW can only add columns at the end).
CREATE OR REPLACE VIEW v_payments AS
 SELECT p.payment_id,
    p.total_amount,
    ps.payment_status_name,
    p.created_by,
    p.updated_by,
    p.date_created,
    p.date_updated,
    count(ci.cart_item_id) AS item_count,
    COALESCE(sum(ci.quantity), 0::bigint) AS total_quantity,
    COALESCE(sum(ci.subtotal), 0::numeric) AS computed_total,
    p.is_deleted,
    p.appointment_id,
    p.payment_method,
    p.gcash_reference_number,
        CASE
            WHEN p.appointment_id IS NULL THEN ('INV'::text || EXTRACT(year FROM p.date_created)::integer::text) || p.payment_id::text
            ELSE ('APT'::text || EXTRACT(year FROM p.date_created)::integer::text) || p.payment_id::text
        END AS control_number,
    p.cash_amount,
    p.gcash_amount,
    p.additional_fee_label,
    p.additional_fee_amount,
    p.payment_proof_image,
    p.deleted_by,
    p.date_deleted
   FROM tbl_payments p
     JOIN tbl_payment_status ps ON p.payment_status_id = ps.payment_status_id
     LEFT JOIN tbl_cart_items ci ON ci.payment_id = p.payment_id
  GROUP BY p.payment_id, p.total_amount, ps.payment_status_name, p.created_by, p.updated_by, p.date_created, p.date_updated, p.is_deleted, p.appointment_id, p.payment_method, p.gcash_reference_number, p.cash_amount, p.gcash_amount, p.additional_fee_label, p.additional_fee_amount, p.payment_proof_image, p.deleted_by, p.date_deleted;

COMMIT;
