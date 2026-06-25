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
    <main className="relative flex flex-col h-[calc(100dvh-100px)] md:h-[calc(100vh-80px)] w-full">
      <div className="absolute inset-0 z-0">
        <MapView />
      </div>
    </main>
  );
}
