'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

// Dynamic import with ssr: false is required for Leaflet in Next.js
const MapView = dynamic(
  () => import('@/components/frontend/MapView'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full min-h-[300px]"><LoadingSpinner /></div>
  }
);

export default function MapPage() {
  return (
    <main className="w-full relative h-[calc(100dvh-152px)]">
      <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-[#0b1325]/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 pointer-events-auto transition-all duration-200">
        <h2 className="font-bold text-[#ff6600]">แผนที่จุดเกิดเหตุ</h2>
        <p className="text-xs text-gray-500">แสดงพื้นที่เสี่ยงภัยและเคสปัจจุบัน</p>
      </div>
      <div className="w-full h-full relative">
        <MapView />
      </div>
    </main>
  );
}
