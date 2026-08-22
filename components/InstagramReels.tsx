"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    instgrm?: {
      Embeds: { process: () => void };
    };
  }
}

function normalizeReelUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export default function InstagramReels({ urls }: { urls: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const validUrls = urls.map(normalizeReelUrl).filter(Boolean);

  useEffect(() => {
    if (validUrls.length === 0) return;

    function processEmbeds() {
      if (window.instgrm) {
        window.instgrm.Embeds.process();
      }
    }

    const existingScript = document.getElementById("instagram-embed-script");
    if (existingScript) {
      processEmbeds();
    } else {
      const script = document.createElement("script");
      script.id = "instagram-embed-script";
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.onload = processEmbeds;
      document.body.appendChild(script);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.join(",")]);

  if (validUrls.length === 0) return null;

  const goTo = (index: number) => {
    const total = validUrls.length;
    setCurrentIndex(((index % total) + total) % total);
  };

  return (
    <div ref={containerRef} className="w-full">
      <a
        href="https://www.instagram.com/mayurmasalacenter/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-xs font-semibold text-turmeric-300 hover:text-turmeric-500 transition-colors mb-4"
      >
        <span aria-hidden>📸</span> Follow @mayurmasalacenter
      </a>

      <div className="relative flex items-center justify-center">
        {/* Left arrow */}
        <button
          type="button"
          onClick={() => goTo(currentIndex - 1)}
          aria-label="Previous reel"
          className="absolute left-0 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-tamarind-900/70 text-cream hover:bg-tamarind-900 transition-colors shadow-lg"
        >
          ◀
        </button>

        {/* Reel container - 85% height */}
        <div className="w-full max-w-md mx-10 overflow-hidden">
          <div
            className="transition-opacity duration-500"
            style={{ height: "85vh", transform: "scale(0.85)", transformOrigin: "top center" }}
          >
            {validUrls.slice(0, 3).map((url, idx) => (
              <div
                key={url + idx}
                className={idx === currentIndex ? "block" : "hidden"}
              >
                <blockquote
                  className="instagram-media"
                  data-instgrm-permalink={url}
                  data-instgrm-version="14"
                  style={{
                    background: "#FFF",
                    border: 0,
                    borderRadius: "12px",
                    margin: 0,
                    minWidth: "auto",
                    width: "100%",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right arrow */}
        <button
          type="button"
          onClick={() => goTo(currentIndex + 1)}
          aria-label="Next reel"
          className="absolute right-0 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-tamarind-900/70 text-cream hover:bg-tamarind-900 transition-colors shadow-lg"
        >
          ▶
        </button>
      </div>

      {/* Dot indicators */}
      {validUrls.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {validUrls.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => goTo(idx)}
              aria-label={`Go to reel ${idx + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                idx === currentIndex ? "bg-turmeric-300" : "bg-tamarind-900/30 hover:bg-tamarind-900/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}