import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medford room station",
  description:
    "A DHT22 on an ESP32 posts temperature and humidity to PostgreSQL every five seconds; this page is the console.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh text-white antialiased">{children}</body>
    </html>
  );
}
