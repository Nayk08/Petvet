import nodemailer from "nodemailer";

// All optional on purpose — this app should run fine with no email
// configured at all (e.g. a fresh clone, or a dev box nobody's wired up
// email on yet); sendMail() below just logs and no-ops instead of crashing
// whatever action triggered it.
//
// Two ways to send, first one configured wins:
//  1. Brevo's HTTPS API (BREVO_API_KEY). Needed on Render's free plan,
//     which blocks outbound SMTP ports (25/465/587) — an SMTP connection
//     there never errors, it just hangs until the request times out.
//  2. Plain SMTP (SMTP_HOST/SMTP_USER/SMTP_PASS), e.g. Gmail on a dev PC.
const {
  BREVO_API_KEY,
  BREVO_SENDER_EMAIL,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
} = process.env;

// Give up quickly: a stuck mail server must fail the send (so callers can
// show "couldn't send your code") well before the client's 15 s timeout.
const SEND_TIMEOUT_MS = 10_000;

const useBrevo = Boolean(BREVO_API_KEY);
const useSmtp = !useBrevo && Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = useSmtp
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: SMTP_SECURE === "true", // true for port 465, false for 587/STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: SEND_TIMEOUT_MS,
      greetingTimeout: SEND_TIMEOUT_MS,
      socketTimeout: SEND_TIMEOUT_MS,
    })
  : null;

// "PetVet <a@b.com>" or "a@b.com" -> { name, email }
function parseAddress(value) {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value || "");
  return match
    ? { name: match[1] || "PetVet", email: match[2] }
    : { name: "PetVet", email: (value || "").trim() };
}

async function sendWithBrevo({ to, subject, html }) {
  const from = parseAddress(MAIL_FROM);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: from.name, email: BREVO_SENDER_EMAIL || from.email || SMTP_USER },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Brevo ${response.status}: ${detail.slice(0, 300)}`);
  }
}

// Fire-and-forget by design — the caller (e.g. "mark appointment
// completed") already succeeded by the time this runs; a flaky mail
// provider shouldn't turn that into a failed request. Every caller should
// await this (so success/failure gets logged against the right action) but
// never let a rejection here propagate up as the action's own error.
export async function sendMail({ to, subject, html }) {
  if (!to) {
    console.log("sendMail: skipped, no recipient address");
    return { sent: false, reason: "no-recipient" };
  }

  if (!useBrevo && !useSmtp) {
    console.log(
      `sendMail: email not configured — would have sent "${subject}" to ${to}. ` +
        "Set BREVO_API_KEY (or SMTP_HOST/SMTP_USER/SMTP_PASS) to enable this.",
    );
    return { sent: false, reason: "not-configured" };
  }

  try {
    if (useBrevo) {
      await sendWithBrevo({ to, subject, html });
    } else {
      await transporter.sendMail({ from: MAIL_FROM || SMTP_USER, to, subject, html });
    }
    return { sent: true };
  } catch (error) {
    console.log(`sendMail: failed to send "${subject}" to ${to}:`, error.message);
    return { sent: false, reason: "send-failed", error };
  }
}
