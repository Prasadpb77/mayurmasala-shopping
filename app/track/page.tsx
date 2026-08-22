"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TrackLookupPage() {
  const [orderId, setOrderId] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = orderId.trim();
    if (trimmed) router.push(`/track/${trimmed}`);
  }

  return (
    <>
      <Header />
      <main className="max-w-md mx-auto px-4 sm:px-6 py-20 text-center">
        <h1 className="font-display text-3xl text-tamarind-900 mb-4">Track Your Order</h1>
        <p className="text-tamarind-800/70 text-sm mb-8">
          Paste the tracking link or order ID you received after checkout.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Order ID"
            className="border border-tamarind-900/20 rounded-xl px-4 py-3 bg-white/70"
          />
          <button
            type="submit"
            className="bg-vermillion-500 hover:bg-vermillion-400 text-cream font-semibold py-3 rounded-full transition-colors"
          >
            Track Order
          </button>
        </form>
      </main>
      <Footer />
    </>
  );
}
