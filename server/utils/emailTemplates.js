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
export function appointmentCompletedEmail({
  client_name,
  pets_name,
  service_name,
  staff_name,
  appointment_date,
}) {
  const subject = `${pets_name}'s ${service_name} is complete!`;

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
