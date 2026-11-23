import { useQuery } from "@tanstack/react-query";
import { fetchBookingGroup } from "@/api/http";

// A group booking (several appointments paid together, one control number)
// shows as ONE row in the Payments list: its bills in the same status as
// this one (server: Payment_Model getPayments). View and Print Receipt use
// this to cover that same set.
// Returns { visits, bill, isLoading }:
//   visits — the group's bills/appointments in this status (fetchBookingGroup
//            rows), or [] for a single bill
//   bill   — `payment` with the group's amounts summed (or `payment` as is)
export function useGroupBill(payment) {
  const { data: groupRows } = useQuery({
    queryKey: ["booking-group", payment?.booking_group],
    queryFn: ({ signal }) => fetchBookingGroup(payment.booking_group, { signal }),
    enabled: Boolean(payment?.booking_group),
  });

  const inStatus = (groupRows ?? []).filter(
    (r) => r.payment_status_name === payment?.payment_status_name,
  );
  const visits = inStatus.length > 1 ? inStatus : [];

  const sum = (key) =>
    visits.some((v) => v[key] != null)
      ? visits.reduce((s, v) => s + Number(v[key] ?? 0), 0)
      : null;

  const bill = visits.length
    ? {
        ...payment,
        total_amount: sum("total_amount"),
        amount_sent: sum("amount_sent"),
        cash_amount: sum("cash_amount"),
        gcash_amount: sum("gcash_amount"),
        original_total: sum("original_total"),
        // add-on fees belong to individual visits; shown per visit instead
        additional_fee_label: null,
        additional_fee_amount: null,
      }
    : payment;

  return { visits, bill, isLoading: Boolean(payment?.booking_group) && !groupRows };
}
