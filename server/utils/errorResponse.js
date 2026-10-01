// A single place every controller's catch block routes through, so a raw
// driver/DB/JS error message (constraint names, SQL fragments, stack-trace
// text) never reaches the client — only errors we deliberately threw as
// user-facing (marked with `.status`/`.statusCode` by our own code, e.g.
// "This category already exists" or "Cart is empty") get their `.message`
// shown. Anything else is logged in full server-side and replaced with a
// generic, friendly message. Both property names are accepted since the
// codebase has used either depending on the module (Inventory/Client
// Records/Users use `.status`; Payment/Appointment/Analytics/Dashboard/
// ClientPortal use `.statusCode`).
export function sendError(
  res,
  error,
  fallbackMessage = "Something went wrong. Please try again.",
) {
  const deliberateStatus = error?.status || error?.statusCode;
  const status = deliberateStatus || 500;

  if (!deliberateStatus) {
    console.error(error);
  }

  const message = deliberateStatus ? error.message || fallbackMessage : fallbackMessage;

  return res.status(status).json({ message });
}
