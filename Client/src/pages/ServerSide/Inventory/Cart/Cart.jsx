import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  fetchInventory,
  fetchProductCategories,
  checkoutOrder,
  completePayment,
  deletePayment,
  fetchPaymentById,
  queryClient,
} from "@/api/http";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.jsx";
import ReceiptContent from "@/pages/ServerSide/Payment/Components/ReceiptContent.jsx";
import { evaluatePaymentAmount, requiresExactAmount } from "@/utils/paymentValidation.js";
import { Pagination } from "@/components/ui/Pagination";
import petVet from "../../../../assets/petVet/icons8-no-image-80.png";
import { Outlet } from "react-router";
import { Plus, Minus, Search, Trash2, Info, LayoutGrid, List, Printer } from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import ProductDetailsModal from "@/components/ui/ProductDetailsModal.jsx";
import QuantityInput from "@/components/ui/QuantityInput.jsx";

const peso = (n) =>
  `₱${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Unexpired stock only — expired batches can't be sold.
const sellable = (product) => product.sellable_quantity ?? product.product_quantity ?? 0;
const unitPrice = (item) => Number(item.min_price ?? item.product_price ?? 0);

const PAYMENT_METHODS = [
  ["Cash", "Cash"],
  ["GCash", "GCash"],
  ["Split", "Split"],
];

const pill = (active) =>
  `h-9 px-4 rounded-full text-sm font-medium border whitespace-nowrap transition-colors cursor-pointer ${
    active
      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
  }`;

// Brand / dosage as small chips (the product's "attributes").
function AttributeChips({ product, size = "sm" }) {
  const chips = [product.brand, product.dosage || product.unit].filter(Boolean);
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c}
          className={`rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ${
            size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]"
          }`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

// Point-of-sale screen: products on the left; the order AND its payment
// (method, amount received, change) on the right. "Place Order" completes the
// sale and shows the receipt. Grouped by product_name — a product's batches share one
// card; which batch is sold (soonest expiry first) and the exact price are
// resolved server-side at checkout (Payment_Model.js:checkout).
export default function Cart() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [detailsFor, setDetailsFor] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem("pos-view") === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });

  const cartItems = useCartStore((s) => s.cartItems);
  const addToCart = useCartStore((s) => s.addToCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter]);

  function changeView(next) {
    setView(next);
    try {
      localStorage.setItem("pos-view", next);
    } catch {
      // per-browser convenience only
    }
  }

  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: ({ signal }) => fetchProductCategories({ signal }),
    staleTime: 1000 * 60 * 5,
  });

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["inventoryProducts", page, 24, debouncedSearch, categoryFilter],
    queryFn: ({ signal }) =>
      fetchInventory({
        page,
        limit: 24,
        grouped: true,
        search: debouncedSearch,
        filters: { category_name: categoryFilter },
        signal,
      }),
    staleTime: 5000,
    placeholderData: keepPreviousData,
  });

  const inCart = (name) => cartItems.find((i) => i.product_name === name)?.quantity ?? 0;

  function addOne(product) {
    if (inCart(product.product_name) >= sellable(product)) return;
    // The cart clamps quantities to product_quantity — give it the sellable stock.
    addToCart({ ...product, product_quantity: sellable(product) }, 1);
  }

  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  // An estimate (each product's lowest batch price); the server prices the
  // real batches (soonest expiry first) when the order is placed.
  const subtotal = Math.round(cartItems.reduce((sum, i) => sum + unitPrice(i) * i.quantity, 0) * 100) / 100;

  // ── Payment, right in the order panel ──
  const [amountReceived, setAmountReceived] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [gcashReceived, setGcashReceived] = useState("");
  const [gcashReference, setGcashReference] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);
  const [placeError, setPlaceError] = useState(null);
  const [receipt, setReceipt] = useState(null); // completed sale, shown for printing

  const isSplit = paymentMethod === "Split";
  const needsReference = paymentMethod !== "Cash";
  const receivedFor = () =>
    isSplit
      ? (parseFloat(cashReceived) || 0) + (parseFloat(gcashReceived) || 0)
      : parseFloat(amountReceived);
  const { isValid: amountOk, change } = evaluatePaymentAmount({
    paymentMethod,
    receivedTotal: receivedFor(),
    total: subtotal,
  });
  const referenceOk = !needsReference || /^\d{13}$/.test(gcashReference);
  const canPlace = cartItems.length > 0 && amountOk && referenceOk && !isPlacing;

  function resetPayment() {
    setAmountReceived("");
    setCashReceived("");
    setGcashReceived("");
    setGcashReference("");
    setPlaceError(null);
  }

  // Creates the order (server prices the real batches), checks the amount
  // against that exact total, then records the payment. A mismatch or a
  // failure cancels the unpaid invoice, so nothing is left half-done.
  async function placeOrder() {
    setPlaceError(null);
    setIsPlacing(true);
    let payment = null;
    try {
      payment = await checkoutOrder(cartItems);
      const total = Number(payment.total_amount);
      const received = receivedFor();
      const exact = evaluatePaymentAmount({ paymentMethod, receivedTotal: received, total });
      if (!exact.isValid) {
        await deletePayment(payment.payment_id).catch(() => {});
        setPlaceError(
          `The exact total is ${peso(total)} (some batches are priced differently). ${
            requiresExactAmount(paymentMethod) ? "Enter exactly that amount" : "Enter at least that amount"
          } and place the order again.`,
        );
        return;
      }
      await completePayment(payment.payment_id, {
        payment_method: paymentMethod,
        ...(needsReference ? { gcash_reference_number: gcashReference } : {}),
        ...(isSplit ? { cash_received: cashReceived, gcash_received: gcashReceived } : {}),
      });
      payment = { ...payment, completed: true };

      await Promise.all(
        [["inventoryProducts"], ["Payments"], ["TodayPayments"], ["RevenueSummary"], ["TodayRevenueSummary"], ["TodayRevenueTransactions"]].map(
          (queryKey) => queryClient.invalidateQueries({ queryKey }),
        ),
      );
      clearCart();
      resetPayment();
      toast.success("Order placed", {
        description: `Change due: ${peso(Math.max(0, received - total))}`,
      });
      setReceipt(await fetchPaymentById(payment.payment_id).catch(() => null));
    } catch (err) {
      if (payment?.payment_id && !payment.completed) {
        await deletePayment(payment.payment_id).catch(() => {});
      }
      setPlaceError(err.message || "Could not place the order.");
    } finally {
      setIsPlacing(false);
    }
  }

  const priceLabel = (product) =>
    Number(product.min_price) === Number(product.max_price)
      ? peso(product.min_price)
      : `${peso(product.min_price)}+`;

  return (
    <div className={`w-full text-slate-800 dark:text-slate-100 ${cartItems.length ? "pb-24 lg:pb-0" : ""}`}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        {/* ── Products ── */}
        <section className="min-w-0 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name or brand..."
                aria-label="Search products"
                className="w-full h-11 pl-11 pr-4 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm shadow-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex shrink-0 items-center h-11 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
              {[
                ["grid", LayoutGrid, "Grid view"],
                ["list", List, "List view"],
              ].map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => changeView(value)}
                  aria-label={label}
                  aria-pressed={view === value}
                  title={label}
                  className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
                    view === value
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-2 overflow-x-auto min-w-0 flex-1 pb-1" style={{ scrollbarWidth: "thin" }}>
              <button type="button" onClick={() => setCategoryFilter("")} className={pill(!categoryFilter)}>
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.category_id}
                  type="button"
                  onClick={() => setCategoryFilter(c.category_name)}
                  className={pill(categoryFilter === c.category_name)}
                >
                  {c.category_name}
                </button>
              ))}
            </div>
          </div>

          {isPending ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : isError ? (
            <p className="text-rose-600 dark:text-rose-400 text-sm py-8 text-center">
              Failed to load products: {error?.message}
            </p>
          ) : data.rows.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm py-16 text-center">
              No products match your search{categoryFilter ? " in this category" : ""}.
            </p>
          ) : (
            <>
              {view === "grid" ? (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
                  {data.rows.map((product) => {
                    const left = Math.max(0, sellable(product) - inCart(product.product_name));
                    const soldOut = left === 0;
                    return (
                      <article
                        key={product.product_name}
                        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 sm:p-3 flex flex-col gap-2 sm:gap-3 shadow-sm min-w-0"
                      >
                        <div className="relative aspect-square sm:aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <img
                            src={product.product_image ?? petVet}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          <span
                            className={`absolute top-2.5 left-2.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                              soldOut
                                ? "bg-red-600 text-white"
                                : "bg-white/95 text-slate-800 dark:bg-slate-900/95 dark:text-slate-100"
                            }`}
                          >
                            {soldOut ? "Out of stock" : `${left} units`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDetailsFor(product)}
                            aria-label={`Details for ${product.product_name}`}
                            title="Product details"
                            className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-white/95 dark:bg-slate-900/95 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 shadow-sm"
                          >
                            <Info size={14} />
                          </button>
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                            {product.product_name}
                          </h3>
                          <div className="hidden sm:block">
                            <AttributeChips product={product} />
                          </div>
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-2">
                          <span className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white">
                            {priceLabel(product)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => addOne(product)}
                              disabled={soldOut}
                              className="hidden sm:inline-flex items-center h-8 px-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Add to Cart
                            </button>
                            <button
                              type="button"
                              onClick={() => addOne(product)}
                              disabled={soldOut}
                              aria-label={`Add one ${product.product_name}`}
                              className="h-8 w-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <ul className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
                  {data.rows.map((product) => {
                    const left = Math.max(0, sellable(product) - inCart(product.product_name));
                    const soldOut = left === 0;
                    return (
                      <li key={product.product_name} className="flex items-center gap-3 p-3">
                        <img
                          src={product.product_image ?? petVet}
                          alt=""
                          loading="lazy"
                          className="h-14 w-14 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <button
                            type="button"
                            onClick={() => setDetailsFor(product)}
                            className="font-semibold text-left text-slate-900 dark:text-white hover:text-indigo-600 line-clamp-1"
                          >
                            {product.product_name}
                          </button>
                          <AttributeChips product={product} size="xs" />
                        </div>
                        <span
                          className={`hidden sm:block text-xs w-20 text-right ${
                            soldOut ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {soldOut ? "Out of stock" : `${left} units`}
                        </span>
                        <span className="font-bold w-24 text-right">{priceLabel(product)}</span>
                        <button
                          type="button"
                          onClick={() => addOne(product)}
                          disabled={soldOut}
                          aria-label={`Add one ${product.product_name}`}
                          className="h-8 w-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus size={16} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <Pagination
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                total={data.pagination.total}
                limit={data.pagination.limit}
                onPageChange={setPage}
              />
            </>
          )}
        </section>

        {/* ── Order details ── */}
        <aside id="pos-order" className="scroll-mt-20 lg:sticky lg:top-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 flex flex-col gap-4 lg:max-h-[calc(100vh-2rem)]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Order Details</h2>
            <span className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Cart</h3>
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-medium hover:border-red-400 hover:text-red-600"
              >
                Clear Cart
              </button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No items yet. Add products from the left.
            </div>
          ) : (
            <ul className="space-y-3 overflow-y-auto min-h-0 flex-1 pr-1">
              {cartItems.map((item) => (
                <li
                  key={item.product_name}
                  className="relative flex gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5"
                >
                  <img
                    src={item.product_image ?? petVet}
                    alt=""
                    className="h-20 w-20 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1 flex flex-col gap-1">
                    <p className="font-semibold text-sm leading-snug line-clamp-2 pr-6">{item.product_name}</p>
                    <AttributeChips product={item} size="xs" />
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                      <span className="font-bold tabular-nums">{peso(unitPrice(item) * item.quantity)}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            item.quantity <= 1
                              ? removeFromCart(item.product_name)
                              : updateQuantity(item.product_name, item.quantity - 1)
                          }
                          aria-label={`One less ${item.product_name}`}
                          className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Minus size={14} />
                        </button>
                        {/* Type an amount (e.g. 24) instead of pressing + many times. */}
                        <QuantityInput
                          quantity={item.quantity}
                          maxStock={item.product_quantity}
                          onCommit={(qty) => updateQuantity(item.product_name, qty)}
                          label={`Quantity of ${item.product_name}`}
                          className="w-12 h-7 rounded-full"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_name, item.quantity + 1)}
                          disabled={item.quantity >= (item.product_quantity ?? Infinity)}
                          aria-label={`One more ${item.product_name}`}
                          className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product_name)}
                    aria-label={`Remove ${item.product_name}`}
                    className="absolute top-2.5 right-2.5 p-1 rounded text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Payment details */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">Payment Details</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                <span className="tabular-nums text-slate-900 dark:text-slate-100">{peso(subtotal)}</span>
              </div>
              <div className="flex justify-between items-end border-t border-slate-200 dark:border-slate-800 pt-2">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold tabular-nums">{peso(subtotal)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Payment Method</p>
              <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === value}
                    onClick={() => {
                      setPaymentMethod(value);
                      setPlaceError(null);
                    }}
                    className={`h-9 rounded-full border text-sm font-medium transition-colors ${
                      paymentMethod === value
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                        : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amounts received */}
            <div className="space-y-2">
              {isSplit ? (
                [
                  ["pos-cash", "Cash received", cashReceived, setCashReceived],
                  ["pos-gcash", "GCash received", gcashReceived, setGcashReceived],
                ].map(([id, label, value, setValue]) => (
                  <div key={id} className="flex items-center justify-between gap-3">
                    <label htmlFor={id} className="text-sm text-slate-600 dark:text-slate-300">
                      {label}
                    </label>
                    <input
                      id={id}
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-32 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-right text-sm tabular-nums focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="pos-received" className="text-sm text-slate-600 dark:text-slate-300">
                    Amount received
                  </label>
                  <input
                    id="pos-received"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="w-32 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-right text-sm tabular-nums focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
              {needsReference && (
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="pos-ref" className="text-sm text-slate-600 dark:text-slate-300">
                    GCash reference
                  </label>
                  <input
                    id="pos-ref"
                    inputMode="numeric"
                    maxLength={13}
                    placeholder="13 digits"
                    value={gcashReference}
                    onChange={(e) => setGcashReference(e.target.value.replace(/\D/g, "").slice(0, 13))}
                    className="w-40 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-right text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Change</span>
                <span className="text-indigo-700 dark:text-indigo-400 tabular-nums">{peso(change)}</span>
              </div>
              {cartItems.length > 0 && !amountOk && (isSplit ? cashReceived || gcashReceived : amountReceived) && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {requiresExactAmount(paymentMethod)
                    ? `Must be exactly ${peso(subtotal)}, GCash doesn't give change.`
                    : `Must be at least ${peso(subtotal)}.`}
                </p>
              )}
            </div>

            {placeError && (
              <p role="alert" className="text-xs rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-2">
                {placeError}
              </p>
            )}

            <button
              type="button"
              onClick={placeOrder}
              disabled={!canPlace}
              className="w-full h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isPlacing ? "Placing order..." : "Place Order"}
            </button>
          </div>
        </aside>
      </div>

      {detailsFor && (
        <ProductDetailsModal product={detailsFor} onClose={() => setDetailsFor(null)} />
      )}

      {/* Receipt of the sale just placed, ready to print. */}
      <Dialog open={Boolean(receipt)} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="print:hidden">
            <DialogTitle>Order Placed</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {receipt && <ReceiptContent payment={receipt} />}
          </div>
          <DialogFooter className="print:hidden">
            <Button variant="ghost" onClick={() => setReceipt(null)}>
              Done
            </Button>
            <Button onClick={() => window.print()} className="flex items-center gap-1.5">
              <Printer size={15} />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Phones: the order panel is below the products — keep the order in reach. */}
      {cartItems.length > 0 && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
            <p className="text-lg font-bold tabular-nums">{peso(subtotal)}</p>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById("pos-order")?.scrollIntoView({ behavior: "smooth" })}
            className="h-11 px-5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            View order &amp; pay
          </button>
        </div>
      )}
      <Outlet />
    </div>
  );
}
