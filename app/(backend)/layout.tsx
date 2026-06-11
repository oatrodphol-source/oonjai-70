import React from 'react';
import { Sidebar } from '@/components/backend/Sidebar';
import { getUser } from '@/lib/auth';

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
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
