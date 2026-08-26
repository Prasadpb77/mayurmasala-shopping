"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import { useCart } from "@/components/CartContext";
import { validateCheckout } from "@/lib/validation";
import { lookupPincode } from "@/lib/pincode";
import { createClient } from "@/lib/supabaseClient";
import {
  resolveDeliveryZone,
  getZoneCharge,
  getZoneLabel,
  DEFAULT_DELIVERY_ZONES,
  DeliveryZoneSettings,
  DeliveryZoneKey,
} from "@/lib/deliveryZones";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [honeypot, setHoneypot] = useState(""); // spam trap, kept empty by real users
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delivery zone charge preview — resolved as soon as we have a verified
  // pincode. The actual charge used on the order is always recomputed
  // server-side; this is just so the customer sees it before placing the order.
  const [zoneSettings, setZoneSettings] = useState<DeliveryZoneSettings>(DEFAULT_DELIVERY_ZONES);
  const [zoneKey, setZoneKey] = useState<DeliveryZoneKey | null>(null);

  useEffect(() => {
    async function loadZoneSettings() {
      const supabase = createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "delivery_zones")
        .maybeSingle();
      if (data?.value) setZoneSettings(data.value as DeliveryZoneSettings);
    }
    loadZoneSettings();
  }, []);

  const deliveryCharge = zoneKey ? getZoneCharge(zoneSettings, zoneKey) : 0;
  const grandTotal = total + deliveryCharge;

  function handlePincodeChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
    setPincode(digitsOnly);
    setPincodeStatus("idle");
    setZoneKey(null);

    if (lookupTimer.current) clearTimeout(lookupTimer.current);

    if (digitsOnly.length === 6) {
      setPincodeStatus("loading");
      lookupTimer.current = setTimeout(async () => {
        const result = await lookupPincode(digitsOnly);
        if (result.found) {
          setCity(result.city);
          setState(result.state);
          setPincodeStatus("found");
          setZoneKey(resolveDeliveryZone(result.city, result.state));
        } else {
          setPincodeStatus("not_found");
        }
      }, 400);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const result = validateCheckout({
      name,
      phone,
      address_line1: addressLine1,
      address_line2: addressLine2,
      pincode,
      city,
      state,
      honeypot,
    });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    // We only accept orders with a PIN code we could actually verify with
    // India Post — anywhere in India. Block submission client-side too, so
    // the customer sees the problem immediately instead of after a round trip.
    if (pincodeStatus !== "found") {
      setErrors({
        pincode:
          pincodeStatus === "not_found"
            ? "We couldn't verify this PIN code. Please double-check and re-enter it."
            : "Please enter a valid 6-digit PIN code and wait for it to be verified.",
      });
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
          address_line1: addressLine1,
          address_line2: addressLine2,
          pincode,
          city,
          state,
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
              <label className="block text-sm font-semibold text-tamarind-900 mb-1">
                Address Line 1 (Flat / House no., Street)
              </label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full border border-tamarind-900/20 rounded-xl px-4 py-3 bg-white/70"
                placeholder="e.g. Flat 302, Shreeji Apartments, Main Road"
              />
              {errors.address_line1 && (
                <p className="text-vermillion-500 text-xs mt-1">{errors.address_line1}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-tamarind-900 mb-1">
                Address Line 2 <span className="font-normal text-tamarind-800/50">(Landmark, optional)</span>
              </label>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                className="w-full border border-tamarind-900/20 rounded-xl px-4 py-3 bg-white/70"
                placeholder="e.g. Near Shagun Chowk"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-tamarind-900 mb-1">PIN Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className="w-full border border-tamarind-900/20 rounded-xl px-4 py-3 bg-white/70"
                  placeholder="411017"
                  maxLength={6}
                />
                {errors.pincode && <p className="text-vermillion-500 text-xs mt-1">{errors.pincode}</p>}
                {pincodeStatus === "loading" && (
                  <p className="text-xs text-tamarind-800/50 mt-1">Looking up city...</p>
                )}
                {pincodeStatus === "not_found" && (
                  <p className="text-xs text-vermillion-500 mt-1">
                    We couldn&apos;t verify this PIN code with India Post. Orders can only be
                    placed with a valid PIN code — please double-check and re-enter it.
                  </p>
                )}
                {pincodeStatus === "found" && zoneKey && (
                  <p className="text-xs text-green-700 mt-1">
                    ✓ Verified — delivery zone: {getZoneLabel(zoneSettings, zoneKey)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-tamarind-900 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border border-tamarind-900/20 rounded-xl px-4 py-3 bg-white/70"
                  placeholder="Pimpri-Chinchwad"
                />
                {errors.city && <p className="text-vermillion-500 text-xs mt-1">{errors.city}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-tamarind-900 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full border border-tamarind-900/20 rounded-xl px-4 py-3 bg-white/70"
              />
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
              {submitting ? "Placing your order..." : `Place Order · ₹${grandTotal.toFixed(0)} (COD)`}
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
              <div className="border-t border-turmeric-300/30 pt-3 flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{total.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>
                  Delivery
                  {zoneKey && (
                    <span className="text-tamarind-800/50"> ({getZoneLabel(zoneSettings, zoneKey)})</span>
                  )}
                </span>
                <span>{zoneKey ? `₹${deliveryCharge.toFixed(0)}` : "—"}</span>
              </div>
              <div className="border-t border-turmeric-300/30 pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-vermillion-500">₹{grandTotal.toFixed(0)}</span>
              </div>
              {!zoneKey && (
                <p className="text-xs text-tamarind-800/50">
                  Enter a valid PIN code to see delivery charges.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
