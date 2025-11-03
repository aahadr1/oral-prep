import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oral Prep - Préparation aux examens oraux",
  description: "Préparez vos examens oraux avec des outils intelligents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

