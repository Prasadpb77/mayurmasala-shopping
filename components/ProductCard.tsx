"use client";

import Image from "next/image";
import { Product } from "@/lib/types";
import { useCart } from "./CartContext";
import { useLightbox } from "./LightboxContext";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { open } = useLightbox();

  return (
    <div className="group bg-white/70 border border-turmeric-300/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col">
      <div className="relative aspect-square bg-turmeric-50">
        {product.image_url ? (
          <>
            <button
              type="button"
              onClick={() => open({ src: product.image_url as string, alt: product.name })}
              className="absolute inset-0 w-full h-full cursor-zoom-in"
              aria-label={`View larger image of ${product.name}`}
            >
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </button>
            <span
              aria-hidden
              className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-tamarind-900/60 text-cream text-sm flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            >
              🔍
            </span>
          </>
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
