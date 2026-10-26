-- 018: Product restock log.
--   Add Quantity only ever updated the batch row in place, so there was no
--   record of past restocks once the next one overwrote date_updated/
--   updated_by. This table logs every restock as its own row so the Add
--   Quantity modal can show a product's full restock history.
--
-- Run once per database (local + Render):
--   psql "$DATABASE_URL" -f server/migrations/018_product_restock_log.sql

BEGIN;

CREATE TABLE IF NOT EXISTS tbl_product_restock_log (
  restock_id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES tbl_products(product_id),
  quantity_added INT NOT NULL,
  product_price NUMERIC(10,2) NOT NULL,
  product_expiry_date DATE,
  created_by VARCHAR(100),
  date_created TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_restock_log_product_id
  ON tbl_product_restock_log(product_id);

COMMIT;
