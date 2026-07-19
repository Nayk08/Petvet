import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchInventory } from "@/api/http";
import { Pagination } from "@/components/ui/Pagination";
import petVet from "../../../../assets/petVet/icons8-no-image-80.png";

import { Button } from "@/components/ui/button.jsx";
export default function Cart() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["inventoryProducts", page, limit],
    queryFn: ({ signal }) => fetchInventory({ page, limit, signal }),
    staleTime: 5000,
    keepPreviousData: true,
  });

  const handleAddToCart = (product) => {
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

  return (
    <div className="w-full max-w-7xl mt-4">
      <div className="space-y-6">
        <h2 className="text-3xl font-normal text-white tracking-wide mb-6">
          Items For Sale
        </h2>
        <Button
          className="bg-cyan-500 text-black font-semibold shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-300 hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] hover:scale-105"
          variant="neon"
        >
          Cart
        </Button>

        {isPending ? (
          <p className="text-slate-500 text-sm">Loading products...</p>
        ) : isError ? (
          <p className="text-red-400 text-sm">
            Failed to load products: {error?.message}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {data.rows.map((product) => (
                <div
                  key={product.product_id}
                  className="bg-[#0b0e17] border border-[#161b2c] rounded-xl p-3 flex flex-col hover:border-[#1e253a] transition-all group"
                >
                  <div className="overflow-hidden rounded-lg mb-2.5 bg-[#070911] border border-[#161b2c]/60 aspect-square">
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

                  <h4 className="font-semibold text-white text-xs leading-snug line-clamp-2 min-h-[2rem]">
                    {product.product_name}
                  </h4>

                  <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-[#161b2c]/40 gap-2">
                    <span className="text-xs font-bold text-teal-400 shrink-0">
                      ${Number(product.product_price).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className="bg-[#1b1e2a] hover:bg-blue-600 hover:text-white text-slate-300 text-[10px] font-bold px-2.5 py-1.5 rounded-md border border-[#2d3246] hover:border-blue-600 transition-all whitespace-nowrap shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
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
    </div>
  );
}
