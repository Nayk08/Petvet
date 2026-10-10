// Plain inline-styled HTML, not Tailwind classes — most email clients
// strip <style> blocks and utility classes entirely, so every rule here
// has to live directly on the element's style attribute to render
// consistently across Gmail/Outlook/etc.
function layout(bodyHtml) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b;">
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="font-size: 20px; font-weight: 800;">Pet<span style="color: #059669;">Vet</span></span>
    </div>
    ${bodyHtml}
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      This is an automated message from PetVet Clinic. Please don't reply directly to this email.
    </p>
  </div>`;
}

function formatVisitDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return String(dateString);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Sent the moment a groomer/veterinarian marks their assigned appointment
// completed (see Appointment_Service.js:completeAppointment).
// Names are typed in by staff/clients — escape them so a name like
// "<a href=...>" can't inject links/markup into the email.
function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

const peso = (n) =>
  `&#8369;${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// "2026-10-15 16:30:00" -> "4:30 PM". Plain string parsing: these are Manila
// wall-clock times and the server may run in UTC.
function formatClock(timestamp) {
  const [h, m] = String(timestamp ?? "").split(" ")[1]?.split(":").map(Number) ?? [];
  if (Number.isNaN(h) || h == null) return "";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// "2026-10-15" -> "Thursday, October 15, 2026" (read as a calendar date, no timezone shift)
function formatBookingDate(dateString) {
  const [y, mo, d] = String(dateString ?? "").slice(0, 10).split("-").map(Number);
  if (!y || !mo || !d) return String(dateString ?? "");
  return new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Sent right after a client books in the portal (ClientPortal_Service.js):
// every appointment in the booking (one, or several booked together) and
// what to pay next. items: [{ appointment, payment }] (rows of v_appointments
// / v_payments); reservationFee: the 50% fee for all of them together.
export function bookingReceiptEmail({ items, reservationFee, holdMinutes }) {
  const e = (v) => escapeHtml(v ?? "");
  const first = items[0].appointment;
  const total = items.reduce((sum, i) => sum + (Number(i.payment?.total_amount) || 0), 0);
  const unpriced = items.some((i) => !(Number(i.payment?.total_amount) > 0));
  const subject = items.length === 1
    ? `Booking received: ${first.pets_name}'s ${first.service_name} on ${formatBookingDate(first.appointment_date)}`
    : `Booking received: ${items.length} appointments starting ${formatBookingDate(first.appointment_date)}`;

  const cell = "padding: 8px 6px; border-top: 1px solid #e2e8f0; vertical-align: top;";
  const rows = items
    .map(({ appointment: a, payment: p }) => `
      <tr>
        <td style="${cell}">
          <strong>${e(a.pets_name)}</strong> &middot; ${e(a.service_name)}<br>
          <span style="color: #64748b;">${formatBookingDate(a.appointment_date)},
          ${formatClock(a.start_time)} &ndash; ${formatClock(a.end_time)}
          ${a.staff_name ? `&middot; ${e(a.staff_name)}` : ""}</span><br>
          <span style="color: #94a3b8; font-size: 11px;">${e(p?.control_number)}</span>
        </td>
        <td style="${cell} text-align: right; font-weight: 600; white-space: nowrap;">
          ${Number(p?.total_amount) > 0 ? peso(p.total_amount) : "At clinic"}
        </td>
      </tr>`)
    .join("");

  const nextStep = total > 0
    ? `To keep ${items.length === 1 ? "this time slot" : "these time slots"}, pay through GCash in
       the PetVet client portal within <strong>${holdMinutes} minutes</strong> of booking: either
       the reservation fee of <strong>${peso(reservationFee)}</strong> (50%) or the full
       <strong>${peso(total)}</strong>${items.length > 1 ? ", in one payment for everything" : ""}.
       Unpaid bookings are cancelled automatically. The reservation fee is non-refundable, and
       any balance is paid at the clinic.`
    : "";
  const clinicNote = unpriced
    ? `${items.length === 1 ? "This service is" : "Items marked \"At clinic\" are"} priced at the
       clinic. The staff will tell you the amount, and you pay when you arrive.`
    : "";

  const html = layout(`
    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px; margin-bottom: 20px; text-align: center;">
      <p style="margin: 0; font-size: 15px; font-weight: 700; color: #047857;">Booking Received</p>
      <p style="margin: 6px 0 0; font-size: 12px; color: #64748b;">
        ${items.length === 1 ? "1 appointment" : `${items.length} appointments`}
      </p>
    </div>

    <p style="font-size: 14px; line-height: 1.6;">Hi ${e(first.client_name) || "there"},</p>
    <p style="font-size: 14px; line-height: 1.6;">Here is the receipt for what you just booked.</p>

    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 20px 0;">
      ${rows}
      <tr>
        <td style="${cell} font-weight: 700;">Total</td>
        <td style="${cell} text-align: right; font-weight: 700;">${peso(total)}${unpriced ? " +" : ""}</td>
      </tr>
    </table>

    ${nextStep ? `<p style="font-size: 14px; line-height: 1.6;">${nextStep}</p>` : ""}
    ${clinicNote ? `<p style="font-size: 14px; line-height: 1.6;">${clinicNote}</p>` : ""}
    <p style="font-size: 13px; line-height: 1.6; color: #64748b;">
      Please arrive a few minutes early. You can see all your bookings under
      My Appointments in the client portal.
    </p>
  `);

  return { subject, html };
}

export function appointmentCompletedEmail(raw) {
  const { appointment_date } = raw;
  const [client_name, pets_name, service_name, staff_name] = [
    raw.client_name,
    raw.pets_name,
    raw.service_name,
    raw.staff_name,
  ].map((v) => (v ? escapeHtml(v) : v));
  const subject = `${raw.pets_name}'s ${raw.service_name} is complete!`; // plain text, not HTML

  const html = layout(`
    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px; margin-bottom: 20px; text-align: center;">
      <p style="margin: 0; font-size: 15px; font-weight: 700; color: #047857;">
        &#10003; Service Completed
      </p>
    </div>

    <p style="font-size: 14px; line-height: 1.6;">
      Hi ${client_name || "there"},
    </p>
    <p style="font-size: 14px; line-height: 1.6;">
      We're happy to let you know that <strong>${pets_name}</strong>'s
      <strong>${service_name}</strong> appointment has just been completed
      by ${staff_name || "our team"}.
    </p>

    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 20px 0;">
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Pet</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${pets_name}</td>
      </tr>
      <tr style="border-top: 1px solid #e2e8f0;">
        <td style="padding: 8px 0; color: #64748b;">Service</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${service_name}</td>
      </tr>
      <tr style="border-top: 1px solid #e2e8f0;">
        <td style="padding: 8px 0; color: #64748b;">Visit Date</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formatVisitDate(appointment_date)}</td>
      </tr>
      <tr style="border-top: 1px solid #e2e8f0;">
        <td style="padding: 8px 0; color: #64748b;">Handled By</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${staff_name || "—"}</td>
      </tr>
    </table>

    <p style="font-size: 14px; line-height: 1.6;">
      Thank you for trusting us with ${pets_name}'s care — we hope to see
      you again soon!
    </p>
  `);

  return { subject, html };
}
