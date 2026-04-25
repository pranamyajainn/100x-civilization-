import { LenisProvider } from '@/components/lenis-provider';
import type { Metadata, Viewport } from "next";
import { Inter, Outfit, JetBrains_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: 'swap', adjustFontFallback: true, preload: true });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: 'swap', adjustFontFallback: true, preload: false });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: 'swap', adjustFontFallback: true, preload: false });
const cormorant = Cormorant_Garamond({ weight: ["400", "600", "700"], style: ["normal", "italic"], subsets: ["latin"], variable: "--font-cormorant", display: 'swap', adjustFontFallback: true, preload: true });

export const metadata: Metadata = {
  title: "The 100x Civilization. Members-only economic engine for 100x cohorts.",
  description: "Seven cohorts. One civilization. A community proposal for 100x Engineers.",
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
