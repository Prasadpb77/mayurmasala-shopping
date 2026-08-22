"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "./CartContext";

export default function Header() {
  const { count, openCart } = useCart();
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Mayur Masala and Pooja Center";

  return (
    <header className="sticky top-0 z-40 bg-tamarind-900/95 backdrop-blur text-cream border-b border-turmeric-500/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="Mayur Masala and Pooja Center logo"
            width={55}
            height={44}
            className="object-contain"
          />
          <span className="font-display text-lg sm:text-xl tracking-wide group-hover:text-turmeric-300 transition-colors">
            {shopName}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <a href="#shop" className="hover:text-turmeric-300 transition-colors">Shop</a>
          <a href="#about" className="hover:text-turmeric-300 transition-colors">Our Story</a>
          <Link href="/track" className="hover:text-turmeric-300 transition-colors">Track Order</Link>
        </nav>

        <button
          onClick={openCart}
          className="relative flex items-center gap-2 bg-vermillion-500 hover:bg-vermillion-400 transition-colors text-cream px-4 py-2 rounded-full text-sm font-semibold"
          aria-label="Open cart"
        >
          <span aria-hidden>🛒</span>
          <span className="hidden sm:inline">Cart</span>
          {count > 0 && (
            <span className="absolute -top-2 -right-2 bg-turmeric-300 text-tamarind-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
