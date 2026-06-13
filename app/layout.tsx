import type { Metadata, Viewport } from "next";
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
  title: "OonJai - Emergency Reporting System",
  description: "Web Application for Emergency Reporting and Disaster Relief Assistance",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#ff6600",
};
// app/layout.tsx

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 w-full max-w-full overflow-x-hidden`}
        cz-shortcut-listen="true"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}