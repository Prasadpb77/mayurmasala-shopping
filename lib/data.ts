import { createClient } from "@supabase/supabase-js";
import { Product } from "./types";

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

export interface SiteSettings {
  banner: { enabled: boolean; text: string; link?: string };
  about: { title: string; body: string };
  footer: { tagline: string; hours: string };
}

const DEFAULT_SETTINGS: SiteSettings = {
  banner: { enabled: false, text: "", link: "" },
  about: {
    title: "Our Story",
    body: "Founded in 1992, Mayur Masala and Pooja Center has been Pimpri's trusted home for pure, freshly ground masalas and complete pooja samagri.",
  },
  footer: { tagline: "Trusted since 1992.", hours: "" },
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
  }
  return settings;
}
