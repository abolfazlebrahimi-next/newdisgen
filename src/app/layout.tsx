import type { Metadata, Viewport } from "next";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/900.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOCO — شهر بازی",
  description:
    "بازسازی صفحهٔ شهر بازی LOCO با Next.js، TypeScript و مدل‌های سه‌بعدی مجموعهٔ Kenney که در همین مخزن هستند.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#79c9ef",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-sky-200 font-sans antialiased select-none">{children}</body>
    </html>
  );
}
