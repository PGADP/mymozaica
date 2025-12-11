import type { Metadata } from "next";
import { Abhaya_Libre, Roboto } from "next/font/google";
import "./globals.css";

// Configuration des polices
const abhayaLibre = Abhaya_Libre({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-heading"
});
const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body"
});

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
      <body className={`${abhayaLibre.variable} ${roboto.variable} font-body antialiased bg-bg-main text-text-main`}>
        {children}
      </body>
    </html>
  );
}