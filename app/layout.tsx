import type { Metadata, Viewport } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: 'swap' });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: 'swap' });

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
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${jetbrains.variable} dark scroll-smooth`}>
      <body className="bg-brand-black text-brand-white antialiased selection:bg-brand-neon selection:text-brand-black">
        {children}
      </body>
    </html>
  );
}
