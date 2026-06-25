import React from 'react';
import { ReportStepForm } from '@/components/frontend/ReportStepForm';

export default function ReportPage() {
  return (
    <main className="relative w-full flex-1 flex flex-col h-[calc(100dvh-140px)] md:h-[calc(100dvh-80px)] overflow-hidden">
      <div className="relative w-full h-full flex-1 min-h-0 z-0 overflow-y-auto">
        <ReportStepForm />
      </div>
    </main>
  );
}
