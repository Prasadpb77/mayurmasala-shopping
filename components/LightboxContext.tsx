"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import Image from "next/image";

interface LightboxItem {
  src: string;
  alt: string;
}

interface LightboxContextValue {
  open: (item: LightboxItem) => void;
  close: () => void;
}

const LightboxContext = createContext<LightboxContextValue | undefined>(undefined);

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<LightboxItem | null>(null);

  return (
    <LightboxContext.Provider
      value={{
        open: (i) => setItem(i),
        close: () => setItem(null),
      }}
    >
      {children}

      {item && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 sm:p-10"
          onClick={() => setItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label={item.alt}
        >
          <button
            onClick={() => setItem(null)}
            aria-label="Close image"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            &times;
          </button>
          <div
            className="relative w-full max-w-2xl aspect-square"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="90vw"
              className="object-contain rounded-xl"
              priority
            />
          </div>
        </div>
      )}
    </LightboxContext.Provider>
  );
}

export function useLightbox() {
  const ctx = useContext(LightboxContext);
  if (!ctx) throw new Error("useLightbox must be used within LightboxProvider");
  return ctx;
}
