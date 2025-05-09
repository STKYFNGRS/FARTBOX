import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import AppKitProvider from "../context/AppKitProvider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fart.box: Gas Dominance",
  description: "A web3 game of territory control with unique gas-based NFTs on Base network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookie = headers().get("cookie") || null;

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased`}
      >
        <AppKitProvider cookies={cookie}>{children}</AppKitProvider>
      </body>
    </html>
  );
}
