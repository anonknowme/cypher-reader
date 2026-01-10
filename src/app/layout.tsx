import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
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
  title: "Cypher Reader",
  description: "비트코인을 영어 원문으로 직접 읽고, 듣고, 말하면서 공부하세요!",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "resizes-content",
};

import { LightningDonateButton } from "@/components/LightningDonateButton";
import { DonationPromptProvider } from "@/contexts/DonationPromptContext";

// ...

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
        <DonationPromptProvider>
          {children}
          <div className="fixed bottom-6 right-6 z-50">
            <LightningDonateButton variant="icon" />
          </div>
        </DonationPromptProvider>
        <Analytics />
      </body>
    </html>
  );
}
