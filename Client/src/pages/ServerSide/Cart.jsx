import React, { useState } from "react";

// Products available on the store shelf for sale
const PRODUCTS_FOR_SALE = [
  {
    id: 101,
    name: "Premium Kibble Pack",
    details: "High-protein dry food (5kg)",
    price: 45.0,
    image:
      "https://images.unsplash.com/photo-1589924691995-400dc9ebd134?w=200&auto=format&fit=crop&q=60",
  },
  {
    id: 102,
    name: "Organic Pet Treats",
    details: "Salmon flavored (200g)",
    price: 12.5,
    image:
      "https://images.unsplash.com/photo-1608454367599-c1139e647573?w=200&auto=format&fit=crop&q=60",
  },
  {
    id: 103,
    name: "Ergonomic Chew Toy",
    details: "Durable natural rubber",
    price: 15.99,
    image:
      "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=200&auto=format&fit=crop&q=60",
  },
  {
    id: 104,
    name: "Catnip Spray",
    details: "Pure organic blend (100ml)",
    price: 8.99,
    image:
      "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=200&auto=format&fit=crop&q=60",
  },
  {
    id: 105,
    name: "Comfort Pet Harness",
    details: "Adjustable mesh, medium size",
    price: 22.5,
    image:
      "https://images.unsplash.com/photo-1544568100-847a948585b9?w=200&auto=format&fit=crop&q=60",
  },
  {
    id: 106,
    name: "Dental Care Kit",
    details: "Toothbrush & enzymatic paste",
    price: 14.0,
    image:
      "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=200&auto=format&fit=crop&q=60",
  },
];

const INITIAL_CART_ITEMS = [
  {
    id: 1,
    name: "Premium Dog Grooming",
    details: "For Max (Golden Retriever)",
    price: 85.0,
    quantity: 1,
    isAppointment: true,
    image:
      "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=150&auto=format&fit=crop&q=60",
  },
  {
    id: 2,
    name: "Medicated Anti-Tick Shampoo",
    details: "250ml Bottle",
    price: 24.99,
    quantity: 2,
    isAppointment: false,
    image:
      "https://images.unsplash.com/photo-1608248597481-496100c80836?w=150&auto=format&fit=crop&q=60",
  },
];

