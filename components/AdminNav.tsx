"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

const links = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/delivery", label: "Delivery Charges" },
  { href: "/admin/settings", label: "Site Settings" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <nav className="bg-tamarind-900 text-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === l.href
                  ? "bg-vermillion-500 text-cream"
                  : "text-cream/70 hover:text-cream"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-cream/50 hover:text-cream" target="_blank">
            View site ↗
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs bg-cream/10 hover:bg-cream/20 px-3 py-1.5 rounded-full"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
