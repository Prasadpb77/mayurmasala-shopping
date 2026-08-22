"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-tamarind-900 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-cream rounded-2xl p-8 w-full max-w-sm space-y-4"
      >
        <h1 className="font-display text-2xl text-tamarind-900 text-center mb-2">
          Mayur Masala — Dashboard
        </h1>
        <div>
          <label className="block text-sm font-semibold text-tamarind-900 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-tamarind-900/20 rounded-xl px-4 py-3 bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-tamarind-900 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-tamarind-900/20 rounded-xl px-4 py-3 bg-white"
          />
        </div>
        {error && <p className="text-vermillion-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-vermillion-500 hover:bg-vermillion-400 disabled:opacity-50 text-cream font-semibold py-3 rounded-full transition-colors"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}
