"use client";

import { useEffect, useRef } from "react";

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
      <div className="grid grid-cols-1 gap-4">
        {validUrls.slice(0, 3).map((url, idx) => (
          <blockquote
            key={url + idx}
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
        ))}
      </div>
    </div>
  );
}
