import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
} from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Pacifica Account Health",
  description:
    "Live account health, liquidation-risk, and funding analytics for Pacifica perpetuals.",
  openGraph: {
    title: "Pacifica Account Health",
    description:
      "Live account health, liquidation-risk, and funding analytics for Pacifica perpetuals.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pacifica Account Health",
    description:
      "Live account health, liquidation-risk, and funding analytics for Pacifica perpetuals.",
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
      className={`${bricolage.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#07100f] text-[#f7f1df]">
        {children}
      </body>
    </html>
  );
}
