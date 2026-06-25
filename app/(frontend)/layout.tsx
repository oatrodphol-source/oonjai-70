import React from 'react';
import { TopNavbar } from '@/components/frontend/TopNavbar';
import { BottomNav } from '@/components/frontend/BottomNav';
import { ActiveCaseBanner } from '@/components/frontend/ActiveCaseBanner';

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0b1325]">
      <TopNavbar />
      
      <main className="min-h-[calc(100dvh-80px)] pb-28 md:pb-8 flex flex-col items-center justify-start bg-slate-50 dark:bg-[#0b1325] relative z-0 w-full max-w-full overflow-x-hidden">
        {/* Full-width spanning layout wrapper */}
        <div className="w-full max-w-full flex-1 relative z-10 flex flex-col overflow-x-hidden">
          {children}
        </div>
        <ActiveCaseBanner />
      </main>
      
      <BottomNav />
    </div>
  );
}
