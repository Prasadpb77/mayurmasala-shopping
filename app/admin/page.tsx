"use client";

import { useEffect, useState, useRef } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabaseClient";
import { Order, OrderStatus, STATUS_LABELS, ADMIN_STATUS_OPTIONS, formatOrderAddress } from "@/lib/types";
import { buildStatusUpdateWhatsappLink } from "@/lib/whatsapp";
import { openThermalPrintWindow } from "@/lib/printBill";
import { UpiSettings } from "@/lib/upi";

const FILTERS: ("all" | OrderStatus)[] = ["all", ...ADMIN_STATUS_OPTIONS];

function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [upi, setUpi] = useState<UpiSettings>({ vpa: "", payee_name: "" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadOrderId = useRef<string | null>(null);

  async function loadOrders() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as Order[]);
    setLoading(false);
  }

  async function loadUpiSettings() {
    const supabase = createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "upi")
      .maybeSingle();
    if (data?.value) setUpi(data.value as UpiSettings);
  }

  useEffect(() => {
    loadOrders();
    loadUpiSettings();
    const supabase = createClient();
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function updateStatus(order: Order, status: OrderStatus) {
    if (order.status === "delivered" && status !== "delivered") {
      const confirmed = confirm(
        `This order is already marked "Delivered". Are you sure you want to move it back to "${STATUS_LABELS[status]}"?`
      );
      if (!confirmed) return;
    }
    const supabase = createClient();
    await supabase.from("orders").update({ status }).eq("id", order.id);
    loadOrders();
  }

  async function deleteOrder(order: Order) {
    const confirmed = confirm(
      `Are you sure you want to delete order ${order.order_number} (${order.customer_name})? This cannot be undone.`
    );
    if (!confirmed) return;
    const supabase = createClient();
    const { error } = await supabase.from("orders").delete().eq("id", order.id);
    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }
    loadOrders();
  }

  async function togglePayment(order: Order) {
    const supabase = createClient();
    await supabase
      .from("orders")
      .update({ payment_received: !order.payment_received })
      .eq("id", order.id);
    loadOrders();
  }

  async function generateAndUploadBill(order: Order) {
    setUploadingFor(order.id);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch("/api/admin/bill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!res.ok) {
        alert("Bill generation failed. Please try again.");
        setUploadingFor(null);
        return;
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong generating the bill.");
    }
    setUploadingFor(null);
    loadOrders();
  }

  function triggerBillUpload(orderId: string) {
    pendingUploadOrderId.current = orderId;
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const orderId = pendingUploadOrderId.current;
    if (!file || !orderId) return;

    if (file.type !== "application/pdf") {
      alert("Please upload the bill as a PDF file.");
      return;
    }

    setUploadingFor(orderId);
    const supabase = createClient();
    const path = `${orderId}/${Date.now()}-bill.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("bills")
      .upload(path, file, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      alert("Upload failed: " + uploadError.message);
      setUploadingFor(null);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("bills").getPublicUrl(path);

    await supabase
      .from("orders")
      .update({ bill_url: publicUrlData.publicUrl })
      .eq("id", orderId);

    setUploadingFor(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    loadOrders();
  }

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="min-h-screen bg-cream">
      <AdminNav />
      <input
        type="file"
        accept="application/pdf"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelected}
      />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-display text-2xl text-tamarind-900 mb-4">Orders</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                filter === f
                  ? "bg-vermillion-500 text-cream border-vermillion-500"
                  : "border-tamarind-900/20 text-tamarind-900/70"
              }`}
            >
              {f === "all" ? "All" : STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-tamarind-800/60">Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="text-tamarind-800/60">No orders in this category yet.</p>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white/70 border border-turmeric-300/30 rounded-2xl p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-tamarind-900">
                      {order.order_number} — {order.customer_name}
                    </p>
                    <p className="text-xs text-tamarind-800/60">
                      {order.phone} · {new Date(order.created_at).toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-tamarind-800/60 mt-1 max-w-md">{formatOrderAddress(order)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg text-vermillion-500">
                      ₹{order.total.toFixed(0)}
                    </p>
                    <button
                      onClick={() => togglePayment(order)}
                      className={`text-xs px-3 py-1 rounded-full mt-1 ${
                        order.payment_received
                          ? "bg-green-600 text-white"
                          : "bg-tamarind-900/10 text-tamarind-900/70"
                      }`}
                    >
                      {order.payment_received ? "Payment Received ✓" : "Mark Payment Received"}
                    </button>
                  </div>
                </div>

                <div className="border-t border-turmeric-300/20 pt-3 mb-3">
                  <p className="text-xs font-semibold text-tamarind-900/70 mb-1">Items</p>
                  <ul className="text-sm text-tamarind-800/80 space-y-0.5">
                    {order.items.map((item, idx) => (
                      <li key={idx}>
                        {item.name} × {item.qty} — ₹{(item.price * item.qty).toFixed(0)}
                      </li>
                    ))}
                  </ul>
                  {order.delivery_charge > 0 && (
                    <p className="text-xs text-tamarind-800/60 mt-1">
                      + ₹{order.delivery_charge.toFixed(0)} delivery
                      {order.delivery_zone ? ` (${order.delivery_zone.replace(/_/g, " ")})` : ""}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order, e.target.value as OrderStatus)}
                    className="text-sm border border-tamarind-900/20 rounded-lg px-3 py-2 bg-white"
                  >
                    {ADMIN_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => generateAndUploadBill(order)}
                    disabled={uploadingFor === order.id}
                    className="text-xs font-semibold bg-tamarind-900 hover:bg-tamarind-800 text-cream px-3 py-2 rounded-full transition-colors disabled:opacity-50"
                  >
                    {uploadingFor === order.id ? "Generating..." : "Generate Bill"}
                  </button>

                  <button
                    onClick={() => openThermalPrintWindow(order.id)}
                    className="text-xs font-semibold border border-tamarind-900/30 hover:border-vermillion-500 hover:text-vermillion-500 text-tamarind-900 px-3 py-2 rounded-full transition-colors"
                  >
                    Print Bill (Browser)
                  </button>

                  <a
                    href={`rawbt:${encodeURIComponent(
                      `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/print-bill?id=${order.id}`
                    )}`}
                    className="text-xs font-semibold border border-tamarind-900/30 hover:border-vermillion-500 hover:text-vermillion-500 text-tamarind-900 px-3 py-2 rounded-full transition-colors"
                  >
                    Print via RawBT
                  </a>

                  {order.status === "out_for_delivery" || order.bill_url ? (
                    <button
                      onClick={() => triggerBillUpload(order.id)}
                      disabled={uploadingFor === order.id}
                      className="text-xs font-semibold bg-turmeric-300 hover:bg-turmeric-500 text-tamarind-900 px-3 py-2 rounded-full transition-colors disabled:opacity-50"
                    >
                      {uploadingFor === order.id
                        ? "Uploading..."
                        : order.bill_url
                        ? "Replace with Custom PDF"
                        : "Upload Custom Bill (PDF)"}
                    </button>
                  ) : null}

                  {order.bill_url && (
                    <a
                      href={order.bill_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline text-tamarind-800/60"
                    >
                      View bill
                    </a>
                  )}

                  <a
                    href={buildStatusUpdateWhatsappLink(order, upi)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-full transition-colors ml-auto"
                  >
                    Send WhatsApp Update
                  </a>

                  <button
                    onClick={() => deleteOrder(order)}
                    className="text-xs font-semibold bg-vermillion-600 hover:bg-vermillion-500 text-white px-3 py-2 rounded-full transition-colors"
                  >
                    Delete Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <AdminGuard>
      <OrdersDashboard />
    </AdminGuard>
  );
}
