'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const DynamicHeatmapMap = dynamic(
  () => import('@/components/backend/HeatmapMap'),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800"><LoadingSpinner /></div> }
);

interface HeatmapViewProps {
  filteredCases: any[];
  loading?: boolean;
}

export const HeatmapView = ({ filteredCases = [], loading = false }: HeatmapViewProps) => {

  return (
    <div className="h-[50vh] md:h-[70vh] w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 relative z-0 shadow-sm">
      {loading ? (
        <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-800/50">
          <LoadingSpinner />
        </div>
      ) : (
        <DynamicHeatmapMap cases={filteredCases} />
      )}
      
      {/* Legend Overlay */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-[1000] text-xs sm:text-sm p-3 bg-white/95 dark:bg-[#0b1325]/95 backdrop-blur shadow-md rounded-xl border border-gray-200 dark:border-gray-800">
        <h4 className="font-bold mb-3 text-gray-900 dark:text-white">ระดับความเสี่ยง (AI Triage)</h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block mr-2"></span>
            <span className="text-gray-600 dark:text-gray-300">พื้นที่เสี่ยงวิกฤต (ระดับ 5)</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block mr-2"></span>
            <span className="text-gray-600 dark:text-gray-300">พื้นที่เสี่ยงรุนแรง (ระดับ 4)</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block mr-2"></span>
            <span className="text-gray-600 dark:text-gray-300">พื้นที่เสี่ยงปานกลาง (ระดับ 3)</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block mr-2"></span>
            <span className="text-gray-600 dark:text-gray-300">พื้นที่เฝ้าระวัง (ระดับ 2)</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block mr-2"></span>
            <span className="text-gray-600 dark:text-gray-300">พื้นที่ปลอดภัย/ทั่วไป (ระดับ 1)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
