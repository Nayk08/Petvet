import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCartStore = create(
  persist(
    (set) => ({
      cartItems: [],

      addToCart: (product, qty = 1) =>
        set((state) => {
          const existing = state.cartItems.find(
            (i) => i.product_id === product.product_id,
          );
          if (existing) {
            return {
              cartItems: state.cartItems.map((i) =>
                i.product_id === product.product_id
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
      // stored on the cart item itself, so callers no longer need to
      // duplicate this clamping logic before calling updateQuantity.
      updateQuantity: (product_id, newQty) =>
        set((state) => ({
          cartItems: state.cartItems.map((i) => {
            if (i.product_id !== product_id) return i;

            const maxStock = i.product_quantity ?? Infinity;
            const clamped = Math.max(1, Math.min(newQty, maxStock));

            return { ...i, quantity: clamped };
          }),
        })),

      removeFromCart: (product_id) =>
        set((state) => ({
          cartItems: state.cartItems.filter((i) => i.product_id !== product_id),
        })),

      clearCart: () => set({ cartItems: [] }),
    }),
    {
      name: "cart-storage", // localStorage key
      // Only persist cartItems (not actions) — this is the default behavior
      // since functions don't serialize anyway, but being explicit is safer
      // if you add non-serializable fields later.
      partialize: (state) => ({ cartItems: state.cartItems }),
    },
  ),
);
