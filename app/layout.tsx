import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/navbar";
import Sidebar from "./components/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import Link from "next/link";
import SearchBar from "./components/SearchBar";
import CommunityList from "@/app/components/CommunityList";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IvyLeagueTr",
  description: "IvyLeagueTr - Connect with fellow students",
  icons: [
    { rel: 'icon', url: '/icon.png', type: 'image/png' },
    { rel: 'apple-touch-icon', url: '/icon.png', type: 'image/png' },
    { rel: 'shortcut icon', url: '/icon.png', type: 'image/png' }
  ]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#fafafa]">
        <div className="flex h-screen">
          {/* Right sidebar - fixed width (formerly left) */}
          <div className="w-[320px] fixed top-0 right-0 h-full border-l">
            <div className="p-4">
              {/* Search input */}
              <div className="relative mb-6">
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Main content - centered with fixed width */}
          <div className="flex-1 ml-[320px] mr-[320px]">
            <div className="border-l border-r min-h-screen">
              {children}
            </div>
          </div>

          {/* Left sidebar - fixed width (formerly right) */}
          <div className="w-[320px] fixed top-0 left-0 h-full border-r">
            <div className="p-4">
              <h1 className="text-xl font-bold text-green-600 mb-6">IvyLeagueTr</h1>
              
              <h2 className="font-medium mb-4">Communities</h2>
              <div className="space-y-3">
                <CommunityList />
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
