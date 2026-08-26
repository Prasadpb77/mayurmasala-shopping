"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabaseClient";
import {
  DEFAULT_DELIVERY_ZONES,
  DeliveryZoneSettings,
  DeliveryZoneKey,
} from "@/lib/deliveryZones";

const ZONE_ORDER: DeliveryZoneKey[] = [
  "pune_local",
  "mumbai",
  "metro",
  "nagpur",
  "maharashtra",
  "rest_of_india",
];

function DeliveryZonesSettings() {
  const [zones, setZones] = useState<DeliveryZoneSettings>(DEFAULT_DELIVERY_ZONES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "delivery_zones")
        .maybeSingle();
      if (data?.value) setZones(data.value as DeliveryZoneSettings);
      setLoading(false);
    }
    load();
  }, []);

  function updateCharge(key: DeliveryZoneKey, charge: number) {
    setZones((prev) => ({
      ...prev,
      [key]: { ...prev[key], charge: Number.isFinite(charge) ? charge : 0 },
    }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("site_settings")
      .update({ value: zones })
      .eq("key", "delivery_zones");
    setSaving(false);
    if (error) {
      alert("Failed to save: " + error.message);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="min-h-screen bg-cream">
      <AdminNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-display text-2xl text-tamarind-900 mb-2">Delivery Charges</h1>
        <p className="text-sm text-tamarind-800/70 mb-6">
          Set the delivery charge (₹) for each zone. This is looked up automatically from the
          customer&apos;s PIN code and added to their order total at checkout — no manual entry needed
          per order.
        </p>

        {loading ? (
          <p className="text-tamarind-800/60">Loading...</p>
        ) : (
          <div className="bg-white/70 border border-turmeric-300/30 rounded-2xl p-5 space-y-4">
            {ZONE_ORDER.map((key) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-tamarind-900 text-sm">{zones[key]?.label}</p>
                  <p className="text-xs text-tamarind-800/50">{key}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-tamarind-800/60">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={zones[key]?.charge ?? 0}
                    onChange={(e) => updateCharge(key, parseFloat(e.target.value))}
                    className="w-24 border border-tamarind-900/20 rounded-lg px-3 py-2 bg-white text-right"
                  />
                </div>
              </div>
            ))}

            <div className="border-t border-turmeric-300/20 pt-4 flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="text-sm font-semibold bg-vermillion-500 hover:bg-vermillion-400 text-cream px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {saved && <span className="text-sm text-green-700">Saved ✓</span>}
            </div>
          </div>
        )}

        <p className="text-xs text-tamarind-800/50 mt-4">
          Zone is decided automatically: pincodes in Pune → Pune (Local), Mumbai → Mumbai, Nagpur →
          Nagpur, other major metro cities (Delhi, Bengaluru, Chennai, Kolkata, Hyderabad, Ahmedabad)
          → Other Metro Cities, any other Maharashtra pincode → Rest of Maharashtra, everything else
          in India → Rest of India. Orders with an unrecognized PIN code are rejected.
        </p>
      </main>
    </div>
  );
}

export default function AdminDeliveryPage() {
  return (
    <AdminGuard>
      <DeliveryZonesSettings />
    </AdminGuard>
  );
}
