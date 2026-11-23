import { Fragment } from "react";
import { formatDate, formatDateTime } from "@/utils/COLUMNS";
import petvetLogo from "@/assets/petvet_icon.svg";

const fmt = (n) =>
  `₱${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

// Same parsing as the Appointments table's TIME column → "01:30 PM".
const formatClock = (v) => {
  const d = new Date(v);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

function Section({ title, children }) {
  return (
    <div className="space-y-0.5 mb-3 pb-3 border-b border-dashed border-slate-300">
      {title && (
        <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">{title}</p>
      )}
      {children}
    </div>
  );
}

// Skips the row entirely when there's no value, so missing data doesn't
// print a column of dashes.
function Row({ label, value, bold }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`text-right wrap-break-word min-w-0 ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

// Pure presentational — takes exactly what fetchPaymentById returns (plus
// an optional appointment row for an APT-linked payment) and renders a
// printable receipt. Reused by both ReceiptModal.jsx (the Payment module's
// "Print Receipt" action, fetched on demand) and CartModal.jsx (shown
// immediately after a checkout completes), so the two never drift apart.
// visits: for a group booking (several appointments paid together, one
// control number), every appointment's row from fetchBookingGroup — the
// receipt then lists each visit and its own service line. `payment` must
// already hold the group's summed amounts (see ReceiptModal).
export default function ReceiptContent({ payment, appointment, visits }) {
  if (!payment) return null;

  const items = payment.items ?? [];
  const isAppointment = Boolean(payment.appointment_id);
  const isGroup = isAppointment && visits?.length > 1;
  const isPartiallyPaid = payment.payment_status_name === "Partially Paid";

  return (
    <div
      data-receipt-print
      className="bg-white dark:bg-white text-slate-900 p-6 font-mono text-xs w-full max-w-[320px] mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-3 pb-3 border-b border-dashed border-slate-300">
        <img src={petvetLogo} alt="" className="h-9 w-9 mb-1" />
        <p className="font-bold text-sm tracking-wide">PETVET CLINIC</p>
        <p className="text-slate-500">Veterinary Care & Pet Supplies</p>
        <p className="font-semibold mt-2">OFFICIAL RECEIPT</p>
      </div>

      {/* Meta */}
      <Section>
        <Row label="Control No." value={payment.control_number} bold />
        <Row label="Type" value={isAppointment ? "Clinic Service" : "Product Sale"} />
        <Row label="Issued" value={formatDateTime(payment.date_created)} />
        {/* Receipts are for completed payments: the paid-at time and the
            cashier who took it, not when/who created the invoice. */}
        <Row label="Paid" value={formatDateTime(payment.date_updated ?? payment.date_created)} />
        <Row label="Prepared By" value={payment.created_by} />
        <Row label="Cashier" value={payment.updated_by ?? payment.created_by} />
        <Row label="Status" value={payment.payment_status_name} />
      </Section>

      {/* Client & visit details (appointment bills only) */}
      {isAppointment && (
        <Section title="Client">
          <Row label="Name" value={appointment?.client_name} />
          <Row label="Mobile" value={appointment?.mobile_no} />
          <Row label="Email" value={appointment?.email} />
        </Section>
      )}
      {isGroup &&
        visits.map((v, i) => (
          <Section key={v.appointment_id} title={`Visit ${i + 1} of ${visits.length}`}>
            <Row label="Appointment No." value={`#${v.appointment_id}`} />
            <Row label="Pet" value={v.pets_name} />
            <Row label="Service" value={v.service_name} />
            <Row label="Attending Staff" value={v.staff_name} />
            <Row label="Visit Date" value={v.appointment_date && formatDate(v.appointment_date)} />
            <Row
              label="Time"
              value={
                v.start_time &&
                `${formatClock(v.start_time)}${v.end_time ? ` – ${formatClock(v.end_time)}` : ""}`
              }
            />
            <Row label="Visit Status" value={v.appointment_status_name} />
          </Section>
        ))}
      {isAppointment && !isGroup && (
        <Section title="Visit">
          <Row label="Appointment No." value={appointment?.appointment_id && `#${appointment.appointment_id}`} />
          <Row label="Pet" value={appointment?.pets_name} />
          <Row label="Category" value={appointment?.category_name} />
          <Row label="Service" value={appointment?.service_name} />
          <Row
            label="Attending Staff"
            value={
              appointment?.staff_name &&
              `${appointment.staff_name}${appointment.staff_role ? ` (${appointment.staff_role})` : ""}`
            }
          />
          <Row
            label="Visit Date"
            value={appointment?.appointment_date && formatDate(appointment.appointment_date)}
          />
          <Row
            label="Time"
            value={
              appointment?.start_time &&
              `${formatClock(appointment.start_time)}${appointment.end_time ? ` – ${formatClock(appointment.end_time)}` : ""}`
            }
          />
          <Row label="Visit Status" value={appointment?.appointment_status_name} />
        </Section>
      )}

      {/* Itemized: services and products purchased, each with its amount */}
      <div className="mb-3 pb-3 border-b border-dashed border-slate-300">
        {!isAppointment && items.length === 0 ? (
          <p className="text-slate-400 italic text-center py-1">No items</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left font-normal pb-1">Item</th>
                <th className="text-center font-normal pb-1">Qty</th>
                <th className="text-right font-normal pb-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {isGroup &&
                visits.map((v) => (
                  <Fragment key={v.appointment_id}>
                    <tr>
                      <td className="py-0.5 pr-1">
                        {v.service_name ?? "Service"}
                        <span className="block text-[10px] text-slate-500">
                          {v.pets_name} · #{v.appointment_id}
                        </span>
                      </td>
                      <td className="py-0.5 text-center align-top">1</td>
                      <td className="py-0.5 text-right align-top">
                        {fmt(
                          Number(v.original_total ?? v.total_amount) -
                            Number(v.additional_fee_amount ?? 0),
                        )}
                      </td>
                    </tr>
                    {v.additional_fee_label && (
                      <tr>
                        <td className="py-0.5 pr-1">{v.additional_fee_label}</td>
                        <td className="py-0.5 text-center">1</td>
                        <td className="py-0.5 text-right">{fmt(v.additional_fee_amount)}</td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              {isAppointment && !isGroup && (
                <>
                  {items.length > 0 && (
                    <tr>
                      <td colSpan={3} className="pt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                        Service
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-0.5 pr-1">
                      {appointment?.service_name ?? "Service"}
                      {appointment?.category_name && (
                        <span className="block text-[10px] text-slate-500">
                          {appointment.category_name}
                        </span>
                      )}
                    </td>
                    <td className="py-0.5 text-center align-top">1</td>
                    <td className="py-0.5 text-right align-top">
                      {/* Bill total minus the add-on fee and any products;
                          a no-show's total is the kept deposit, so use the
                          original bill for the service line. */}
                      {fmt(
                        Number(payment.original_total ?? payment.total_amount) -
                          Number(payment.additional_fee_amount ?? 0) -
                          items.reduce((s, i) => s + Number(i.subtotal ?? i.item_price ?? 0), 0),
                      )}
                    </td>
                  </tr>
                  {payment.additional_fee_label && (
                    <tr>
                      <td className="py-0.5 pr-1">{payment.additional_fee_label}</td>
                      <td className="py-0.5 text-center">1</td>
                      <td className="py-0.5 text-right">
                        {fmt(payment.additional_fee_amount)}
                      </td>
                    </tr>
                  )}
                  {items.length > 0 && (
                    <tr>
                      <td colSpan={3} className="pt-1.5 text-[10px] uppercase tracking-wide text-slate-400">
                        Products
                      </td>
                    </tr>
                  )}
                </>
              )}
              {items.map((item) => (
                <tr key={item.cart_item_id ?? item.product_id}>
                  <td className="py-0.5 pr-1">
                    {item.product_name}
                    {Number(item.quantity) > 1 && item.item_price != null && (
                      <span className="block text-[10px] text-slate-500">
                        @ {fmt(item.item_price)}
                      </span>
                    )}
                  </td>
                  <td className="py-0.5 text-center align-top">{item.quantity}</td>
                  <td className="py-0.5 text-right align-top">
                    {fmt(item.subtotal ?? item.item_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {items.length > 0 && (
          <div className="flex justify-between mt-1.5 pt-1.5 border-t border-dotted border-slate-300 text-slate-500">
            <span>
              {items.length} item{items.length === 1 ? "" : "s"} ·{" "}
              {items.reduce((s, i) => s + Number(i.quantity ?? 0), 0)} pcs
            </span>
            <span>
              {fmt(items.reduce((s, i) => s + Number(i.subtotal ?? i.item_price ?? 0), 0))}
            </span>
          </div>
        )}
      </div>

      {/* Payment breakdown */}
      <div className="space-y-0.5 mb-3">
        <div className="flex justify-between">
          <span className="text-slate-500">Payment Method</span>
          <span>{payment.payment_method ?? "—"}</span>
        </div>
        {payment.amount_sent != null &&
        Number(payment.amount_sent) < Number(payment.total_amount) ? (
          // Online deposit + balance paid at the clinic: show both payments.
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">Deposit (GCash, online)</span>
              <span>{fmt(payment.amount_sent)}</span>
            </div>
            {payment.gcash_reference_number && (
              <div className="flex justify-between">
                <span className="text-slate-500">Deposit Ref.</span>
                <span>{payment.gcash_reference_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">
                {isPartiallyPaid
                  ? "Balance due at the clinic"
                  : `Balance (${payment.balance_gcash_reference ? "GCash" : "Cash"}, at clinic)`}
              </span>
              <span>{fmt(Number(payment.total_amount) - Number(payment.amount_sent))}</span>
            </div>
            {payment.balance_gcash_reference && (
              <div className="flex justify-between">
                <span className="text-slate-500">Balance Ref.</span>
                <span>{payment.balance_gcash_reference}</span>
              </div>
            )}
          </>
        ) : payment.payment_method === "Split" ? (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">Cash</span>
              <span>{fmt(payment.cash_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">GCash</span>
              <span>{fmt(payment.gcash_amount)}</span>
            </div>
          </>
        ) : payment.original_total != null ? (
          // No-show: the online deposit was kept; no balance is owed.
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">Deposit kept (no-show)</span>
              <span>{fmt(payment.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Original bill</span>
              <span>{fmt(payment.original_total)}</span>
            </div>
            {payment.gcash_reference_number && (
              <div className="flex justify-between">
                <span className="text-slate-500">GCash Ref.</span>
                <span>{payment.gcash_reference_number}</span>
              </div>
            )}
          </>
        ) : payment.payment_method === "GCash" && payment.gcash_reference_number ? (
          <div className="flex justify-between">
            <span className="text-slate-500">GCash Ref.</span>
            <span>{payment.gcash_reference_number}</span>
          </div>
        ) : null}
      </div>

      <div className="flex justify-between items-center pt-2 border-t-2 border-slate-900 text-sm font-bold">
        <span>TOTAL</span>
        <span>{fmt(payment.total_amount)}</span>
      </div>
      {isPartiallyPaid && (
        // Reservation fee paid online; the rest is paid at the clinic.
        <>
          <div className="flex justify-between items-center text-sm">
            <span>PAID SO FAR</span>
            <span>{fmt(payment.amount_sent)}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold">
            <span>BALANCE DUE</span>
            <span>{fmt(Number(payment.total_amount) - Number(payment.amount_sent))}</span>
          </div>
        </>
      )}

      <div className="text-center text-slate-500 mt-4 pt-3 border-t border-dashed border-slate-300 space-y-0.5">
        <p>Thank you for visiting PetVet!</p>
        <p className="text-[10px]">Keep this receipt for your records.</p>
        <p className="text-[10px]">Printed {formatDateTime(new Date())}</p>
      </div>
    </div>
  );
}
