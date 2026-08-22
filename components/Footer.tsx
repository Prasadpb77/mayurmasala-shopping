interface FooterProps {
  tagline?: string;
  hours?: string;
}

export default function Footer({ tagline, hours }: FooterProps) {
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Mayur Masala and Pooja Center";
  const address = process.env.NEXT_PUBLIC_SHOP_ADDRESS || "Pimpri, Pune, Maharashtra";
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE || "";

  return (
    <footer id="contact" className="bg-tamarind-900 text-cream/90 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-10 sm:grid-cols-3">
        <div>
          <h3 className="font-display text-xl text-turmeric-300 mb-2">{shopName}</h3>
          <p className="text-sm text-cream/70">{tagline || "Trusted since 1992."}</p>
        </div>
        <div>
          <h4 className="text-sm uppercase tracking-wide text-turmeric-300 mb-2">Visit Us</h4>
          <p className="text-sm text-cream/70">{address}</p>
          {hours && <p className="text-sm text-cream/70 mt-1">{hours}</p>}
        </div>
        <div>
          <h4 className="text-sm uppercase tracking-wide text-turmeric-300 mb-2">Contact</h4>
          {phone && <p className="text-sm text-cream/70">{phone}</p>}
          <a
            href="/track"
            className="inline-block mt-2 text-sm text-turmeric-300 hover:underline"
          >
            Track your order →
          </a>
        </div>
      </div>
      <div className="text-center text-xs text-cream/40 pb-6">
        © {new Date().getFullYear()} {shopName}. Serving Pimpri since 1992.
      </div>
    </footer>
  );
}
