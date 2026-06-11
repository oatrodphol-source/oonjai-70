'use client';
import React, { useState } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { HeatmapView } from '@/components/backend/HeatmapView';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';

export default function HeatmapPage() {
  const [type, setType] = useState('all');
  const [time, setTime] = useState('all');

  return (
    <>
      <DashboardHeader title="แผนที่ความร้อน (Heatmap)" />
      
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        
        {/* Controls */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex gap-4">
            <div className="w-48">
              <Select 
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={[
                  { label: 'ทุกประเภทภัยพิบัติ', value: 'all' },
                  { label: 'อุทกภัย (น้ำท่วม)', value: 'flood' },
                  { label: 'อัคคีภัย (ไฟไหม้)', value: 'fire' },
                ]}
              />
            </div>
            <div className="w-48">
              <Select 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                options={[
                  { label: 'ทุกเวลา', value: 'all' },
                  { label: '24 ชั่วโมงที่ผ่านมา', value: '24h' },
                  { label: '7 วันที่ผ่านมา', value: '7d' },
                  { label: 'เดือนนี้', value: 'month' },
                ]}
              />
            </div>
          </div>
          
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" /> ส่งออกรายงานพื้นที่เสี่ยง
          </Button>
        </div>

        {/* Map Container */}
        <HeatmapView filterType={type} filterTime={time} />
        
      </div>
    </>
  );
}
