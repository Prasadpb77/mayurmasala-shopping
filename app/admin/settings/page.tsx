"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabaseClient";

function SettingsAdmin() {
  const [banner, setBanner] = useState({ enabled: false, text: "", link: "" });
  const [about, setAbout] = useState({ title: "", body: "" });
  const [footer, setFooter] = useState({ tagline: "", hours: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("site_settings").select("*");
      data?.forEach((row) => {
        if (row.key === "banner") setBanner(row.value);
        if (row.key === "about") setAbout(row.value);
        if (row.key === "footer") setFooter(row.value);
      });
      setLoading(false);
    }
    load();
  }, []);

  async function save(key: string, value: any) {
    setSaving(key);
    const supabase = createClient();
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value }, { onConflict: "key" });
    setSaving(null);
    if (error) alert("Save failed: " + error.message);
    else alert("Saved! Changes will appear on the site within a few seconds.");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <AdminNav />
        <p className="text-center py-20 text-tamarind-800/60">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <AdminNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* BANNER */}
        <section className="bg-white/70 border border-turmeric-300/30 rounded-2xl p-5">
          <h2 className="font-display text-xl text-tamarind-900 mb-4">Marketing Banner</h2>
          <label className="flex items-center gap-2 text-sm mb-3">
            <input
              type="checkbox"
              checked={banner.enabled}
              onChange={(e) => setBanner({ ...banner, enabled: e.target.checked })}
            />
            Show banner at top of website
          </label>
          <textarea
            value={banner.text}
            onChange={(e) => setBanner({ ...banner, text: e.target.value })}
            rows={2}
            className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white mb-3"
            placeholder="e.g. Diwali special offer — 10% off on pooja kits this week!"
          />
          <input
            value={banner.link}
            onChange={(e) => setBanner({ ...banner, link: e.target.value })}
            className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white mb-3"
            placeholder="Optional link (e.g. #shop)"
          />
          <button
            onClick={() => save("banner", banner)}
            disabled={saving === "banner"}
            className="bg-vermillion-500 hover:bg-vermillion-400 text-cream font-semibold px-5 py-2 rounded-full text-sm disabled:opacity-50"
          >
            {saving === "banner" ? "Saving..." : "Save Banner"}
          </button>
        </section>

        {/* ABOUT */}
        <section className="bg-white/70 border border-turmeric-300/30 rounded-2xl p-5">
          <h2 className="font-display text-xl text-tamarind-900 mb-4">About / Our Story</h2>
          <input
            value={about.title}
            onChange={(e) => setAbout({ ...about, title: e.target.value })}
            className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white mb-3"
            placeholder="Section title"
          />
          <textarea
            value={about.body}
            onChange={(e) => setAbout({ ...about, body: e.target.value })}
            rows={6}
            className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white mb-3"
            placeholder="Tell your shop's story..."
          />
          <button
            onClick={() => save("about", about)}
            disabled={saving === "about"}
            className="bg-vermillion-500 hover:bg-vermillion-400 text-cream font-semibold px-5 py-2 rounded-full text-sm disabled:opacity-50"
          >
            {saving === "about" ? "Saving..." : "Save About Section"}
          </button>
        </section>

        {/* FOOTER */}
        <section className="bg-white/70 border border-turmeric-300/30 rounded-2xl p-5">
          <h2 className="font-display text-xl text-tamarind-900 mb-4">Footer</h2>
          <input
            value={footer.tagline}
            onChange={(e) => setFooter({ ...footer, tagline: e.target.value })}
            className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white mb-3"
            placeholder="Tagline"
          />
          <input
            value={footer.hours}
            onChange={(e) => setFooter({ ...footer, hours: e.target.value })}
            className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white mb-3"
            placeholder="Opening hours"
          />
          <button
            onClick={() => save("footer", footer)}
            disabled={saving === "footer"}
            className="bg-vermillion-500 hover:bg-vermillion-400 text-cream font-semibold px-5 py-2 rounded-full text-sm disabled:opacity-50"
          >
            {saving === "footer" ? "Saving..." : "Save Footer"}
          </button>
        </section>
      </main>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <SettingsAdmin />
    </AdminGuard>
  );
}
