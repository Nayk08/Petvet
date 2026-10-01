import nodemailer from "nodemailer";

// All optional on purpose — this app should run fine with no SMTP
// configured at all (e.g. a fresh clone, or a dev box nobody's wired up
// email on yet); sendMail() below just logs and no-ops instead of crashing
// whatever action triggered it.
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
} = process.env;

const isConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: SMTP_SECURE === "true", // true for port 465, false for 587/STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

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

  if (!isConfigured) {
    console.log(
      `sendMail: SMTP not configured — would have sent "${subject}" to ${to}. ` +
        "Set SMTP_HOST/SMTP_USER/SMTP_PASS (and MAIL_FROM) in .env to enable this.",
    );
    return { sent: false, reason: "not-configured" };
  }

  try {
    await transporter.sendMail({
      from: MAIL_FROM || SMTP_USER,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (error) {
    console.log(`sendMail: failed to send "${subject}" to ${to}:`, error.message);
    return { sent: false, reason: "send-failed", error };
  }
}
