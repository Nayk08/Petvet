import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { fetchInventory, fetchProductCategories } from "@/api/http";
import { Pagination } from "@/components/ui/Pagination";
import petVet from "../../../../assets/petVet/icons8-no-image-80.png";
import { useNavigate, Outlet } from "react-router";
import { Button } from "@/components/ui/button.jsx";
import { Plus, Minus, ShoppingCart, Search } from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export default function Cart() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  // Local quantity selections before hitting "Add to Cart"
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const cartItems = useCartStore((state) => state.cartItems);
  const addToCart = useCartStore((state) => state.addToCart);
  const navigate = useNavigate();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter]);

  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: ({ signal }) => fetchProductCategories({ signal }),
    staleTime: 1000 * 60 * 5,
  });

  // Grouped by product_name — a product can have several batches (same
  // name, different expiry dates) sharing one shelf quantity, and this page
  // shouldn't show them as separate/duplicate tiles. Which real batch(es)
  // actually get sold from (soonest expiry first) is resolved server-side
  // at checkout, not here — see Payment_Model.js:checkout.
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["inventoryProducts", page, limit, debouncedSearch, categoryFilter],
    queryFn: ({ signal }) =>
      fetchInventory({
        page,
        limit,
        grouped: true,
        search: debouncedSearch,
        filters: { category_name: categoryFilter },
        signal,
      }),
    staleTime: 5000,
    placeholderData: keepPreviousData,
  });

  const getSelectedQty = (productName) => selectedQuantities[productName] ?? 1;

  const getCartQty = (productName) => {
    const item = cartItems.find((i) => i.product_name === productName);
    return item ? item.quantity : 0;
  };

  // Local handlers for adjusting quantity on the card — capped by
  // availableStock (raw stock minus whatever's already in the cart)
  const handleIncreaseLocalQty = (product, availableStock) => {
    setSelectedQuantities((prev) => {
      const current = prev[product.product_name] ?? 1;
      return {
        ...prev,
        [product.product_name]:
          current < availableStock ? current + 1 : current,
      };
    });
  };

  const handleDecreaseLocalQty = (productName) => {
    setSelectedQuantities((prev) => ({
      ...prev,
      [productName]: Math.max(1, (prev[productName] ?? 1) - 1),
    }));
  };

  const handleLocalQtyInputChange = (product, value, availableStock) => {
    const qty = parseInt(value, 10);

    if (isNaN(qty) || qty < 1) {
      setSelectedQuantities((prev) => ({ ...prev, [product.product_name]: 1 }));
    } else if (qty > availableStock) {
      setSelectedQuantities((prev) => ({
        ...prev,
        [product.product_name]: availableStock,
      }));
    } else {
      setSelectedQuantities((prev) => ({
        ...prev,
        [product.product_name]: qty,
      }));
    }
  };

  // Explicitly commits the item + selected quantity to the cart
  // (cart-side stock; DB stock is never touched here)
  const handleAddToCart = (product) => {
    const qtyToAdd = getSelectedQty(product.product_name);
    addToCart(product, qtyToAdd);
    setSelectedQuantities((prev) => ({ ...prev, [product.product_name]: 1 }));
  };

  return (
    <div className="w-full space-y-4 text-slate-800 dark:text-slate-100">
      {/* Renders child routes like /cart/view-cart */}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Items For Sale
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Browse available products and add them to your cart.
          </p>
        </div>
        <Button
          className="bg-blue-600 text-white font-semibold shadow-sm transition-all duration-200 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 hover:shadow cursor-pointer"
          onClick={() => navigate("/cart/view-cart")}
        >
          <ShoppingCart className="w-4 h-4" />
          Cart ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors placeholder:text-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:bg-slate-950"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={`text-xs px-2.5 py-2 bg-slate-50 border rounded-lg text-slate-600 focus:outline-none transition-all cursor-pointer dark:bg-slate-950 dark:text-slate-300 ${
            categoryFilter
              ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-500/10 dark:text-indigo-300"
              : "border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_name}>
              {c.category_name}
            </option>
          ))}
        </select>
        {(search || categoryFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategoryFilter("");
            }}
            className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer font-medium"
          >
            Reset
          </button>
        )}
      </div>

      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-700 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <p className="text-rose-600 dark:text-rose-400 text-sm py-8 text-center">
          Failed to load products: {error?.message}
        </p>
      ) : data.rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <ShoppingCart className="w-8 h-8 text-slate-300 dark:text-slate-700" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No items match your search{categoryFilter ? " and filter" : ""}.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {data.rows.map((product) => {
              const localQty = getSelectedQty(product.product_name);
              const rawStock = product.product_quantity ?? 0;
              const currentCartQty = getCartQty(product.product_name);

              // Stock minus what's already committed to the cart —
              // a display-only value, never written back to `data`
              // or the database.
              const availableStock = Math.max(0, rawStock - currentCartQty);

              const isOutOfStock = availableStock <= 0;
              const cannotAddRequested = localQty > availableStock;
              const clampedLocalQty = Math.min(localQty, availableStock);

              return (
                <div
                  key={product.product_name}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all group relative shadow-sm"
                >
                  {/* Image Container & Available Stock Badge */}
                  <div className="relative overflow-hidden rounded-lg mb-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 aspect-square">
                    {product.product_quantity !== undefined &&
                      product.product_quantity !== null && (
                        <span
                          className={`absolute top-2 right-2 z-10 font-extrabold text-xs h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center border shadow-sm ${
                            availableStock > 0
                              ? "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-800"
                              : "bg-red-100 text-red-600 border-red-200 dark:bg-red-950/80 dark:text-red-400 dark:border-red-800"
                          }`}
                        >
                          {availableStock}
                        </span>
                      )}

                    <img
                      src={
                        product.product_image === null
                          ? petVet
                          : product.product_image
                      }
                      alt={product.product_name}
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-product.png";
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Product Name */}
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs leading-snug line-clamp-2 min-h-[2rem] mb-2">
                    {product.product_name}
                  </h4>

                  {/* Price Display — a range when this product's batches
                      (different expiry dates) don't all share one price;
                      the exact price actually charged per unit is
                      resolved server-side at checkout (soonest-expiry
                      batch first). */}
                  <div className="mb-2">
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                      {Number(product.min_price) === Number(product.max_price)
                        ? `₱${Number(product.min_price).toFixed(2)}`
                        : `₱${Number(product.min_price).toFixed(2)} – ₱${Number(product.max_price).toFixed(2)}`}
                    </span>
                  </div>

                  {/* Controls & Add to Cart Action */}
                  <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                    {/* Local Quantity Selector (- 1 +) */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-1 rounded-md border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() =>
                          handleDecreaseLocalQty(product.product_name)
                        }
                        disabled={isOutOfStock || localQty <= 1}
                        className="w-5 h-5 flex items-center justify-center rounded text-slate-500 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max={availableStock}
                        disabled={isOutOfStock}
                        value={isOutOfStock ? 0 : clampedLocalQty}
                        onChange={(e) =>
                          handleLocalQtyInputChange(
                            product,
                            e.target.value,
                            availableStock,
                          )
                        }
                        className="w-8 text-center bg-transparent text-[11px] font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handleIncreaseLocalQty(product, availableStock)
                        }
                        disabled={isOutOfStock || localQty >= availableStock}
                        className="w-5 h-5 flex items-center justify-center rounded text-slate-500 dark:text-slate-400 hover:bg-cyan-100 dark:hover:bg-cyan-950/50 hover:text-cyan-700 dark:hover:text-cyan-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Explicit Add To Cart Button */}
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock || cannotAddRequested}
                      className={`w-full text-[10px] font-bold py-1.5 px-2 rounded-md border transition-all flex items-center justify-center gap-1.5 ${
                        isOutOfStock || cannotAddRequested
                          ? "bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                          : "bg-white dark:bg-slate-900 hover:bg-cyan-500 dark:hover:bg-cyan-600 hover:text-white dark:hover:text-white text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-600 shadow-sm cursor-pointer"
                      }`}
                    >
                      <ShoppingCart className="w-3 h-3" />
                      {isOutOfStock
                        ? "Out of Stock"
                        : cannotAddRequested
                          ? "Exceeds Stock"
                          : "Add To Cart"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            limit={data.pagination.limit}
            onPageChange={setPage}
          />
        </>
      )}
      <Outlet />
    </div>
  );
}