export default function Cart({ bookedItems = [] }) {
  const formatBookedItems = bookedItems.map((item) => ({
    id: item.id,
    name: item.service.name,
    details: `${item.date} (${item.time})`,
    price:
      item.service.id === "operation"
        ? 250.0
        : item.service.id === "grooming"
          ? 85.0
          : 50.0,
    quantity: 1,
    isAppointment: true,
    image:
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=150&auto=format&fit=crop&q=60",
  }));

  const [cartItems, setCartItems] = useState([
    ...formatBookedItems,
    ...INITIAL_CART_ITEMS,
  ]);
  const [couponCode, setCouponCode] = useState("");

  const updateQuantity = (id, delta) => {
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          if (item.isAppointment) return item;
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }),
    );
  };

  const removeItem = (id) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const handleAddToCart = (product) => {
    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.id === product.id,
      );

      if (existingIndex > -1) {
        return prevItems.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      } else {
        return [
          ...prevItems,
          { ...product, quantity: 1, isAppointment: false },
        ];
      }
    });
  };

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  return (
    <div className="min-h-screen bg-[#070911] text-slate-100 font-sans p-8 flex justify-center items-start">
      {/* Outer layout splits screen into even left and right halves */}
      <div className="w-full max-w-7xl mt-4 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* LEFT PANEL: Items For Sale with a strict 3-column configuration */}
        <div className="space-y-6">
          <h2 className="text-3xl font-normal text-white tracking-wide mb-6">
            Items For Sale
          </h2>

          {/* Changed sm:grid-cols-2 to sm:grid-cols-3 to force 3 items per row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PRODUCTS_FOR_SALE.map((product) => (
              <div
                key={product.id}
                className="bg-[#0b0e17] border border-[#161b2c] rounded-xl p-3 flex flex-col justify-between hover:border-[#1e253a] transition-all group"
              >
                <div>
                  <div className="overflow-hidden rounded-lg mb-3 bg-[#070911] border border-[#161b2c]/60 aspect-square">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h4 className="font-semibold text-white text-xs truncate">
                    {product.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                    {product.details}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-3 pt-2.5 border-t border-[#161b2c]/40 gap-2">
                  <span className="text-xs font-bold text-teal-400">
                    ${product.price.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className="bg-[#1b1e2a] hover:bg-blue-600 hover:text-white text-slate-300 text-[10px] font-bold px-2 py-1 rounded-md border border-[#2d3246] hover:border-blue-600 transition-all text-center"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: Shopping Cart Dashboard Panel */}
        <div className="space-y-6">
          <h2 className="text-3xl font-normal text-white tracking-wide mb-6">
            Shopping Cart
          </h2>

          <div className="bg-[#0b0e17] border border-[#161b2c] rounded-xl p-6 space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#161b2c] text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3">Product</th>
                    <th className="pb-3 text-center">Price</th>
                    <th className="pb-3 text-center">Qty</th>
                    <th className="pb-3 text-right">Subtotal</th>
                    <th className="pb-3 w-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#161b2c]/40">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-8 text-center text-slate-500 italic text-sm"
                      >
                        Your shopping cart is currently empty.
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item) => (
                      <tr key={item.id} className="align-middle group text-sm">
                        <td className="py-4 flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-11 h-11 object-cover rounded-lg bg-[#070911] border border-[#161b2c]"
                          />
                          <div className="max-w-[110px] sm:max-w-none">
                            <h4 className="font-semibold text-white text-sm truncate">
                              {item.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate">
                              {item.details}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 text-center text-slate-300">
                          ${item.price.toFixed(2)}
                        </td>
                        <td className="py-4 text-center">
                          <div
                            className={`inline-flex items-center bg-[#070911] border border-[#1e253a] rounded-lg p-0.5 ${item.isAppointment ? "opacity-40" : ""}`}
                          >
                            <button
                              type="button"
                              disabled={item.isAppointment}
                              onClick={() => updateQuantity(item.id, -1)}
                              className="px-1.5 text-slate-400 hover:text-white transition-colors text-xs font-bold disabled:cursor-not-allowed"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold px-1.5 text-slate-200 min-w-[14px]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={item.isAppointment}
                              onClick={() => updateQuantity(item.id, 1)}
                              className="px-1.5 text-slate-400 hover:text-white transition-colors text-xs font-bold disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-4 text-right font-semibold text-white">
                          ${(item.price * item.quantity).toFixed(2)}
                        </td>
                        <td className="py-4 text-right pl-2">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-slate-600 hover:text-red-400 text-base opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Coupons + Table Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#161b2c]">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="bg-[#070911] border border-[#1e253a] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-600 w-24"
                />
                <button
                  type="button"
                  className="bg-[#1b1e2a] hover:bg-[#242838] border border-[#2d3246] text-slate-300 text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Enter Coupon
                </button>
              </div>
              <button
                type="button"
                className="bg-[#111422] hover:bg-[#181d30] border border-[#1e253a] text-slate-400 hover:text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Update cart
              </button>
            </div>

            {/* Calculations Area */}
            <div className="pt-4 border-t border-[#161b2c] space-y-3">
              <div className="flex justify-between items-center text-sm text-slate-400">
                <span>SUBTOTAL</span>
                <span className="text-slate-200 font-semibold">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[#161b2c]/60">
                <span className="text-slate-400 text-xs font-bold tracking-wider">
                  TOTAL
                </span>
                <span className="text-xl font-bold text-teal-400">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Checkout Action */}
            <button
              type="button"
              className="w-full bg-[#1e2330] hover:bg-[#282f42] border border-[#2d354a] text-white py-3 rounded-lg font-semibold text-xs tracking-wide transition-all uppercase"
            >
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
