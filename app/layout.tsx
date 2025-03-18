import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutContent from "./components/LayoutContent";

export const metadata: Metadata = {
  title: "IvyLeagueTr",
  description: "IvyLeagueTr - Connect with fellow students",
  icons: [
    { rel: 'icon', url: '/icon.png', type: 'image/png' },
    { rel: 'apple-touch-icon', url: '/icon.png', type: 'image/png' },
    { rel: 'shortcut icon', url: '/icon.png', type: 'image/png' }
  ]
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-[#fafafa]`}>
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}
