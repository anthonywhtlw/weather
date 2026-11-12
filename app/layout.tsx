import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weather — Current Conditions",
  description: "Live temperature and humidity for anywhere in the world.",
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
