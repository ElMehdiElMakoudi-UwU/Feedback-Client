import type { Metadata } from "next";
import { Playfair_Display, EB_Garamond, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/language-context";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-body-fr",
  subsets: ["latin"],
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  variable: "--font-body-ar",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "Sindibad Restaurant",
  description: "Menu et avis clients — Restaurant Sindibad",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${playfair.variable} ${ebGaramond.variable} ${notoNaskhArabic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full w-full overflow-x-hidden bg-[var(--sindibad-cream)] text-[var(--sindibad-ink)]">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
