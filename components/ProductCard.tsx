"use client";

import Image from "next/image";
import { Product } from "@/lib/types";
import { useCart } from "./CartContext";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <div className="group bg-white/70 border border-turmeric-300/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col">
      <div className="relative aspect-square bg-turmeric-50">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🌶️</div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-tamarind-900 leading-snug">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-tamarind-800/70 mt-1 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="font-display text-lg text-vermillion-500">₹{product.price}</span>
          <button
            onClick={() => addItem(product)}
            className="text-xs font-semibold bg-vermillion-500 hover:bg-vermillion-400 text-cream px-3 py-2 rounded-full transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
