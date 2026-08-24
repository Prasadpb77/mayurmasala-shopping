import { createClient } from "@supabase/supabase-js";
import { Product, Review } from "./types";

// Server-side read-only client (uses anon key; RLS restricts to public data)
function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function getActiveProducts(): Promise<Product[]> {
  const supabase = serverClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getActiveProducts error", error);
    return [];
  }
  return data as Product[];
}

export async function getFeaturedReviews(): Promise<Review[]> {
  const supabase = serverClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("featured", true)
    .eq("rating", 5)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getFeaturedReviews error", error);
    return [];
  }
  return data as Review[];
}

export interface SiteSettings {
  banner: { enabled: boolean; text: string; link?: string };
  about: { title: string; body: string };
  footer: { tagline: string; hours: string };
  instagram_reels: { urls: string[] };
  upi: { vpa: string; payee_name: string };
}

const DEFAULT_SETTINGS: SiteSettings = {
  banner: { enabled: false, text: "", link: "" },
  about: {
    title: "Our Story",
    body: "Founded in 1992, Mayur Masala and Pooja Center has been Pimpri's trusted home for pure, freshly ground masalas and complete pooja samagri.",
  },
  footer: { tagline: "Trusted since 1992.", hours: "" },
  instagram_reels: { urls: ["", "", ""] },
  upi: { vpa: "", payee_name: "" },
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = serverClient();
  const { data, error } = await supabase.from("site_settings").select("*");

  if (error || !data) {
    console.error("getSiteSettings error", error);
    return DEFAULT_SETTINGS;
  }

  const settings = { ...DEFAULT_SETTINGS };
  for (const row of data) {
    if (row.key === "banner") settings.banner = row.value;
    if (row.key === "about") settings.about = row.value;
    if (row.key === "footer") settings.footer = row.value;
    if (row.key === "instagram_reels") settings.instagram_reels = row.value;
    if (row.key === "upi") settings.upi = row.value;
  }
  return settings;
}
