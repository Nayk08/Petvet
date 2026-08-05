import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";

export default function ProductCard({
  product,
  cartItems,
  setCartItems,
  petVet,
}) {
  // Find current item in cart to get real-time quantity
  const cartItem = cartItems.find(
    (item) => item.product_id === product.product_id,
  );
  const quantity = cartItem ? cartItem.quantity : 0;

  // Add or Increase quantity (defaults to 1 on first click)
  const handleIncrease = () => {
    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.product_id === product.product_id,
      );

      if (existingIndex > -1) {
        return prevItems.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      } else {
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
  };

  // Decrease quantity or remove if reaches 0
  const handleDecrease = () => {
    setCartItems((prevItems) =>
      prevItems
        .map((item) =>
          item.product_id === product.product_id
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col hover:border-slate-300 hover:shadow-md transition-all group relative shadow-sm">
      {/* Product Image & Top-Right Quantity Badge */}
      <div className="relative overflow-hidden rounded-lg mb-2.5 bg-slate-50 border border-slate-100 aspect-square">
        {quantity > 0 && (
          <span className="absolute top-2 right-2 z-10 bg-cyan-100 text-cyan-800 font-extrabold text-[10px] h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-sm border border-cyan-200">
            {quantity}
          </span>
        )}

        <img
          src={product.product_image === null ? petVet : product.product_image}
          alt={product.product_name}
          onError={(e) => {
            e.currentTarget.src = "/placeholder-product.png";
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Product Title */}
      <h4 className="font-semibold text-slate-900 text-xs leading-snug line-clamp-2 min-h-[2rem]">
        {product.product_name}
      </h4>

      {/* Price & Interactive Quantity Selector */}
      <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-slate-100 gap-2">
        <span className="text-xs font-bold text-teal-600 shrink-0">
          ${Number(product.product_price).toFixed(2)}
        </span>

        {quantity === 0 ? (
          /* Initial Add Button */
          <button
            type="button"
            onClick={handleIncrease}
            className="bg-white hover:bg-cyan-500 hover:text-white text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-md border border-slate-300 hover:border-cyan-500 shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            Add
          </button>
        ) : (
          /* Minus / Quantity / Plus Control Bar */
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-md border border-slate-200">
            <button
              type="button"
              onClick={handleDecrease}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:bg-red-100 hover:text-red-600 transition cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3 h-3" />
            </button>

            <span className="text-[11px] font-bold text-slate-900 w-4 text-center">
              {quantity}
            </span>

            <button
              type="button"
              onClick={handleIncrease}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:bg-cyan-100 hover:text-cyan-700 transition cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
