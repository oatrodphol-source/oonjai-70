'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const DynamicHeatmapMap = dynamic(
  () => import('@/components/backend/HeatmapMap'),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800"><LoadingSpinner /></div> }
);

interface HeatmapViewProps {
  filterType?: string;
  filterTime?: string;
}

export const HeatmapView = ({ filterType = 'all', filterTime = 'all' }: HeatmapViewProps) => {
  const [points, setPoints] = useState<[number, number, number][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        setLoading(true);
        const url = `/api/heatmap?type=${filterType}&time=${filterTime}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setPoints(data);
        }
      } catch (error) {
        console.error('Failed to fetch heatmap data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHeatmapData();
  }, [filterType, filterTime]);

  return (
    <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 relative z-0">
      {!loading && <DynamicHeatmapMap points={points} />}
      
      {/* Legend Overlay */}
      <div className="absolute bottom-6 right-6 z-10 bg-white/90 dark:bg-[#0b1325]/90 backdrop-blur p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
        <h4 className="font-bold text-sm mb-3 text-gray-900 dark:text-white">ระดับความเสี่ยง (AI Triage)</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 opacity-80"></div>
            <span className="text-gray-600 dark:text-gray-300">พื้นที่เสี่ยงวิกฤต (ระดับ 5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500 opacity-80"></div>
            <span className="text-gray-600 dark:text-gray-300">พื้นที่เสี่ยงสูง (ระดับ 3-4)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 opacity-80"></div>
            <span className="text-gray-600 dark:text-gray-300">พื้นที่เฝ้าระวัง (ระดับ 1-2)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
