import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCartStore = create(
  persist(
    (set) => ({
      cartItems: [],

      // Keyed by product_name, not product_id — a product can have several
      // batches (same name, different expiry dates) sharing one shelf
      // quantity, so the cart treats them as one line. Which real batch(es)
      // actually get sold from (FEFO — soonest expiry first) is resolved
      // server-side at checkout, not here.
      addToCart: (product, qty = 1) =>
        set((state) => {
          const existing = state.cartItems.find(
            (i) => i.product_name === product.product_name,
          );
          if (existing) {
            return {
              cartItems: state.cartItems.map((i) =>
                i.product_name === product.product_name
                  ? { ...i, quantity: i.quantity + qty }
                  : i,
              ),
            };
          }
          return {
            cartItems: [...state.cartItems, { ...product, quantity: qty }],
          };
        }),

      // Clamps to [1, product_quantity] using the stock snapshot already
      // stored on the cart item itself (the combined quantity across that
      // product's batches), so callers no longer need to duplicate this
      // clamping logic before calling updateQuantity.
      updateQuantity: (product_name, newQty) =>
        set((state) => ({
          cartItems: state.cartItems.map((i) => {
            if (i.product_name !== product_name) return i;

            const maxStock = i.product_quantity ?? Infinity;
            const clamped = Math.max(1, Math.min(newQty, maxStock));

            return { ...i, quantity: clamped };
          }),
        })),

      removeFromCart: (product_name) =>
        set((state) => ({
          cartItems: state.cartItems.filter(
            (i) => i.product_name !== product_name,
          ),
        })),

      clearCart: () => set({ cartItems: [] }),
    }),
    {
      name: "cart-storage", // localStorage key
      // Only persist cartItems (not actions) — this is the default behavior
      // since functions don't serialize anyway, but being explicit is safer
      // if you add non-serializable fields later.
      partialize: (state) => ({ cartItems: state.cartItems }),
      // Bumped because the cart's identity key changed from product_id to
      // product_name — an old persisted cart (pre-batch-grouping) has
      // different item shapes and must not be merged in as-is.
      version: 1,
      migrate: () => ({ cartItems: [] }),
    },
  ),
);
