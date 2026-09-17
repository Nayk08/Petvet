import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

// Without these, a single unhandled promise rejection or thrown error
// ANYWHERE outside Express's own request/response cycle (Express only
// auto-catches rejections it directly awaits from a route handler; a
// detached promise elsewhere is not covered) kills this entire Node
// process with zero trace — since this app is run as plain `node
// server.js` with no process manager to auto-restart it, that looks
// exactly like "the whole site froze": every page's requests start
// failing with connection-refused, with nothing in the browser console
// pointing at a cause. Logging here instead of letting Node terminate
// keeps the server up and, if it happens again, prints the real error.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
