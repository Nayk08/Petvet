import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool, types } = pkg;

// A SQL DATE column has no time-of-day or timezone — pg's default parser
// converts it to a JS Date at local midnight, which Express then
// serializes via toISOString() (always UTC), silently shifting the date
// back a day for any positive UTC offset. Keep it as the raw "YYYY-MM-DD"
// string instead; every consumer either uses it as-is or re-parses it.
types.setTypeParser(types.builtins.DATE, (value) => value);
types.setTypeParser(types.builtins.TIMESTAMP, (value) => value);
// Without these, a stuck query or an exhausted pool waits forever with no
// error — which is indistinguishable from the app just "freezing" (the
// symptom reported: buttons that stop responding, no console error, only a
// hard refresh recovers). These put a hard ceiling on both cases so a stuck
// request fails visibly instead of hanging silently:
//   - connectionTimeoutMillis: if every pooled connection is checked out
//     (e.g. leaked by a bug, or just genuine contention), pool.connect()
//     rejects after this instead of waiting indefinitely for one to free up.
//   - statement_timeout / query_timeout: Postgres itself cancels any single
//     query running longer than this, so a lock wait or a runaway query
//     can't hold a connection (and whatever it's blocking) forever.
//   - idleTimeoutMillis: connections sitting unused in the pool are closed
//     and pruned instead of accumulating.
const poolConfig = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  query_timeout: 10000,
};

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        ...poolConfig,
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        ...poolConfig,
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: process.env.DB_PORT,
      },
);

// A connection sitting idle in the pool can still error out (e.g. the
// database or a proxy in between drops it) — without this handler, that
// error is unhandled and can crash the whole Node process.
pool.on("error", (err) => {
  console.error("Unexpected error on idle PG client:", err);
});

export default pool;
