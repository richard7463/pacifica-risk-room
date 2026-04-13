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
  title: "Pacifica Risk Room",
  description:
    "Real-time risk, funding, liquidation, and account replay intelligence for Pacifica perpetuals.",
  openGraph: {
    title: "Pacifica Risk Room",
    description:
      "Real-time risk, funding, liquidation, and account replay intelligence for Pacifica perpetuals.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pacifica Risk Room",
    description:
      "Real-time risk, funding, liquidation, and account replay intelligence for Pacifica perpetuals.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f2ede3] text-[#14212f]">
        {children}
      </body>
    </html>
  );
}
