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
    <main className="relative w-full h-[calc(100dvh-260px)] md:h-[calc(100dvh-180px)] mb-24 overflow-hidden">
      <MapView />
    </main>
  );
}
