import Header from "@/components/Header";
import Banner from "@/components/Banner";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CartDrawer from "@/components/CartDrawer";
import { getActiveProducts, getSiteSettings } from "@/lib/data";

export const revalidate = 30;

export default async function HomePage() {
  const [products, settings] = await Promise.all([
    getActiveProducts(),
    getSiteSettings(),
  ]);

  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Mayur Masala and Pooja Center";

  const categories = Array.from(
    new Set(products.map((p) => p.category || "General"))
  );

  return (
    <>
      <Header />
      <Banner {...settings.banner} />
      <CartDrawer />

      {/* HERO */}
      <section className="relative overflow-hidden bg-diya-glow bg-tamarind-900 text-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-turmeric-300 border border-turmeric-300/40 rounded-full px-3 py-1 mb-5">
              Est. 1992 · Pimpri
            </span>
            <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-5">
              Pure Masalas. Complete Pooja Samagri.
              <span className="block text-turmeric-300">Straight from Pimpri&apos;s oldest shop.</span>
            </h1>
            <p className="text-cream/80 text-base sm:text-lg mb-8 max-w-md">
              Ground fresh, packed with trust — for over three decades {shopName}
              has served your kitchen and your puja ghar with the same purity, every single day.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#shop"
                className="bg-vermillion-500 hover:bg-vermillion-400 transition-colors text-cream font-semibold px-6 py-3 rounded-full"
              >
                Shop Now
              </a>
              <a
                href="#about"
                className="border border-cream/30 hover:border-turmeric-300 transition-colors px-6 py-3 rounded-full font-semibold"
              >
                Our Story
              </a>
            </div>
          </div>
          <div className="relative aspect-square rounded-3xl bg-gradient-to-br from-turmeric-500/20 to-vermillion-500/20 border border-turmeric-300/20 flex items-center justify-center text-8xl">
            🪔🌶️
          </div>
        </div>
      </section>

      {/* SHOP */}
      <section id="shop" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-display text-3xl text-tamarind-900">Shop Our Range</h2>
        </div>

        {products.length === 0 ? (
          <p className="text-tamarind-800/60 text-center py-20">
            Products coming soon. Please check back shortly, or contact the shop directly.
          </p>
        ) : (
          categories.map((cat) => {
            const items = products.filter((p) => (p.category || "General") === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="mb-12">
                <h3 className="text-lg font-semibold text-vermillion-500 mb-4 capitalize">{cat}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ABOUT */}
      <section id="about" className="bg-turmeric-50 border-y border-turmeric-300/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="font-display text-3xl text-tamarind-900 mb-6">
            {settings.about.title}
          </h2>
          <p className="text-tamarind-800/80 leading-relaxed whitespace-pre-line">
            {settings.about.body}
          </p>
        </div>
      </section>

      <Footer tagline={settings.footer.tagline} hours={settings.footer.hours} />
    </>
  );
}
