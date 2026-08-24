"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabaseClient";
import { Order } from "@/lib/types";
import {
  UpiSettings,
  isUpiConfigured,
  buildUpiUri,
  buildUpiQrDataUrl,
  buildAppSpecificUpiLinks,
  AppUpiLinks,
} from "@/lib/upi";

export default function PayOrderPage() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [upi, setUpi] = useState<UpiSettings | null>(null);
  const [appLinks, setAppLinks] = useState<AppUpiLinks | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        const links = buildAppSpecificUpiLinks(upiSettings!, orderObj.total, orderObj.order_number);
        setAppLinks(links);

        const genericUri = buildUpiUri(upiSettings!, orderObj.total, orderObj.order_number);
        const qr = await buildUpiQrDataUrl(genericUri);
        setQrDataUrl(qr);
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

        {!loading && order && !order.payment_received && isUpiConfigured(upi) && appLinks && (
          <div>
            <h1 className="font-display text-2xl text-tamarind-900 mb-1">Pay via UPI</h1>
            <p className="text-tamarind-800/60 text-sm mb-6">
              Order {order.order_number} · ₹{order.total.toFixed(0)}
            </p>

            <p className="text-xs font-semibold text-tamarind-900/70 mb-3">
              Choose your UPI app
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <a
                href={appLinks.gpay}
                className="bg-white border border-turmeric-300/40 hover:border-vermillion-500 rounded-xl py-3 text-sm font-semibold text-tamarind-900 transition-colors"
              >
                Google Pay
              </a>
              <a
                href={appLinks.phonepe}
                className="bg-white border border-turmeric-300/40 hover:border-vermillion-500 rounded-xl py-3 text-sm font-semibold text-tamarind-900 transition-colors"
              >
                PhonePe
              </a>
              <a
                href={appLinks.paytm}
                className="bg-white border border-turmeric-300/40 hover:border-vermillion-500 rounded-xl py-3 text-sm font-semibold text-tamarind-900 transition-colors"
              >
                Paytm
              </a>
              <a
                href={appLinks.generic}
                className="bg-white border border-turmeric-300/40 hover:border-vermillion-500 rounded-xl py-3 text-sm font-semibold text-tamarind-900 transition-colors"
              >
                Other UPI App
              </a>
            </div>

            {qrDataUrl && (
              <div className="bg-white border border-turmeric-300/30 rounded-2xl p-6">
                <p className="text-xs text-tamarind-800/60 mb-3">Or scan with any UPI app</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="UPI QR code" className="w-48 h-48 mx-auto" />
                <p className="font-display text-xl text-vermillion-500 mt-3">
                  ₹{order.total.toFixed(0)}
                </p>
              </div>
            )}

            <p className="text-xs text-tamarind-800/50 mt-4">
              If a button doesn&apos;t open your app (common inside WhatsApp&apos;s built-in
              browser), tap the ⋯ menu and choose &quot;Open in Browser&quot;, or just scan the QR code.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}