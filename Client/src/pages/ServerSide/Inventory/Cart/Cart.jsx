import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { fetchInventory } from "@/api/http";
import { Pagination } from "@/components/ui/Pagination";
import petVet from "../../../../assets/petVet/icons8-no-image-80.png";
import { useNavigate, Outlet } from "react-router";
import { Button } from "@/components/ui/button.jsx";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";

export default function Cart() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Local quantity selections before hitting "Add to Cart"
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const cartItems = useCartStore((state) => state.cartItems);
  const addToCart = useCartStore((state) => state.addToCart);
  const navigate = useNavigate();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["inventoryProducts", page, limit],
    queryFn: ({ signal }) => fetchInventory({ page, limit, signal }),
    staleTime: 5000,
    placeholderData: keepPreviousData,
  });

  const getSelectedQty = (productId) => selectedQuantities[productId] ?? 1;

  const getCartQty = (productId) => {
    const item = cartItems.find((i) => i.product_id === productId);
    return item ? item.quantity : 0;
  };

  // Local handlers for adjusting quantity on the card — capped by
  // availableStock (raw stock minus whatever's already in the cart)
  const handleIncreaseLocalQty = (product, availableStock) => {
    setSelectedQuantities((prev) => {
      const current = prev[product.product_id] ?? 1;
      return {
        ...prev,
        [product.product_id]: current < availableStock ? current + 1 : current,
      };
    });
  };

  const handleDecreaseLocalQty = (productId) => {
    setSelectedQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] ?? 1) - 1),
    }));
  };

  const handleLocalQtyInputChange = (product, value, availableStock) => {
    const qty = parseInt(value, 10);

    if (isNaN(qty) || qty < 1) {
      setSelectedQuantities((prev) => ({ ...prev, [product.product_id]: 1 }));
    } else if (qty > availableStock) {
      setSelectedQuantities((prev) => ({
        ...prev,
        [product.product_id]: availableStock,
      }));
    } else {
      setSelectedQuantities((prev) => ({ ...prev, [product.product_id]: qty }));
    }
  };

  // Explicitly commits the item + selected quantity to the cart
  // (cart-side stock; DB stock is never touched here)
  const handleAddToCart = (product) => {
    const qtyToAdd = getSelectedQty(product.product_id);
    addToCart(product, qtyToAdd);
    setSelectedQuantities((prev) => ({ ...prev, [product.product_id]: 1 }));
  };

  return (
    <div className="w-full max-w-7xl mt-4 text-slate-800 dark:text-slate-100">
      {/* Renders child routes like /cart/view-cart */}

      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Items For Sale
          </h2>
          <Button
            className="bg-blue-600 text-white font-semibold shadow-sm transition-all duration-200 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 hover:shadow cursor-pointer"
            onClick={() => navigate("/cart/view-cart")}
          >
            Cart ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})
          </Button>
        </div>

        {isPending ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Loading products...
          </p>
        ) : isError ? (
          <p className="text-rose-600 dark:text-rose-400 text-sm">
            Failed to load products: {error?.message}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {data.rows.map((product) => {
                const localQty = getSelectedQty(product.product_id);
                const rawStock = product.product_quantity ?? 0;
                const currentCartQty = getCartQty(product.product_id);

                // Stock minus what's already committed to the cart —
                // a display-only value, never written back to `data`
                // or the database.
                const availableStock = Math.max(0, rawStock - currentCartQty);

                const isOutOfStock = availableStock <= 0;
                const cannotAddRequested = localQty > availableStock;
                const clampedLocalQty = Math.min(localQty, availableStock);

                return (
                  <div
                    key={product.product_id}
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

                    {/* Price Display */}
                    <div className="mb-2">
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                        ${Number(product.product_price).toFixed(2)}
                      </span>
                    </div>

                    {/* Controls & Add to Cart Action */}
                    <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                      {/* Local Quantity Selector (- 1 +) */}
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-1 rounded-md border border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() =>
                            handleDecreaseLocalQty(product.product_id)
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
      </div>
      <Outlet />
    </div>
  );
}
