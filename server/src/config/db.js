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

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: process.env.DB_PORT,
      },
);

export default pool;
