// The clinic runs on Manila time no matter where the server or database
// runs (Render is UTC). The Philippines has no daylight saving, so Manila
// is always exactly UTC+8 and a fixed offset is correct.
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

// A Manila calendar date (a Date at UTC midnight, as zod's coerce.date()
// produces from "YYYY-MM-DD") plus a Manila wall-clock hour/minute -> the
// real instant, in epoch ms.
export function manilaInstant(civilDate, hour = 0, minute = 0) {
  return (
    Date.UTC(
      civilDate.getUTCFullYear(),
      civilDate.getUTCMonth(),
      civilDate.getUTCDate(),
      hour,
      minute,
    ) - MANILA_OFFSET_MS
  );
}

// A TIMESTAMP-without-time-zone value holding Manila wall-clock time (pg
// returns these as raw "YYYY-MM-DD HH:mm:ss" strings, see config/db.js)
// -> the real instant, in epoch ms.
export function parseManilaTimestamp(value) {
  return Date.parse(`${String(value).replace(" ", "T")}+08:00`);
}
