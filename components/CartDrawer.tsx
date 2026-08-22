"use client";

import Link from "next/link";
import { useCart } from "./CartContext";

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQty, removeItem, total } = useCart();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50"
          onClick={closeCart}
          aria-hidden
        />
      )}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-cream z-50 shadow-2xl transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between p-4 border-b border-turmeric-300/40">
          <h2 className="font-display text-xl text-tamarind-900">Your Cart</h2>
          <button onClick={closeCart} aria-label="Close cart" className="text-2xl leading-none px-2">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-tamarind-800/60 text-center mt-10">
              Your cart is empty. Add some masalas or pooja items!
            </p>
          ) : (
            items.map((item) => (
              <div key={item.product_id} className="flex items-center gap-3 border-b border-turmeric-300/20 pb-3">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-tamarind-900">{item.name}</p>
                  <p className="text-xs text-tamarind-800/60">₹{item.price} each</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => updateQty(item.product_id, item.qty - 1)}
                      className="w-6 h-6 rounded-full border border-tamarind-900/20 text-sm"
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      −
                    </button>
                    <span className="text-sm w-6 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.product_id, item.qty + 1)}
                      className="w-6 h-6 rounded-full border border-tamarind-900/20 text-sm"
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-vermillion-500">
                    ₹{(item.price * item.qty).toFixed(0)}
                  </p>
                  <button
                    onClick={() => removeItem(item.product_id)}
                    className="text-xs text-tamarind-800/50 hover:text-vermillion-500 mt-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-turmeric-300/40">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-tamarind-900">Total</span>
            <span className="font-display text-xl text-vermillion-500">₹{total.toFixed(0)}</span>
          </div>
          <Link
            href="/checkout"
            onClick={closeCart}
            className={`block text-center w-full py-3 rounded-full font-semibold transition-colors ${
              items.length === 0
                ? "bg-tamarind-900/10 text-tamarind-900/40 pointer-events-none"
                : "bg-vermillion-500 hover:bg-vermillion-400 text-cream"
            }`}
          >
            Proceed to Checkout
          </Link>
        </div>
      </aside>
    </>
  );
}
