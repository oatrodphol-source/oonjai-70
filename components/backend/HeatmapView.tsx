'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const DynamicHeatmapMap = dynamic(
  () => import('@/components/backend/HeatmapMap'),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800"><LoadingSpinner /></div> }
);

import { RiskLegend } from '@/components/shared/RiskLegend';

interface HeatmapViewProps {
  filteredCases: any[];
  loading?: boolean;
}

export const HeatmapView = ({ filteredCases = [], loading = false }: HeatmapViewProps) => {

  return (
    <div className="h-full w-full relative z-0">
      {loading ? (
        <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-800/50">
          <LoadingSpinner />
        </div>
      ) : (
        <DynamicHeatmapMap cases={filteredCases} />
      )}
      
      {/* Collapsible Risk Level Legend Overlay */}
      <RiskLegend className="bottom-6 left-4" label="ระดับความเสี่ยง" />
    </div>
  );
};
