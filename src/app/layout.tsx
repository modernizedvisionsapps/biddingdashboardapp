import type { Metadata } from "next";
import { Chivo, Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const chivo = Chivo({
  subsets: ["latin"],
  variable: "--font-chivo",
});

export const metadata: Metadata = {
  title: "BidBoard",
  description: "Construction bid dashboard for tracking active bids, follow-ups, contacts, and status movement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${chivo.variable}`}>{children}</body>
    </html>
  );
}
