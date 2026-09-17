import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.jsx";
import {
  redirect,
  useNavigate,
  useParams,
  useSubmit,
  useNavigation,
  useActionData,
  useLocation,
} from "react-router-dom";
import {
  queryClient,
  invalidateAppointmentQueries,
  fetchPaymentById,
  fetchAppointmentById,
  verifyPayment,
} from "@/api/http";

function formatDateLabel(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function Component() {
  const submit = useSubmit();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useNavigation();
  const params = useParams();
  const paymentId = params.payment_id;
  const actionData = useActionData();
  const isActionError = Boolean(actionData?.error);
  const actionError = actionData?.error;
  const isSubmitting = state === "submitting";

  function closeModal() {
    navigate(`..${location.search}`);
  }

  const {
    data: payment,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["Payment", paymentId],
    queryFn: ({ signal }) => fetchPaymentById(paymentId, { signal }),
  });

  const { data: appointment } = useQuery({
    queryKey: ["appointment", payment?.appointment_id],
    queryFn: ({ signal }) =>
      fetchAppointmentById(payment.appointment_id, { signal }),
    enabled: Boolean(payment?.appointment_id),
  });

  function handleDecision(decision) {
    const formData = new FormData();
    formData.append("decision", decision);
    submit(formData, { method: "post" });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify GCash Payment</DialogTitle>
          <DialogDescription>
            Check the reference number against your GCash transaction history
            before approving.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-6 h-6 border-2 border-cyan-500 dark:border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loading payment...
            </p>
          </div>
        ) : isError ? (
          <div className="py-6 text-center text-sm text-rose-500 dark:text-rose-400">
            {error?.message ?? "Failed to load payment"}
          </div>
        ) : (
          <div className="space-y-4">
            {payment.appointment_id && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Client</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {appointment?.client_name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Pet</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {appointment?.pets_name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Service</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {appointment?.service_name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Date</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatDateLabel(appointment?.appointment_date)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">Amount</span>
              <span className="font-bold text-lg text-cyan-700 dark:text-cyan-400">
                ₱{Number(payment.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                Reference Number
              </span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                {payment.gcash_reference_number ?? "—"}
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Submitted Proof
              </p>
              {payment.payment_proof_image ? (
                <img
                  src={payment.payment_proof_image}
                  alt="Payment proof"
                  className="w-full max-h-80 object-contain rounded-lg border border-slate-200 dark:border-slate-800"
                />
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                  No screenshot was uploaded.
                </p>
              )}
            </div>

            {isActionError && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 dark:text-red-400 text-xs leading-relaxed">
                <span className="flex-1">{actionError}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              {!isSubmitting && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Close
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                disabled={isSubmitting}
                onClick={() => handleDecision("reject")}
              >
                {isSubmitting ? "..." : "Reject"}
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision("approve")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {isSubmitting ? "..." : "Approve"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export async function loader({ params }) {
  return queryClient.fetchQuery({
    queryKey: ["Payment", params.payment_id],
    queryFn: ({ signal }) => fetchPaymentById(params.payment_id, { signal }),
  });
}

export async function action({ params, request }) {
  const requestUrl = new URL(request.url);
  const referrerSearch = requestUrl.search;
  const formData = await request.formData();
  const decision = formData.get("decision");

  try {
    await verifyPayment(params.payment_id, decision);
  } catch (error) {
    const errorMessage = error.message || "Failed to verify payment.";

    toast.error("Failed to verify payment", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description: errorMessage,
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });

    return { error: errorMessage };
  }

  // Approve has the exact same downstream effects as completePayment
  // (stock deduction, appointment flip to In Queue, revenue changes) since
  // it reuses that method server-side — invalidate the same query keys
  // PaymentProcessModal.jsx does. Reject only changes the payment's own
  // status, but re-invalidating the same broad set is harmless.
  await queryClient.invalidateQueries({ queryKey: ["Payments"] });
  await queryClient.invalidateQueries({ queryKey: ["TodayPayments"] });
  await queryClient.invalidateQueries({ queryKey: ["RevenueSummary"] });
  await queryClient.invalidateQueries({ queryKey: ["TodayRevenueSummary"] });
  await queryClient.invalidateQueries({ queryKey: ["TodayRevenueTransactions"] });
  await queryClient.invalidateQueries({ queryKey: ["RevenueTransactions"] });
  await queryClient.invalidateQueries({ queryKey: ["appointment"] });
  await queryClient.invalidateQueries({ queryKey: ["TodayAppointments"] });
  await invalidateAppointmentQueries();

  toast.success(
    decision === "approve" ? "Payment verified" : "Payment sent back to Pending",
    {
      className:
        "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description:
        decision === "approve"
          ? "The payment is now marked Completed."
          : "The client can submit a corrected reference/screenshot.",
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2000,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    },
  );

  return redirect(`../${referrerSearch}`);
}
