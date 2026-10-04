import { formatDate } from "@/utils/COLUMNS";
import petvetLogo from "@/assets/petvet_icon.svg";

const fmt = (n) =>
  `₱${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

// Pure presentational — takes exactly what fetchPaymentById returns (plus
// an optional appointment row for an APT-linked payment) and renders a
// printable receipt. Reused by both ReceiptModal.jsx (the Payment module's
// "Print Receipt" action, fetched on demand) and CartModal.jsx (shown
// immediately after a checkout completes), so the two never drift apart.
export default function ReceiptContent({ payment, appointment }) {
  if (!payment) return null;

  const items = payment.items ?? [];
  const isAppointment = Boolean(payment.appointment_id);

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
      <div className="space-y-0.5 mb-3 pb-3 border-b border-dashed border-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-500">Control No.</span>
          <span className="font-semibold">{payment.control_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Date</span>
          {/* Receipts are for completed payments: the paid-at time and the
              cashier who took it, not when/who created the invoice. */}
          <span>{formatDate(payment.date_updated ?? payment.date_created)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Served By</span>
          <span>{payment.updated_by ?? payment.created_by ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Status</span>
          <span>{payment.payment_status_name}</span>
        </div>
      </div>

      {/* Body: cart items OR appointment details */}
      {isAppointment ? (
        <div className="space-y-0.5 mb-3 pb-3 border-b border-dashed border-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-500">Client</span>
            <span className="text-right">{appointment?.client_name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Pet</span>
            <span className="text-right">{appointment?.pets_name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Service</span>
            <span className="text-right">{appointment?.service_name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Staff</span>
            <span className="text-right">{appointment?.staff_name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Visit Date</span>
            <span className="text-right">
              {appointment?.appointment_date
                ? formatDate(appointment.appointment_date)
                : "—"}
            </span>
          </div>
          {payment.additional_fee_label && (
            <div className="flex justify-between">
              <span className="text-slate-500">
                {payment.additional_fee_label}
              </span>
              <span className="text-right">
                {fmt(payment.additional_fee_amount)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3 pb-3 border-b border-dashed border-slate-300">
          {items.length === 0 ? (
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
                {items.map((item) => (
                  <tr key={item.cart_item_id ?? item.product_id}>
                    <td className="py-0.5 pr-1">{item.product_name}</td>
                    <td className="py-0.5 text-center">{item.quantity}</td>
                    <td className="py-0.5 text-right">
                      {fmt(item.subtotal ?? item.item_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payment breakdown */}
      <div className="space-y-0.5 mb-3">
        <div className="flex justify-between">
          <span className="text-slate-500">Payment Method</span>
          <span>{payment.payment_method ?? "—"}</span>
        </div>
        {payment.payment_method === "Split" ? (
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

      <p className="text-center text-slate-500 mt-4 pt-3 border-t border-dashed border-slate-300">
        Thank you for visiting PetVet!
      </p>
    </div>
  );
}
