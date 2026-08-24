"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabaseClient";
import { Order } from "@/lib/types";
import { UpiSettings, isUpiConfigured, buildUpiUri, buildUpiQrDataUrl } from "@/lib/upi";

export default function PayOrderPage() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [upi, setUpi] = useState<UpiSettings | null>(null);
  const [upiUri, setUpiUri] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [orderRes, settingsRes] = await Promise.all([
        fetch(`/api/orders/${id}`),
        supabase.from("site_settings").select("value").eq("key", "upi").maybeSingle(),
      ]);

      if (!orderRes.ok) {
        setError("We couldn't find this order.");
        setLoading(false);
        return;
      }

      const orderJson = await orderRes.json();
      const orderObj = orderJson.order as Order;
      setOrder(orderObj);

      const upiSettings = (settingsRes.data?.value as UpiSettings) || null;
      setUpi(upiSettings);

      if (!orderObj.payment_received && isUpiConfigured(upiSettings)) {
        const uri = buildUpiUri(upiSettings!, orderObj.total, orderObj.order_number);
        setUpiUri(uri);
        const qr = await buildUpiQrDataUrl(uri);
        setQrDataUrl(qr);

        // Auto-redirect on mobile, where a UPI app can actually open this.
        setTimeout(() => {
          setRedirected(true);
          window.location.href = uri;
        }, 600);
      }

      setLoading(false);
    }
    if (id) load();
  }, [id]);

  return (
    <>
      <Header />
      <main className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center min-h-[60vh]">
        {loading && <p className="text-tamarind-800/60 py-20">Loading...</p>}

        {!loading && error && <p className="text-vermillion-500 py-20">{error}</p>}

        {!loading && order && order.payment_received && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8">
            <p className="text-2xl mb-2">✅</p>
            <h1 className="font-display text-2xl text-tamarind-900 mb-2">Already Paid</h1>
            <p className="text-tamarind-800/70 text-sm">
              Payment for order {order.order_number} has already been received. Thank you!
            </p>
          </div>
        )}

        {!loading && order && !order.payment_received && !isUpiConfigured(upi) && (
          <div className="bg-turmeric-50 border border-turmeric-300/40 rounded-2xl p-8">
            <p className="text-tamarind-800/70 text-sm">
              Online payment isn&apos;t set up yet for this shop. Please pay cash on delivery.
            </p>
          </div>
        )}

        {!loading && order && !order.payment_received && isUpiConfigured(upi) && (
          <div>
            <h1 className="font-display text-2xl text-tamarind-900 mb-1">Pay via UPI</h1>
            <p className="text-tamarind-800/60 text-sm mb-6">
              Order {order.order_number} · ₹{order.total.toFixed(0)}
            </p>

            {qrDataUrl && (
              <div className="bg-white border border-turmeric-300/30 rounded-2xl p-6 inline-block mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="UPI QR code" className="w-56 h-56 mx-auto" />
                <p className="font-display text-xl text-vermillion-500 mt-3">
                  ₹{order.total.toFixed(0)}
                </p>
              </div>
            )}

            <a
              href={upiUri}
              className="block w-full bg-vermillion-500 hover:bg-vermillion-400 text-cream font-semibold py-3 rounded-full transition-colors mb-3"
            >
              Open UPI App
            </a>
            <p className="text-xs text-tamarind-800/50">
              {redirected
                ? "If your UPI app didn't open automatically, tap the button above or scan the QR code."
                : "Opening your UPI app..."}
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
