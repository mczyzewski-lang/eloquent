import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { SITE } from "@/lib/site";
import { ServiceWorker } from "@/components/site/ServiceWorker";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin", "latin-ext"], variable: "--font-nunito", display: "swap" });
// Baloo 2: miękki, zaokrąglony krój z pełnym zestawem polskich znaków (Fredoka ich nie ma)
const display = Baloo_2({ subsets: ["latin", "latin-ext"], variable: "--font-display-face", display: "swap", weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.sloganPl}`, template: `%s · Elofik` },
  description: SITE.description,
  applicationName: "Elofik",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: SITE.url,
    siteName: "Elofik",
    title: "Elofik — codziennie jedno mądre słowo",
    description: SITE.description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Elofik — mały elf opowieści" }],
  },
  twitter: { card: "summary_large_image", title: "Elofik — codziennie jedno mądre słowo", description: SITE.description, images: ["/og.png"] },
  appleWebApp: { capable: true, title: "Elofik", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#FFF9F0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${nunito.variable} ${display.variable}`}>
      <body className="min-h-dvh">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
