"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Order, STATUS_LABELS, STATUS_ORDER, formatOrderAddress } from "@/lib/types";

export default function TrackOrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get("justPlaced") === "1";
  const id = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (!active) return;
        if (!res.ok) {
          setError("We couldn't find an order with this tracking link.");
        } else {
          const data = await res.json();
          setOrder(data.order as Order);
        }
      } catch (e) {
        if (active) setError("Something went wrong loading this order. Please try again.");
      }
      setLoading(false);
    }
    if (id) fetchOrder();

    // Poll every 15s so customers see live status without refreshing
    const interval = setInterval(() => {
      if (id) fetchOrder();
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id]);

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 min-h-[60vh]">
        {justPlaced && !loading && order && (
          <div className="bg-turmeric-100 border border-turmeric-500/40 text-tamarind-900 rounded-xl px-4 py-3 mb-6 text-sm">
            🎉 Your order has been received! Save this page link to track its progress.
          </div>
        )}

        {loading && <p className="text-center text-tamarind-800/60 py-20">Loading order...</p>}

        {!loading && error && (
          <p className="text-center text-vermillion-500 py-20">{error}</p>
        )}

        {!loading && order && (
          <div>
            <h1 className="font-display text-2xl text-tamarind-900 mb-1">
              Order {order.order_number}
            </h1>
            <p className="text-tamarind-800/60 text-sm mb-8">
              Placed on {new Date(order.created_at).toLocaleString("en-IN")}
            </p>

            {order.status === "return_not_delivered" ? (
              <div className="bg-vermillion-500/10 border border-vermillion-500/30 text-vermillion-500 rounded-xl px-4 py-3 mb-10 text-sm font-semibold">
                ⚠ This order was returned / could not be delivered. Please contact the shop for details.
              </div>
            ) : (
              <div className="flex items-center justify-between mb-10">
                {STATUS_ORDER.map((status, idx) => {
                  const currentIdx = STATUS_ORDER.indexOf(order.status);
                  const reached = idx <= currentIdx;
                  return (
                    <div key={status} className="flex-1 flex flex-col items-center relative">
                      {idx > 0 && (
                        <div
                          className={`absolute top-4 right-1/2 w-full h-0.5 ${
                            reached ? "bg-vermillion-500" : "bg-tamarind-900/10"
                          }`}
                        />
                      )}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                          reached
                            ? "bg-vermillion-500 text-cream"
                            : "bg-tamarind-900/10 text-tamarind-900/40"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span className="text-[11px] text-center mt-2 max-w-[70px] text-tamarind-900/70">
                        {STATUS_LABELS[status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-white/60 border border-turmeric-300/30 rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-tamarind-900 mb-2">Items</h2>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm text-tamarind-800/80">
                    <span>{item.name} × {item.qty}</span>
                    <span>₹{(item.price * item.qty).toFixed(0)}</span>
                  </div>
                ))}
                <div className="border-t border-turmeric-300/30 mt-3 pt-3 flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{(order.subtotal ?? order.total - order.delivery_charge).toFixed(0)}</span>
                </div>
                {order.delivery_charge > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Delivery</span>
                    <span>₹{order.delivery_charge.toFixed(0)}</span>
                  </div>
                )}
                <div className="border-t border-turmeric-300/30 mt-1 pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-vermillion-500">₹{order.total.toFixed(0)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-turmeric-100 text-tamarind-900 px-3 py-1 rounded-full">
                  {order.payment_received ? "Payment Received" : "Cash on Delivery"}
                </span>
                {order.bill_url && (
                  <a
                    href={order.bill_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-vermillion-500 text-cream px-3 py-1 rounded-full"
                  >
                    View Bill (PDF)
                  </a>
                )}
              </div>

              <div className="text-sm text-tamarind-800/70">
                <p className="font-semibold text-tamarind-900 mb-1">Delivery Address</p>
                <p>{formatOrderAddress(order)}</p>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
