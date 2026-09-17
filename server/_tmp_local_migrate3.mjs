import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "Project_System_DB",
  password: "120823",
  port: 5432,
});

const statements = [
  `ALTER TABLE tbl_payments ADD COLUMN IF NOT EXISTS cash_amount numeric(10,2)`,
  `ALTER TABLE tbl_payments ADD COLUMN IF NOT EXISTS gcash_amount numeric(10,2)`,
  `UPDATE tbl_payments SET cash_amount = total_amount, gcash_amount = 0 WHERE payment_method = 'Cash' AND cash_amount IS NULL`,
  `CREATE OR REPLACE VIEW public.v_payments AS
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
      p.cash_amount,
      p.gcash_amount,
      CASE WHEN p.appointment_id IS NULL
           THEN 'INV' || EXTRACT(YEAR FROM p.date_created)::int::text || p.payment_id::text
           ELSE 'APT' || EXTRACT(YEAR FROM p.date_created)::int::text || p.payment_id::text
      END AS control_number
     FROM tbl_payments p
       JOIN tbl_payment_status ps ON p.payment_status_id = ps.payment_status_id
       LEFT JOIN tbl_cart_items ci ON ci.payment_id = p.payment_id
    GROUP BY p.payment_id, p.total_amount, ps.payment_status_name, p.created_by, p.updated_by, p.date_created, p.date_updated, p.is_deleted, p.appointment_id, p.payment_method, p.gcash_reference_number, p.cash_amount, p.gcash_amount`,
];

async function run() {
  for (const sql of statements) {
    await pool.query(sql);
    console.log("OK:", sql.trim().split("\n")[0].slice(0, 80));
  }

  const check = await pool.query(`SELECT payment_id, total_amount, payment_method, cash_amount, gcash_amount FROM v_payments ORDER BY payment_id LIMIT 5`);
  console.log("\nSample rows:", check.rows);

  await pool.end();
}

run().catch(async (e) => {
  console.error("FAILED:", e);
  await pool.end();
  process.exit(1);
});
