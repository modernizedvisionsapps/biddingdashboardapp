import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Modernized Visions SaaS Template",
  description: "Reusable Modernized Visions SaaS application template",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
