import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "x402 for Starknet — Trustless HTTP-Native Payments",
  description: "Accept micropayments in one line of code. No approvals. No gas for users. SNIP-9 Outside Execution on Starknet.",
  keywords: ["x402", "starknet", "payments", "snip-9", "micropayments", "usdc", "web3"],
  openGraph: {
    title: "x402 for Starknet",
    description: "Trustless HTTP-native payments via SNIP-9 Outside Execution.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@adipundir",
    site: "@starknetx402",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
