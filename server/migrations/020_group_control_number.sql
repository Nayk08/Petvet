-- 020: One control number per group booking.
--   A multi-item booking (migrations/015) keeps one bill per appointment
--   (each visit is completed, cancelled or refunded on its own), but they are
--   paid together, so they now share ONE control number: the group's first
--   bill's (APT{year}{lowest payment_id}). Single bills and cart checkouts
--   are unchanged. Only the views change; no stored data is touched.
--
-- Run once per database (local + Render):
--   psql "$DATABASE_URL" -f server/migrations/020_group_control_number.sql

BEGIN;

CREATE OR REPLACE FUNCTION payment_control_number(
  p_payment_id INT, p_appointment_id INT, p_date_created TIMESTAMPTZ, p_booking_group UUID
) RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN p_appointment_id IS NULL THEN 'INV' ELSE 'APT' END
         || EXTRACT(year FROM p_date_created)::int::text
         || COALESCE(
              (SELECT MIN(g.payment_id) FROM tbl_payments g WHERE g.booking_group = p_booking_group),
              p_payment_id
            )::text
$$;

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
        payment_control_number(p.payment_id, p.appointment_id, p.date_created, p.booking_group) AS control_number,
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

CREATE OR REPLACE VIEW v_revenue AS
 WITH base AS (
         SELECT p.payment_id,
            p.appointment_id,
            p.payment_method,
            p.total_amount,
            p.cash_amount,
            p.gcash_amount,
            p.date_created,
            p.date_updated,
            p.deposit_paid_at,
            ps.payment_status_name,
                CASE
                    WHEN p.deposit_paid_at IS NOT NULL THEN COALESCE(p.amount_sent, 0::numeric)
                    ELSE 0::numeric
                END AS deposit,
                payment_control_number(p.payment_id, p.appointment_id, p.date_created, p.booking_group) AS control_number
           FROM tbl_payments p
             JOIN tbl_payment_status ps ON ps.payment_status_id = p.payment_status_id
          WHERE p.is_deleted = false
        )
 SELECT base.payment_id,
    base.control_number,
    base.appointment_id,
    base.payment_method,
    base.total_amount,
    base.payment_status_name,
    'deposit'::text AS kind,
    base.deposit_paid_at AS received_at,
    base.deposit AS amount,
    0::numeric AS cash,
    base.deposit AS gcash
   FROM base
  WHERE base.deposit_paid_at IS NOT NULL AND base.deposit > 0::numeric AND (base.payment_status_name::text = ANY (ARRAY['Partially Paid'::character varying::text, 'Completed'::character varying::text]))
UNION ALL
 SELECT base.payment_id,
    base.control_number,
    base.appointment_id,
    base.payment_method,
    base.total_amount,
    base.payment_status_name,
    'payment'::text AS kind,
    COALESCE(base.date_updated, base.date_created) AS received_at,
    base.total_amount - base.deposit AS amount,
    COALESCE(base.cash_amount, 0::numeric) AS cash,
    COALESCE(base.gcash_amount, 0::numeric) - base.deposit AS gcash
   FROM base
  WHERE base.payment_status_name::text = 'Completed'::text AND (base.total_amount - base.deposit) > 0::numeric;

COMMIT;
