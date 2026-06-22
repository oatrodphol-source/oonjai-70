'use client';
import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { HeatmapView } from '@/components/backend/HeatmapView';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Download, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function HeatmapPage() {
  const [type, setType] = useState('all');
  const [time, setTime] = useState('all');
  const [cases, setCases] = useState<any[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cases'), (snapshot) => {
      const fetchedCases: any[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.latitude && data.longitude) {
          fetchedCases.push({
            id: data.case_number ? `CAS-${String(data.case_number).padStart(3, '0')}` : `CAS-${docSnap.id.substring(0, 5)}`,
            severity: Number(data.severity) || 1,
            type: data.type || 'ไม่ระบุ',
            latitude: data.latitude,
            longitude: data.longitude,
            status: data.status || 'รอการช่วยเหลือ',
            details: data.details || '',
            timestamp: data.createdAt ? new Date(data.createdAt).getTime() : (data.created_at ? new Date(data.created_at).getTime() : Date.now()),
            rawDate: data.createdAt || data.created_at || new Date().toISOString(),
            assigned_volunteer: data.assigned_volunteer_name || data.rescuer_name || '-'
          });
        }
      });
      setCases(fetchedCases);
      setLoadingCases(false);
    });
    return () => unsub();
  }, []);

  const filteredCases = cases.filter(c => {
    // Type filter
    if (type !== 'all') {
      const cType = c.type === 'sos' ? 'SOS ด่วน' : c.type;
      if (cType !== type) return false;
    }
    
    // Time filter
    if (time !== 'all') {
      const now = Date.now();
      const diffHour = (now - c.timestamp) / (1000 * 60 * 60);
      if (time === '24h' && diffHour > 24) return false;
      if (time === '7d' && diffHour > 24 * 7) return false;
      if (time === 'month' && diffHour > 24 * 30) return false;
    }
    return true;
  });

  const handleExport = () => {
    setExporting(true);
    try {
      const headers = ['รหัสอ้างอิง', 'วัน-เวลาที่แจ้งเหตุ', 'ประเภทความช่วยเหลือ', 'ระดับความรุนแรง', 'สถานะการดำเนินการ', 'ละติจูด', 'ลองจิจูด', 'ผู้เข้าช่วยเหลือ (ถ้ามี)'];
      
      const getSeverityText = (level: number) => {
        switch (level) {
          case 5: return 'พื้นที่เสี่ยงวิกฤต (ระดับ 5)';
          case 4: return 'พื้นที่เสี่ยงรุนแรง (ระดับ 4)';
          case 3: return 'พื้นที่เสี่ยงปานกลาง (ระดับ 3)';
          case 2: return 'พื้นที่เฝ้าระวัง (ระดับ 2)';
          case 1: default: return 'พื้นที่ปลอดภัย/ทั่วไป (ระดับ 1)';
        }
      };

      const csvContent = [
        headers.join(','),
        ...filteredCases.map(c => [
          c.id,
          new Date(c.timestamp).toLocaleString('th-TH').replace(/,/g, ''),
          `"${c.type === 'sos' ? 'SOS ด่วน' : c.type}"`,
          `"${getSeverityText(c.severity)}"`,
          `"${c.status}"`,
          c.latitude,
          c.longitude,
          `"${c.assigned_volunteer}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `OonJai_Flood_Report_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setTimeout(() => setExporting(false), 1000);
    }
  };

  return (
    <>
      <DashboardHeader title="แผนที่ความร้อน (Heatmap)" />
      
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <Select 
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={[
                  { label: 'ทุกประเภทการขอความช่วยเหลือ', value: 'all' },
                  { label: 'SOS ด่วน (อพยพฉุกเฉิน)', value: 'SOS ด่วน' },
                  { label: 'เตรียมอพยพ / เฝ้าระวังระดับน้ำ', value: 'เตรียมอพยพ/เฝ้าระวัง' },
                  { label: 'ต้องการเสบียง (น้ำ/อาหาร/ยา)', value: 'ต้องการน้ำ/อาหาร/ยา' },
                  { label: 'ผู้ป่วยฉุกเฉิน / ติดเตียง', value: 'ฉุกเฉิน/ป่วย' },
                ]}
              />
            </div>
            <div className="w-full sm:w-48">
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
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
            onClick={handleExport}
            disabled={exporting || loadingCases}
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'กำลังส่งออก...' : 'ส่งออกรายงานพื้นที่เสี่ยง'}
          </Button>
        </div>

        {/* Map Container */}
        <HeatmapView filteredCases={filteredCases} loading={loadingCases} />
        
      </div>
    </>
  );
}
