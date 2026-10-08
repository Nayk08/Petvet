-- 010: Count a reservation fee (online deposit) as revenue on the day it is
-- received, not only when the bill is completed.
--
--   tbl_payments.deposit_paid_at  when staff verified the online deposit
--   v_revenue                     one row per money-in event:
--     'deposit' — the verified reservation fee (GCash), on deposit_paid_at,
--                 while the bill is Partially Paid or Completed (a bill
--                 flagged for refund drops out: that money goes back);
--     'payment' — a completed bill, on its completion date; for a bill with
--                 a deposit only the remainder (the balance) counts here, so
--                 nothing is counted twice. A forfeited deposit (no-show)
--                 has no remainder, so it adds nothing again.
--   Revenue cards, transaction lists and the analytics trend all read this.
--
-- Run once per database (local + Render):
--   psql "$DATABASE_URL" -f server/migrations/010_revenue_ledger.sql

BEGIN;

ALTER TABLE tbl_payments ADD COLUMN deposit_paid_at timestamptz;

-- Deposits already verified and still open: verification was their last update.
UPDATE tbl_payments p SET deposit_paid_at = p.date_updated
FROM tbl_payment_status ps
WHERE ps.payment_status_id = p.payment_status_id
  AND ps.payment_status_name = 'Partially Paid'
  AND p.amount_sent IS NOT NULL;

CREATE VIEW v_revenue AS
WITH base AS (
  SELECT p.payment_id, p.appointment_id, p.payment_method, p.total_amount,
         p.cash_amount, p.gcash_amount, p.date_created, p.date_updated,
         p.deposit_paid_at, ps.payment_status_name,
         CASE WHEN p.deposit_paid_at IS NOT NULL THEN COALESCE(p.amount_sent, 0) ELSE 0 END AS deposit,
         CASE WHEN p.appointment_id IS NULL
              THEN 'INV' || EXTRACT(year FROM p.date_created)::int || p.payment_id
              ELSE 'APT' || EXTRACT(year FROM p.date_created)::int || p.payment_id
         END AS control_number
  FROM tbl_payments p
  JOIN tbl_payment_status ps ON ps.payment_status_id = p.payment_status_id
  WHERE p.is_deleted = false
)
SELECT payment_id, control_number, appointment_id, payment_method, total_amount,
       payment_status_name, 'deposit' AS kind, deposit_paid_at AS received_at,
       deposit AS amount, 0::numeric AS cash, deposit AS gcash
FROM base
WHERE deposit_paid_at IS NOT NULL AND deposit > 0
  AND payment_status_name IN ('Partially Paid', 'Completed')
UNION ALL
SELECT payment_id, control_number, appointment_id, payment_method, total_amount,
       payment_status_name, 'payment', COALESCE(date_updated, date_created),
       total_amount - deposit,
       COALESCE(cash_amount, 0),
       COALESCE(gcash_amount, 0) - deposit
FROM base
WHERE payment_status_name = 'Completed' AND total_amount - deposit > 0;

COMMIT;
