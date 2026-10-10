-- 015: Multi-item bookings ("booking groups").
--
-- One booking can now hold several appointments (several pets, or one pet
-- with several services/times). Each appointment still has its own bill, so
-- completing, cancelling, no-shows, receipts and revenue keep working per
-- visit; the bills of one booking share a booking_group and are paid in a
-- single transaction (one GCash proof online, or one Cash/GCash/Split payment
-- at the counter). NULL = a normal single booking.
--
--   psql "$DATABASE_URL" -f server/migrations/015_booking_groups.sql

BEGIN;

ALTER TABLE tbl_payments ADD COLUMN IF NOT EXISTS booking_group uuid;
CREATE INDEX IF NOT EXISTS idx_payments_booking_group
  ON tbl_payments (booking_group) WHERE booking_group IS NOT NULL;

-- Same view as migration 006, with booking_group appended at the end.
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
    p.date_deleted,
    p.amount_sent,
    p.balance_gcash_reference,
    p.original_total,
    p.booking_group
   FROM tbl_payments p
     JOIN tbl_payment_status ps ON p.payment_status_id = ps.payment_status_id
     LEFT JOIN tbl_cart_items ci ON ci.payment_id = p.payment_id
  GROUP BY p.payment_id, p.total_amount, ps.payment_status_name, p.created_by, p.updated_by, p.date_created, p.date_updated, p.is_deleted, p.appointment_id, p.payment_method, p.gcash_reference_number, p.cash_amount, p.gcash_amount, p.additional_fee_label, p.additional_fee_amount, p.payment_proof_image, p.deleted_by, p.date_deleted, p.amount_sent, p.balance_gcash_reference, p.original_total, p.booking_group;

COMMIT;
