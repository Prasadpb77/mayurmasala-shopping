"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import { useCart } from "@/components/CartContext";
import { validateCheckout } from "@/lib/validation";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [honeypot, setHoneypot] = useState(""); // spam trap, kept empty by real users
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const result = validateCheckout({ name, phone, address, honeypot });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    if (items.length === 0) {
      setServerError("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          address,
          items: items.map((i) => ({
            product_id: i.product_id,
            name: i.name,
            price: i.price,
            qty: i.qty,
          })),
          honeypot,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.details) setErrors(data.details);
        else setServerError("Something went wrong placing your order. Please try again.");
        setSubmitting(false);
        return;
      }

      clearCart();
      router.push(`/track/${data.order.id}?justPlaced=1`);
    } catch (err) {
      console.error(err);
      setServerError("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-display text-3xl text-tamarind-900 mb-2">Checkout</h1>
        <p className="text-tamarind-800/70 mb-8 text-sm">
          Cash on Delivery only. We&apos;ll send order updates on WhatsApp.
        </p>

        <div className="grid md:grid-cols-5 gap-10">
          <form onSubmit={handleSubmit} className="md:col-span-3 space-y-5">
            {/* Honeypot field - hidden from real users via CSS, bots often fill it */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="company">Company</label>
              <input
                type="text"
                id="company"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-tamarind-900 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-tamarind-900/20 rounded-xl px-4 py-3 bg-white/70"
                placeholder="e.g. Rahul Sharma"
              />
              {errors.name && <p className="text-vermillion-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-tamarind-900 mb-1">
                Phone Number (WhatsApp preferred)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-tamarind-900/20 rounded-xl px-4 py-3 bg-white/70"
                placeholder="98765 43210"
              />
              {errors.phone && <p className="text-vermillion-500 text-xs mt-1">{errors.phone}</p>}
              <p className="text-xs text-tamarind-800/50 mt-1">
                We&apos;ll send your order status updates to this number on WhatsApp.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-tamarind-900 mb-1">Delivery Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={4}
                className="w-full border border-tamarind-900/20 rounded-xl px-4 py-3 bg-white/70"
                placeholder="Flat / House no., Street, Landmark, Pimpri, Pune, PIN"
              />
              {errors.address && <p className="text-vermillion-500 text-xs mt-1">{errors.address}</p>}
            </div>

            {serverError && (
              <p className="text-vermillion-500 text-sm bg-vermillion-500/10 rounded-lg px-4 py-3">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="w-full bg-vermillion-500 hover:bg-vermillion-400 disabled:opacity-50 text-cream font-semibold py-3 rounded-full transition-colors"
            >
              {submitting ? "Placing your order..." : `Place Order · ₹${total.toFixed(0)} (COD)`}
            </button>
          </form>

          <div className="md:col-span-2">
            <h2 className="font-semibold text-tamarind-900 mb-3">Order Summary</h2>
            <div className="bg-white/60 border border-turmeric-300/30 rounded-2xl p-4 space-y-3">
              {items.map((item) => (
                <div key={item.product_id} className="flex justify-between text-sm">
                  <span>{item.name} × {item.qty}</span>
                  <span>₹{(item.price * item.qty).toFixed(0)}</span>
                </div>
              ))}
              <div className="border-t border-turmeric-300/30 pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-vermillion-500">₹{total.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
