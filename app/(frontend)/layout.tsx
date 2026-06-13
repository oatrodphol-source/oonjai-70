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
      
      <div className="pt-16 sm:pt-20 w-full relative z-40">
        <ActiveCaseBanner />
      </div>
      
      <main className="flex-1 pb-24 relative z-0 flex flex-col w-full max-w-full overflow-x-hidden">
        {/* Full-width spanning layout wrapper */}
        <div className="w-full max-w-full flex-1 bg-white dark:bg-[#0b1325] relative z-10 flex flex-col overflow-x-hidden">
          {children}
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}
