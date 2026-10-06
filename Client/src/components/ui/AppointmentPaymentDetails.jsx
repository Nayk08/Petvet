// What an appointment bill was for and who was involved — shown on the staff
// Payment Details window and the client portal's payment details.
// `appt`: { appointment_date, start_time, end_time, pets_name, service_name,
// category_name, staff_name, staff_role, client_name? }
// `payment`: { payment_status_name, created_by, updated_by }

// "YYYY-MM-DD HH:mm:ss" clinic wall-clock → "9:30 AM" without timezone shifts.
function clock(value) {
  if (!value) return "";
  const [h, m] = String(value).replace("T", " ").split(" ")[1].split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function day(value) {
  if (!value) return "";
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Groomer / Veterinarian label for whoever did the service.
function staffLabel(role) {
  if (/vet/i.test(role ?? "")) return "Veterinarian";
  if (/groom/i.test(role ?? "")) return "Groomer";
  return "Staff";
}

export default function AppointmentPaymentDetails({ appt, payment, showClient = false }) {
  if (!appt) return null;
  // Who took the money: completing (or verifying a deposit) is the bill's last update.
  const paid = ["Completed", "Partially Paid"].includes(payment?.payment_status_name);
  const cashier = paid ? (payment.updated_by ?? payment.created_by) : null;

  const rows = [
    showClient && ["Client", appt.client_name],
    ["Pet", appt.pets_name],
    ["Date", day(appt.appointment_date)],
    ["Time", appt.start_time && `${clock(appt.start_time)} – ${clock(appt.end_time)}`],
    ["Service type", appt.category_name], // Grooming / Consultation / Operation
    ["Procedure", appt.service_name],
    [
      staffLabel(appt.staff_role),
      appt.staff_name && `${appt.staff_name}${appt.staff_role ? ` (${appt.staff_role})` : ""}`,
    ],
    ["Cashier", cashier],
  ].filter((r) => r && r[1]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 divide-y divide-slate-200 dark:divide-slate-800">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 px-3.5 py-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">{label}</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">{value}</span>
        </div>
      ))}
    </div>
  );
}
