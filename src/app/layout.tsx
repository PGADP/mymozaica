import type { Metadata } from "next";
import { Inter, Playfair_Display, Crimson_Text } from "next/font/google";
import "./globals.css"; // ⚠️ CETTE LIGNE EST CRUCIALE

// Configuration des polices
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const crimson = Crimson_Text({ weight: ["400", "600"], subsets: ["latin"], variable: "--font-crimson" });

export const metadata: Metadata = {
  title: "My Mozaïca - Votre biographie",
  description: "Transformez vos souvenirs en une œuvre éternelle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${playfair.variable} ${crimson.variable} font-sans antialiased bg-[#FDF6E3] text-[#2C3E50]`}>
        {children}
      </body>
    </html>
  );
}