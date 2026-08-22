"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabaseClient";
import { Review } from "@/lib/types";

const EMPTY_FORM = {
  id: "",
  author_name: "",
  rating: 5,
  review_text: "",
  review_date: "",
  featured: true,
};

function ReviewsAdmin() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (!error && data) setReviews(data as Review[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(review: Review) {
    setForm({
      id: review.id,
      author_name: review.author_name,
      rating: review.rating,
      review_text: review.review_text,
      review_date: review.review_date || "",
      featured: review.featured,
    });
    setEditingId(review.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.author_name.trim() || !form.review_text.trim()) {
      alert("Reviewer name and review text are required.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      author_name: form.author_name.trim(),
      rating: Number(form.rating),
      review_text: form.review_text.trim(),
      review_date: form.review_date || null,
      featured: form.featured,
    };

    if (editingId) {
      const { error } = await supabase.from("reviews").update(payload).eq("id", editingId);
      if (error) alert("Update failed: " + error.message);
    } else {
      const { error } = await supabase.from("reviews").insert(payload);
      if (error) alert("Create failed: " + error.message);
    }

    setSaving(false);
    resetForm();
    load();
  }

  async function toggleFeatured(review: Review) {
    const supabase = createClient();
    await supabase.from("reviews").update({ featured: !review.featured }).eq("id", review.id);
    load();
  }

  async function deleteReview(review: Review) {
    if (!confirm(`Delete review from "${review.author_name}"?`)) return;
    const supabase = createClient();
    await supabase.from("reviews").delete().eq("id", review.id);
    load();
  }

  return (
    <div className="min-h-screen bg-cream">
      <AdminNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-5 gap-8">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 bg-white/70 border border-turmeric-300/30 rounded-2xl p-5 h-fit space-y-4"
        >
          <h2 className="font-display text-xl text-tamarind-900">
            {editingId ? "Edit Review" : "Add Google Review"}
          </h2>
          <p className="text-xs text-tamarind-800/60 -mt-2">
            Copy a 5-star review from your Google Business listing and paste it here to show it on the website.
          </p>

          <div>
            <label className="block text-sm font-semibold text-tamarind-900 mb-1">Reviewer Name</label>
            <input
              value={form.author_name}
              onChange={(e) => setForm({ ...form, author_name: e.target.value })}
              className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white"
              placeholder="e.g. Priya Deshmukh"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-tamarind-900 mb-1">Rating</label>
              <select
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white"
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>{r} star{r > 1 ? "s" : ""}</option>
                ))}
              </select>
              <p className="text-[11px] text-tamarind-800/50 mt-1">Only 5-star reviews show on the homepage.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-tamarind-900 mb-1">Review Date</label>
              <input
                type="date"
                value={form.review_date}
                onChange={(e) => setForm({ ...form, review_date: e.target.value })}
                className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-tamarind-900 mb-1">Review Text</label>
            <textarea
              value={form.review_text}
              onChange={(e) => setForm({ ...form, review_text: e.target.value })}
              rows={4}
              className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white"
              placeholder="Paste the exact review text from Google"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-tamarind-900">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            Show on website
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-vermillion-500 hover:bg-vermillion-400 disabled:opacity-50 text-cream font-semibold py-2.5 rounded-full transition-colors"
            >
              {saving ? "Saving..." : editingId ? "Update Review" : "Add Review"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-full border border-tamarind-900/20 text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="lg:col-span-3">
          <h2 className="font-display text-xl text-tamarind-900 mb-4">
            All Reviews ({reviews.length})
          </h2>
          {loading ? (
            <p className="text-tamarind-800/60">Loading...</p>
          ) : reviews.length === 0 ? (
            <p className="text-tamarind-800/60 text-sm">
              No reviews added yet. Copy a few 5-star reviews from your Google listing using the form.
            </p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white/70 border border-turmeric-300/30 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-tamarind-900 text-sm">{review.author_name}</p>
                    <span className="text-turmeric-500 text-sm">
                      {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                    </span>
                  </div>
                  <p className="text-xs text-tamarind-800/70 mb-2">{review.review_text}</p>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(review)} className="text-xs underline text-tamarind-800/70">
                      Edit
                    </button>
                    <button onClick={() => toggleFeatured(review)} className="text-xs underline text-tamarind-800/70">
                      {review.featured ? "Hide" : "Show"}
                    </button>
                    <button onClick={() => deleteReview(review)} className="text-xs underline text-vermillion-500">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <AdminGuard>
      <ReviewsAdmin />
    </AdminGuard>
  );
}
