import { LenisProvider } from '@/components/lenis-provider';
import type { Metadata, Viewport } from "next";
import { Inter, Outfit, JetBrains_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: 'swap', adjustFontFallback: true, preload: true });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: 'swap', adjustFontFallback: true, preload: false });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: 'swap', adjustFontFallback: true, preload: false });
const cormorant = Cormorant_Garamond({ weight: ["400", "600", "700"], style: ["normal", "italic"], subsets: ["latin"], variable: "--font-cormorant", display: 'swap', adjustFontFallback: true, preload: true });

export const metadata: Metadata = {
  title: "100x Civilization — The opportunity network for 100xEngineers alumni.",
  description: "Invite-only. Live now. Post roles, find co-founders, and make warm intros across all 100xEngineers cohorts.",
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  openGraph: {
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${jetbrains.variable} ${cormorant.variable} dark`}>
      <body className="bg-brand-black text-brand-white antialiased selection:bg-brand-neon selection:text-brand-black">
        <LenisProvider>
          {children}
        </LenisProvider>
      </body>
    </html>
  );
}
