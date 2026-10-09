// Status chips above a payment list: one per payment status with its count
// (from the list response's status_counts). Clicking one filters the list
// to that status and explains what the status means.
const STATUS_DESCRIPTIONS = {
  Pending:
    "A bill with nothing paid yet. Staff collect it at the clinic. An unpaid online booking is cancelled automatically after 10 minutes.",
  "Awaiting Verification":
    "The client paid online through GCash. Check the reference number and proof, then verify or reject it.",
  "Partially Paid":
    "The online reservation fee (50%) is verified. The balance is paid at the clinic; if it isn't paid by the end of the appointment, it becomes a No Show and the non-refundable fee is kept.",
  Completed: "Fully paid. Counted in revenue.",
  Cancelled:
    "Voided: the appointment was cancelled, the unpaid online booking expired, or the payment was refunded.",
  "Refund Needed":
    "The client already paid, but the appointment was cancelled. Return the money, then use Mark Refunded.",
};

const chip = (active) =>
  `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
    active
      ? "bg-indigo-600 text-white border-indigo-600"
      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-500/60"
  }`;

export default function PaymentStatusChips({ counts = [], filters, onFiltersChange }) {
  const selected = filters.payment_status_name ?? [];
  const active = selected.length === 1 ? selected[0] : "All";
  const total = counts.reduce((sum, c) => sum + c.count, 0);

  function pick(name) {
    const { payment_status_name: _drop, ...rest } = filters;
    onFiltersChange(name === "All" ? rest : { ...rest, payment_status_name: [name] });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {[{ payment_status_name: "All", count: total }, ...counts].map(({ payment_status_name: name, count }) => (
          <button
            key={name}
            type="button"
            aria-pressed={active === name}
            onClick={() => pick(name)}
            className={chip(active === name)}
          >
            {name} <span className="opacity-70">({count})</span>
          </button>
        ))}
      </div>
      {active !== "All" && STATUS_DESCRIPTIONS[active] && (
        <p className="text-xs rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-2">
          <span className="font-semibold">{active}:</span> {STATUS_DESCRIPTIONS[active]}
        </p>
      )}
    </div>
  );
}
