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
  title: "NoLeak",
  description: "Test your Supabase permissions in seconds",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-gray-200 bg-white py-3">
          <h1
            className="text-center text-lg font-medium text-gray-900"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            NOLEAK
          </h1>
        </header>
        {children}
      </body>
    </html>
  );
}
