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
import { Input } from "@/components/ui/input.jsx";
import {
  redirect,
  useNavigate,
  useParams,
  useSubmit,
  useNavigation,
  useActionData,
  useLocation,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { queryClient, fetchPaymentById, completePayment } from "@/api/http";

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

  const [amountPaid, setAmountPaid] = useState("");
  const [change, setChange] = useState(0);
  const [hasValidPayment, setHasValidPayment] = useState(false);

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

  const cartItems = payment?.items ?? [];
  const subtotal = Number(payment?.total_amount ?? 0);

  useEffect(() => {
    if (amountPaid === "") {
      setHasValidPayment(false);
      setChange(0);
      return;
    }
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid < subtotal) {
      setHasValidPayment(false);
      setChange(0);
    } else {
      setHasValidPayment(true);
      setChange(paid - subtotal);
    }
  }, [amountPaid, subtotal]);

  function handleSubmit(event) {
    event.preventDefault();
    submit(event.currentTarget, { method: "post" });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-md shadow-2xl transition-colors">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">
            Order Summary
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Review your purchase details before completing payment.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-6 h-6 border-2 border-cyan-500 dark:border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loading order...
            </p>
          </div>
        ) : isError ? (
          <div className="py-6 text-center text-sm text-rose-500 dark:text-rose-400">
            {error?.message ?? "Failed to load payment"}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="payment_id" value={paymentId ?? ""} />

            <div className="space-y-3 py-2 border-y border-slate-200 dark:border-slate-800 max-h-52 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div
                  key={item.cart_item_id}
                  className="flex justify-between items-center text-sm"
                >
                  <div className="truncate pr-4">
                    <p className="text-slate-800 dark:text-slate-200 truncate">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0">
                    ${(item.item_price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center font-bold text-base pt-3">
              <span className="text-slate-700 dark:text-slate-300">Total</span>
              <span className="text-cyan-700 dark:text-cyan-400 text-lg">
                ${subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 pt-3">
              <label
                htmlFor="amount-paid"
                className="text-sm text-slate-700 dark:text-slate-300 shrink-0"
              >
                Amount received
              </label>
              <div className="flex items-center gap-1 w-36">
                <span className="text-slate-500 dark:text-slate-400 text-sm">
                  $
                </span>
                <Input
                  id="amount-paid"
                  name="amount_paid"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-right focus-visible:ring-cyan-500"
                />
              </div>
            </div>

            {amountPaid !== "" && !hasValidPayment && (
              <p className="text-xs text-amber-500 dark:text-amber-400 text-right pt-1">
                Amount received must be at least ${subtotal.toFixed(2)}
              </p>
            )}

            <div className="flex justify-between items-center font-bold text-base pt-3">
              <span className="text-slate-700 dark:text-slate-300">Change</span>
              <span className="text-cyan-700 dark:text-cyan-400 text-lg">
                ${change.toFixed(2)}
              </span>
            </div>

            {isActionError && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 mt-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 dark:text-red-400 text-xs leading-relaxed">
                <span className="flex-1">{actionError}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              {state !== "submitting" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100"
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                disabled={!hasValidPayment || state === "submitting"}
                className="bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {state === "submitting" ? "Placing order..." : "Confirm Order"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function loader({ params }) {
  return queryClient.fetchQuery({
    queryKey: ["Payment", params.payment_id],
    queryFn: ({ signal }) => fetchPaymentById(params.payment_id, { signal }),
  });
}

export async function action({ params, request }) {
  // Preserve the parent list's query string (e.g. ?page=2&limit=10)
  // so completing the order doesn't bounce the user back to page 1.
  const referrerSearch = new URL(request.url).search;

  try {
    await completePayment(params.payment_id);
  } catch (error) {
    const errorMessage = error.message || "Failed to complete payment.";

    toast.error("Failed to complete payment", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description: errorMessage,
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });

    return { error: errorMessage };
  }

  await queryClient.invalidateQueries({ queryKey: ["Payments"] });

  toast.success("Payment completed", {
    className:
      "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
    description: "The order has been marked as paid.",
    descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
    duration: 2000,
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  });

  return redirect(`../${referrerSearch}`);
}
