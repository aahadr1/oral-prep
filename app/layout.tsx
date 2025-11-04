import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oral Quiz - Quiz oraux intelligents",
  description: "Pratiquez vos examens oraux avec notre agent vocal intelligent",
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

