import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";

export const metadata: Metadata = {
  title: "Mayur Masala and Pooja Center | Pimpri's Oldest Since 1992",
  description:
    "Mayur Masala and Pooja Center — Pimpri's trusted masala and pooja samagri store since 1992. Fresh ground masalas, complete pooja essentials, home delivery, cash on delivery.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
