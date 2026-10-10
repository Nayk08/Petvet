import React, { useState, useEffect, useRef } from "react";
import {
  useNavigate,
  useSubmit,
  useNavigation,
  useActionData,
  useFetcher,
} from "react-router-dom";
import { toast } from "sonner";
import { Minus, Plus, Trash2, ShoppingCart, AlertTriangle, Printer } from "lucide-react";
import ReceiptContent from "@/pages/ServerSide/Payment/Components/ReceiptContent.jsx";
import { Button } from "@/components/ui/button.jsx";
import petVet from "@/assets/petVet/icons8-no-image-80.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import { useCartStore } from "@/stores/useCartStore.js";
import { Input } from "@/components/ui/input.jsx";
import {
  queryClient,
  checkoutOrder,
  completePayment,
  fetchPaymentById,
  deletePayment,
} from "@/api/http.js";
import PaymentMethodPicker from "@/components/ui/PaymentMethodPicker.jsx";
import {
  evaluatePaymentAmount,
  requiresExactAmount,
} from "@/utils/paymentValidation.js";

import QuantityInput from "@/components/ui/QuantityInput.jsx";

export function Component() {
  const navigate = useNavigate();
  const submit = useSubmit();
  const { state } = useNavigation();
  const actionData = useActionData();

  // Handles the "start checkout" step — a non-navigating submission to the
  // same route action, so it goes through useFetcher instead of useSubmit.
  const startFetcher = useFetcher();

  const cartItems = useCartStore((state) => state.cartItems);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const clearCart = useCartStore((state) => state.clearCart);

  const isSubmitting = state === "submitting";
  const isCreatingOrder = startFetcher.state !== "idle";
  const checkoutError = actionData?.error;

  // Secondary Dialog States
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // The authoritative payment created by "start checkout" — its
  // total_amount is what's actually validated/charged, since real batch
  // prices (FEFO-resolved server-side) can differ from the estimate shown
  // on the shopping grid.
  const [payment, setPayment] = useState(null);

  // Set once "confirm" succeeds — holds the fully-resolved payment (fresh
  // from the server, with its real control_number and items) so DIALOG 3
  // can swap from the order-summary form to a printable receipt in place,
  // instead of redirecting away immediately with nothing to show for it.
  const [completedReceipt, setCompletedReceipt] = useState(null);

  // Checkout / payment state — kept locally only for the live "Change"
  // preview before submitting; the action re-validates authoritatively.
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const isSplit = paymentMethod === "Split";
  const [amountPaid, setAmountPaid] = useState("");
  const [splitCashPaid, setSplitCashPaid] = useState("");
  const [splitGcashPaid, setSplitGcashPaid] = useState("");

  // Once the "start" fetcher resolves, either open the confirm modal
  // (success) or surface the error as a toast (failure).
  useEffect(() => {
    if (startFetcher.state !== "idle" || !startFetcher.data) return;

    if (startFetcher.data.payment) {
      setPayment(startFetcher.data.payment);
      setShowCheckout(true);
    } else if (startFetcher.data.error) {
      toast.error("Could not start checkout", {
        description: startFetcher.data.error,
      });
      if (autoCharge) navigate(".."); // nothing else to show here
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startFetcher.state, startFetcher.data]);

  // "confirm" succeeded (a real navigation submission, via useSubmit — not
  // the fetcher above) — swap the checkout dialog over to a receipt instead
  // of navigating away immediately.
  useEffect(() => {
    if (actionData?.success) {
      setCompletedReceipt(actionData.payment);
    }
  }, [actionData]);

  // Opened from the POS order panel's "Charge" button (?charge): go straight
  // to payment — the order panel already shows the items, so the cart list
  // dialog is skipped, and backing out returns to the POS screen.
  const autoCharge = new URLSearchParams(location.search).has("charge");

  const closeModal = () => {
    navigate(autoCharge ? ".." : `..${location.search}`); // Go back to the main items catalog
  };

  // Clamping to [1, product_quantity] lives in the store, so these
  // handlers just forward the intended delta/value straight through.
  const handleUpdateQuantity = (item, delta) => {
    updateQuantity(item.product_name, item.quantity + delta);
  };

  const handleSetQuantity = (item, newQty) => {
    updateQuantity(item.product_name, newQty);
  };

  const handleRemoveItem = () => {
    if (!itemToDelete) return;
    removeFromCart(itemToDelete.product_name);
    setItemToDelete(null);
  };

  const handleClearCart = () => {
    clearCart();
    setShowClearConfirm(false);
  };

  const totalItemsCount = cartItems.reduce(
    (acc, item) => acc + item.quantity,
    0,
  );
  // An ESTIMATE only, shown before "start checkout" runs — a product's
  // batches can carry different prices, so this uses each item's cheapest
  // batch price as a lower-bound preview. The real total (payment.total_amount,
  // below) is resolved server-side once checkout actually starts.
  const estimatedSubtotal = cartItems.reduce(
    (acc, item) => acc + Number(item.min_price ?? item.product_price ?? 0) * item.quantity,
    0,
  );
  // Once checkout has started, the server-resolved total is authoritative —
  // FEFO batch splitting can make the real total differ from the estimate.
  const authoritativeTotal = payment
    ? Number(payment.total_amount)
    : estimatedSubtotal;

  const paidNumber = isSplit
    ? (parseFloat(splitCashPaid) || 0) + (parseFloat(splitGcashPaid) || 0)
    : parseFloat(amountPaid);
  const { isValid: hasValidPayment, change } = evaluatePaymentAmount({
    paymentMethod,
    receivedTotal: paidNumber,
    total: authoritativeTotal,
  });

  // Starts checkout via the route action (intent: "start") instead of
  // calling checkoutOrder() directly, so the ["Payments"] query cache
  // gets invalidated from inside the action.
  const handleOpenCheckout = () => {
    // The POS panel can pre-pick the method (?charge&method=GCash).
    const preset = new URLSearchParams(location.search).get("method");
    setPaymentMethod(["Cash", "GCash", "Split"].includes(preset) ? preset : "Cash");
    setAmountPaid("");
    setSplitCashPaid("");
    setSplitGcashPaid("");
    startFetcher.submit({ intent: "start" }, { method: "post" });
  };

  // POS "Charge": start checkout as soon as this opens (once).
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoCharge || autoStarted.current) return;
    autoStarted.current = true;
    if (cartItems.length) handleOpenCheckout();
    else navigate("..");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckoutOpenChange = (open) => {
    if (open) {
      setShowCheckout(true);
      return;
    }
    // Dismissing (backdrop click / Escape) after a completed order means
    // "done looking at the receipt" — nothing left to go back to, so leave
    // the cart screen entirely, same as the old redirect("../") did.
    if (completedReceipt) {
      closeModal();
      return;
    }
    setShowCheckout(false);
    setPaymentMethod("Cash");
    setAmountPaid("");
    setSplitCashPaid("");
    setSplitGcashPaid("");
    // Backing out of an unpaid checkout: cancel the Pending invoice it
    // created (it used to be left behind in Payments forever) but KEEP the
    // cart, so the cashier can adjust quantities and check out again —
    // clearing it here threw away the whole order.
    if (payment?.payment_id) {
      deletePayment(payment.payment_id)
        .then(() => queryClient.invalidateQueries({ queryKey: ["Payments"] }))
        .catch((error) =>
          toast.error("Couldn't cancel the unpaid invoice", {
            description: `${error.message} — cancel it from Payments.`,
          }),
        );
    }
    setPayment(null);
    if (autoCharge) closeModal(); // back to the POS screen, order kept
  };

  // Submits the confirm-order form to the route action (intent: "confirm").
  const handleConfirmOrder = (event) => {
    event.preventDefault();
    if (!hasValidPayment || isSubmitting) return;
    submit(event.currentTarget, { method: "post" });
  };

  return (
    <>
      {/* MAIN CART MODAL */}
      <Dialog open={!autoCharge} onOpenChange={(isOpen) => !isOpen && closeModal()}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-2xl p-0 overflow-hidden shadow-2xl transition-colors">
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-xl font-medium text-slate-950 dark:text-slate-100 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Shopping Cart
              </DialogTitle>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
                >
                  Clear cart
                </button>
              )}
            </div>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"} in
              your cart
            </DialogDescription>
          </DialogHeader>

          {/* Cart Items List */}
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                Your cart is empty
              </div>
            ) : (
              cartItems.map((item) => {
                const atMaxStock =
                  item.product_quantity != null &&
                  item.quantity >= item.product_quantity;
                // Estimate only — a product's batches can carry different
                // prices; the real per-unit price is resolved server-side
                // (FEFO) once checkout starts.
                const estimatedUnitPrice = Number(
                  item.min_price ?? item.product_price ?? 0,
                );

                return (
                  <div
                    key={item.product_name}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="w-12 h-12 shrink-0 overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <img
                        src={item.product_image || petVet}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-cyan-600 dark:text-teal-400 font-bold mt-0.5">
                        ₱{estimatedUnitPrice.toFixed(2)}
                      </p>
                      {atMaxStock && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                          Max stock reached
                        </p>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item, -1)}
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <QuantityInput
                        quantity={item.quantity}
                        maxStock={item.product_quantity}
                        onCommit={(newQty) => handleSetQuantity(item, newQty)}
                        className="w-12 h-8"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item, 1)}
                        disabled={atMaxStock}
                        className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Total per item (estimate) */}
                    <span className="w-16 text-right text-sm font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                      ₱{(estimatedUnitPrice * item.quantity).toFixed(2)}
                    </span>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => setItemToDelete(item)}
                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition p-1 cursor-pointer"
                      aria-label="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Subtotal (estimate) & Actions */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Subtotal (est.)
              </span>
              <span className="text-lg font-bold text-slate-950 dark:text-slate-100">
                ₱{estimatedSubtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={closeModal}
                className="w-1/3 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100"
              >
                Continue Shopping
              </Button>
              <Button
                disabled={cartItems.length === 0 || isCreatingOrder}
                onClick={handleOpenCheckout}
                className="w-2/3 bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {isCreatingOrder ? "Starting checkout..." : "Checkout"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 1: Single Item Delete */}
      <Dialog
        open={Boolean(itemToDelete)}
        onOpenChange={() => setItemToDelete(null)}
      >
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-sm shadow-2xl transition-colors">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-950 dark:text-slate-100">
              Remove Item?
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Are you sure you want to remove{" "}
              <span className="text-cyan-700 dark:text-cyan-400 font-medium">
                {itemToDelete?.product_name}
              </span>{" "}
              from your cart?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setItemToDelete(null)}
              className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveItem}
              className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white border border-red-200 dark:border-red-900/50 transition-all"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Clear Cart Confirmation */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-sm shadow-2xl transition-colors">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
              <AlertTriangle className="w-5 h-5" />
              <DialogTitle className="text-lg font-semibold text-slate-950 dark:text-slate-100">
                Clear entire cart?
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              This will remove all items from your shopping cart.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowClearConfirm(false)}
              className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClearCart}
              className="bg-red-600 text-white hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-500 transition-all"
            >
              Clear Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Checkout Modal — swaps to a receipt once "confirm" succeeds */}
      <Dialog open={showCheckout} onOpenChange={handleCheckoutOpenChange}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-md shadow-2xl transition-colors">
          {completedReceipt ? (
            <>
              <DialogHeader className="print:hidden">
                <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">
                  Order Complete
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400">
                  Here's the receipt for this order.
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[55vh] overflow-y-auto">
                <ReceiptContent payment={completedReceipt} />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4 print:hidden">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100"
                >
                  Done
                </Button>
                <Button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Printer size={15} />
                  Print Receipt
                </Button>
              </DialogFooter>
            </>
          ) : (
          <form onSubmit={handleConfirmOrder}>
            <input type="hidden" name="intent" value="confirm" />
            <input type="hidden" name="payment_id" value={payment?.payment_id ?? ""} />
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">
                Order Summary
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400">
                Review your purchase details before completing payment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 border-y border-slate-200 dark:border-slate-800 max-h-52 overflow-y-auto pr-1">
              {/* The server may have split one product across two batches
                  (soonest expiry first) if one alone didn't cover the
                  quantity — payment.items is the real, resolved breakdown,
                  so this can show more rows than cartItems for the same
                  product name. That's expected, not a display bug. */}
              {(payment?.items ?? []).map((item) => (
                <div
                  key={item.cart_item_id}
                  className="flex justify-between items-center text-sm"
                >
                  <div className="truncate pr-4">
                    <p className="text-slate-800 dark:text-slate-200 truncate">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Qty: {item.quantity} × ₱{Number(item.item_price).toFixed(2)}
                    </p>
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0">
                    ₱{Number(item.subtotal).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center font-bold text-base pt-3">
              <span className="text-slate-700 dark:text-slate-300">Total</span>
              <span className="text-cyan-600 dark:text-cyan-400 text-lg">
                ₱{authoritativeTotal.toFixed(2)}
              </span>
            </div>

            <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />

            {isSplit ? (
              <>
                <div className="flex items-center justify-between gap-4 pt-3">
                  <label
                    htmlFor="amount-paid-cash"
                    className="text-sm text-slate-700 dark:text-slate-300 shrink-0"
                  >
                    Cash received
                  </label>
                  <div className="flex items-center gap-1 w-36">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">
                      ₱
                    </span>
                    <Input
                      id="amount-paid-cash"
                      name="cash_received"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={splitCashPaid}
                      onChange={(e) => setSplitCashPaid(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-right focus-visible:ring-cyan-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 pt-2">
                  <label
                    htmlFor="amount-paid-gcash"
                    className="text-sm text-slate-700 dark:text-slate-300 shrink-0"
                  >
                    GCash received
                  </label>
                  <div className="flex items-center gap-1 w-36">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">
                      ₱
                    </span>
                    <Input
                      id="amount-paid-gcash"
                      name="gcash_received"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={splitGcashPaid}
                      onChange={(e) => setSplitGcashPaid(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-right focus-visible:ring-cyan-500"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-4 pt-3">
                <label
                  htmlFor="amount-paid"
                  className="text-sm text-slate-700 dark:text-slate-300 shrink-0"
                >
                  Amount received
                </label>
                <div className="flex items-center gap-1 w-36">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">
                    ₱
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
                    className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-right focus-visible:ring-cyan-500"
                  />
                </div>
              </div>
            )}

            {!hasValidPayment &&
              (isSplit
                ? splitCashPaid !== "" || splitGcashPaid !== ""
                : amountPaid !== "") && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-right pt-1">
                  {requiresExactAmount(paymentMethod)
                    ? `Amount received must exactly equal ₱${authoritativeTotal.toFixed(2)} — GCash doesn't give change`
                    : `Amount received must be at least ₱${authoritativeTotal.toFixed(2)}`}
                </p>
              )}

            <div className="flex justify-between items-center font-bold text-base pt-3">
              <span className="text-slate-700 dark:text-slate-300">Change</span>
              <span className="text-cyan-600 dark:text-cyan-400 text-lg">
                ₱{change.toFixed(2)}
              </span>
            </div>

            {checkoutError && (
              <p className="text-xs text-red-500 dark:text-red-400 text-right pt-1">
                {checkoutError}
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              {!isSubmitting && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCheckoutOpenChange(false)}
                  className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100"
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                disabled={!hasValidPayment || isSubmitting}
                className="bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Placing order..." : "Confirm Order"}
              </Button>
            </DialogFooter>
          </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────
// Route Action
// ─────────────────────────────
export async function action({ request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "start") {
    const cartItems = useCartStore.getState().cartItems;

    if (cartItems.length === 0) {
      return { error: "Cart is empty." };
    }

    try {
      const payment = await checkoutOrder(cartItems); // saved as Pending
      await queryClient.invalidateQueries({ queryKey: ["Payments"] });
      await queryClient.invalidateQueries({ queryKey: ["TodayPayments"] });
      await queryClient.invalidateQueries({ queryKey: ["TodayRevenueSummary"] });
      return { payment };
    } catch (error) {
      const errorMessage = error.message || "Could not start checkout.";
      toast.error("Could not start checkout", { description: errorMessage });
      return { error: errorMessage };
    }
  }

  // intent === "confirm"
  const paymentId = formData.get("payment_id");
  const payment_method = formData.get("payment_method");
  const gcash_reference_number = formData.get("gcash_reference_number");
  const cash_received = formData.get("cash_received");
  const gcash_received = formData.get("gcash_received");
  const amountPaid = parseFloat(formData.get("amount_paid"));

  if (!paymentId) {
    return { error: "No pending order found. Please reopen checkout." };
  }

  // The authoritative total — fetched fresh rather than recomputed from the
  // client's cart snapshot, since a product's batches can carry different
  // prices and the server already resolved (FEFO) which batch(es) this
  // order actually draws from when "start checkout" ran.
  let total;
  try {
    const pendingPayment = await fetchPaymentById(paymentId);
    total = Number(pendingPayment.total_amount);
  } catch (error) {
    return { error: error.message || "Could not verify order total." };
  }

  const receivedTotal =
    payment_method === "Split"
      ? (parseFloat(cash_received) || 0) + (parseFloat(gcash_received) || 0)
      : amountPaid;

  const { isValid } = evaluatePaymentAmount({
    paymentMethod: payment_method,
    receivedTotal,
    total,
  });
  if (!isValid) {
    return {
      error: requiresExactAmount(payment_method)
        ? `Amount received must exactly equal ₱${total.toFixed(2)} — GCash doesn't give change`
        : `Amount received must be at least ₱${total.toFixed(2)}`,
    };
  }

  try {
    await completePayment(paymentId, {
      payment_method,
      gcash_reference_number,
      cash_received,
      gcash_received,
    });
  } catch (error) {
    const errorMessage = error.message || "Failed to complete checkout.";
    toast.error("Checkout failed", { description: errorMessage });
    return { error: errorMessage };
  }

  const change = receivedTotal - total;

  await queryClient.invalidateQueries({ queryKey: ["inventoryProducts"] });
  await queryClient.invalidateQueries({ queryKey: ["Payments"] });
  await queryClient.invalidateQueries({ queryKey: ["TodayPayments"] });
  await queryClient.invalidateQueries({ queryKey: ["RevenueSummary"] });
  await queryClient.invalidateQueries({ queryKey: ["TodayRevenueSummary"] });
  useCartStore.getState().clearCart();

  toast.success("Order placed", {
    description: `Change due: ₱${change.toFixed(2)}`,
  });

  // FIXED: used to redirect("../") straight back to the catalog — fetching
  // the completed payment fresh (now carrying its real control_number and
  // resolved items) lets the component show a receipt instead of just
  // bouncing the cashier away with nothing to hand the customer.
  let receiptPayment = null;
  try {
    receiptPayment = await fetchPaymentById(paymentId);
  } catch {
    // The order itself already succeeded above — a failed receipt fetch
    // just means no receipt view this time, not a failed checkout.
  }

  return { success: true, payment: receiptPayment };
}
