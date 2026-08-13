import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { LineUserInitializer } from "@/components/frontend/LineUserInitializer";
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
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <LineUserInitializer />
        {children}
        <Toaster 
          position="top-center"
          containerStyle={{
            top: 16,
            zIndex: 99999,
          }}
          toastOptions={{
            duration: 3000,
            className: 'text-xs sm:text-sm font-bold shadow-2xl rounded-2xl cursor-pointer active:scale-95 transition-transform',
            style: {
              padding: '12px 18px',
              maxWidth: '92vw',
              wordBreak: 'break-word',
              borderRadius: '16px',
            },
            success: {
              style: {
                background: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #10b981',
              },
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              duration: 3000,
              style: {
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #ef4444',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}