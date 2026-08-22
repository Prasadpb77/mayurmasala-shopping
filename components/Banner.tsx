interface BannerProps {
  enabled: boolean;
  text: string;
  link?: string;
}

export default function Banner({ enabled, text, link }: BannerProps) {
  if (!enabled || !text) return null;

  const content = (
    <div className="marquee-track flex whitespace-nowrap gap-16 py-2 text-sm font-medium">
      <span>{text}</span>
      <span aria-hidden>{text}</span>
    </div>
  );

  return (
    <div className="bg-turmeric-500 text-tamarind-900 overflow-hidden border-b border-tamarind-900/10">
      <div className="max-w-6xl mx-auto px-4 overflow-hidden">
        {link ? (
          <a href={link} className="block hover:underline">
            {content}
          </a>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
