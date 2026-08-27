import React from 'react';
import { Sidebar } from '@/components/backend/Sidebar';
import { getUser } from '@/lib/auth';
import { GlobalStatusBlocker } from '@/components/backend/GlobalStatusBlocker';

export default async function BackendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const role = user?.role || 'volunteer';
  const userName = user?.name || 'อาสาสมัคร สมหมาย';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b1325] flex">
      <Sidebar role={role} userName={userName} />
      <div className="flex-1 ml-0 md:ml-64 flex flex-col min-h-screen pb-20 md:pb-0 pt-16 md:pt-0">
        <GlobalStatusBlocker>
          <main className="flex-1 p-2.5 sm:p-4 md:p-8 overflow-x-hidden w-full max-w-full">
            {children}
          </main>
        </GlobalStatusBlocker>
      </div>
    </div>
  );
}
