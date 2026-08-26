"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { STATUS_LABELS, OrderStatus } from "@/lib/types";

interface OrderSummary {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  delivery_charge: number;
  created_at: string;
  payment_received: boolean;
  bill_url: string | null;
}

export default function TrackLookupPage() {
  const [mode, setMode] = useState<"id" | "phone">("id");
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<OrderSummary[] | null>(null);
  const router = useRouter();

  function handleIdSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = orderId.trim();
    if (trimmed) router.push(`/track/${trimmed}`);
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResults(null);
    const trimmed = phone.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/by-phone?phone=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "invalid_phone"
            ? "Enter a valid 10-digit Indian mobile number."
            : "Something went wrong. Please try again."
        );
        setLoading(false);
        return;
      }
      setResults(data.orders);
    } catch (err) {
      console.error(err);
      setError("Network error. Please check your connection and try again.");
    }
    setLoading(false);
  }

  return (
    <>
      <Header />
      <main className="max-w-md mx-auto px-4 sm:px-6 py-20">
        <h1 className="font-display text-3xl text-tamarind-900 mb-4 text-center">Track Your Order</h1>
        <p className="text-tamarind-800/70 text-sm mb-6 text-center">
          Look up your order using the tracking link, order ID, or the phone number you placed it with.
        </p>

        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => {
              setMode("id");
              setError("");
              setResults(null);
            }}
            className={`text-xs font-semibold px-4 py-1.5 rounded-full border ${
              mode === "id"
                ? "bg-vermillion-500 text-cream border-vermillion-500"
                : "border-tamarind-900/20 text-tamarind-900/70"
            }`}
          >
            By Order ID
          </button>
          <button
            onClick={() => {
              setMode("phone");
              setError("");
              setResults(null);
            }}
            className={`text-xs font-semibold px-4 py-1.5 rounded-full border ${
              mode === "phone"
                ? "bg-vermillion-500 text-cream border-vermillion-500"
                : "border-tamarind-900/20 text-tamarind-900/70"
            }`}
          >
            By Phone Number
          </button>
        </div>

        {mode === "id" ? (
          <form onSubmit={handleIdSubmit} className="flex flex-col gap-3">
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
        ) : (
          <>
            <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-3">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210"
                className="border border-tamarind-900/20 rounded-xl px-4 py-3 bg-white/70"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-vermillion-500 hover:bg-vermillion-400 disabled:opacity-50 text-cream font-semibold py-3 rounded-full transition-colors"
              >
                {loading ? "Searching..." : "Find My Orders"}
              </button>
            </form>

            {error && <p className="text-vermillion-500 text-sm mt-4 text-center">{error}</p>}

            {results && results.length === 0 && (
              <p className="text-tamarind-800/60 text-sm mt-6 text-center">
                No orders found for this phone number.
              </p>
            )}

            {results && results.length > 0 && (
              <div className="mt-6 space-y-3">
                {results.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => router.push(`/track/${order.id}`)}
                    className="w-full text-left bg-white/70 border border-turmeric-300/30 rounded-2xl p-4 hover:border-vermillion-500 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="font-semibold text-tamarind-900 text-sm">{order.order_number}</p>
                        <p className="text-xs text-tamarind-800/60">
                          {new Date(order.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-vermillion-500">₹{order.total.toFixed(0)}</p>
                        <p className="text-xs text-tamarind-800/60">{STATUS_LABELS[order.status]}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
