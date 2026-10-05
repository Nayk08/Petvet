-- 006: Partial (deposit) online payments.
--
-- A client booking online may send at least 50% by GCash; staff verify it
-- and the bill becomes "Partially Paid" (appointment confirmed). The
-- balance is collected at the clinic in cash or GCash, which completes it.
--
--   amount_sent              what the client says they sent with their proof
--                            (verified by staff before it counts)
--   balance_gcash_reference  GCash reference of a balance paid by GCash at
--                            the clinic (the deposit keeps gcash_reference_number)
--   original_total           the bill before a no-show forfeited the deposit
--                            (total_amount then becomes the deposit kept)
--
-- Run once per database (local + Render):
--   psql "$DATABASE_URL" -f server/migrations/006_partial_online_payment.sql

BEGIN;

INSERT INTO tbl_payment_status (payment_status_name)
VALUES ('Partially Paid')
ON CONFLICT (payment_status_name) DO NOTHING;

ALTER TABLE tbl_payments
  ADD COLUMN amount_sent numeric(10,2),
  ADD COLUMN balance_gcash_reference varchar(50),
  ADD COLUMN original_total numeric(10,2);

-- Same definition as 004, with the new columns appended.
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
    p.original_total
   FROM tbl_payments p
     JOIN tbl_payment_status ps ON p.payment_status_id = ps.payment_status_id
     LEFT JOIN tbl_cart_items ci ON ci.payment_id = p.payment_id
  GROUP BY p.payment_id, p.total_amount, ps.payment_status_name, p.created_by, p.updated_by, p.date_created, p.date_updated, p.is_deleted, p.appointment_id, p.payment_method, p.gcash_reference_number, p.cash_amount, p.gcash_amount, p.additional_fee_label, p.additional_fee_amount, p.payment_proof_image, p.deleted_by, p.date_deleted, p.amount_sent, p.balance_gcash_reference, p.original_total;

COMMIT;
