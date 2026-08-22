"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabaseClient";
import { Product } from "@/lib/types";

const EMPTY_FORM = {
  id: "",
  name: "",
  description: "",
  price: "",
  category: "General",
  active: true,
};

function ProductsAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadProducts() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setProducts(data as Product[]);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setEditingId(null);
  }

  function startEdit(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      category: product.category || "General",
      active: product.active,
    });
    setImagePreview(product.image_url || null);
    setEditingId(product.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      alert("Name and price are required.");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    let imageUrl: string | undefined;
    if (imageFile) {
      const path = `${Date.now()}-${imageFile.name.replace(/\s+/g, "-")}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, imageFile, { upsert: true });
      if (uploadError) {
        alert("Image upload failed: " + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);
      imageUrl = publicUrlData.publicUrl;
    }

    const payload: any = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price),
      category: form.category.trim() || "General",
      active: form.active,
    };
    if (imageUrl) payload.image_url = imageUrl;

    if (editingId) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingId);
      if (error) alert("Update failed: " + error.message);
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) alert("Create failed: " + error.message);
    }

    setSaving(false);
    resetForm();
    loadProducts();
  }

  async function toggleActive(product: Product) {
    const supabase = createClient();
    await supabase.from("products").update({ active: !product.active }).eq("id", product.id);
    loadProducts();
  }

  async function deleteProduct(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    const supabase = createClient();
    await supabase.from("products").delete().eq("id", product.id);
    loadProducts();
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
            {editingId ? "Edit Product" : "Add New Product"}
          </h2>

          <div>
            <label className="block text-sm font-semibold text-tamarind-900 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white"
              placeholder="e.g. Kanda Lasun Masala 200g"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-tamarind-900 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white"
              placeholder="Short description shown to customers"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-tamarind-900 mb-1">Price (₹)</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-tamarind-900 mb-1">Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-tamarind-900/20 rounded-xl px-3 py-2 bg-white"
                placeholder="Masala / Pooja Samagri"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-tamarind-900 mb-1">Photo</label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
            {imagePreview && (
              <div className="relative w-24 h-24 mt-2 rounded-xl overflow-hidden border border-tamarind-900/10">
                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-tamarind-900">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Visible on website
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-vermillion-500 hover:bg-vermillion-400 disabled:opacity-50 text-cream font-semibold py-2.5 rounded-full transition-colors"
            >
              {saving ? "Saving..." : editingId ? "Update Product" : "Add Product"}
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
            All Products ({products.length})
          </h2>
          {loading ? (
            <p className="text-tamarind-800/60">Loading...</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white/70 border border-turmeric-300/30 rounded-2xl p-4 flex gap-3"
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-turmeric-50 shrink-0">
                    {product.image_url ? (
                      <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🌶️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-tamarind-900 text-sm truncate">{product.name}</p>
                    <p className="text-xs text-tamarind-800/60">
                      ₹{product.price} · {product.category}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => startEdit(product)}
                        className="text-xs underline text-tamarind-800/70"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(product)}
                        className="text-xs underline text-tamarind-800/70"
                      >
                        {product.active ? "Hide" : "Show"}
                      </button>
                      <button
                        onClick={() => deleteProduct(product)}
                        className="text-xs underline text-vermillion-500"
                      >
                        Delete
                      </button>
                    </div>
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

export default function AdminProductsPage() {
  return (
    <AdminGuard>
      <ProductsAdmin />
    </AdminGuard>
  );
}
