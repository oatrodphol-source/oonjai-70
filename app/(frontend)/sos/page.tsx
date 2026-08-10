import React from 'react';
import { SOSButton } from '@/components/frontend/SOSButton';

export default function SOSPage() {
  return (
    <div className="min-h-screen pt-24 pb-24 flex flex-col bg-gray-50 dark:bg-[#0b1325]">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto px-4">
        <SOSButton />
      </div>
    </div>
  );
}
