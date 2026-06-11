'use client';
import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertTriangle, Save, BrainCircuit, RefreshCw } from 'lucide-react';

export default function AiTriggerPage() {
  const [weights, setWeights] = useState({
    waterLevelHigh: 5,
    waterLevelMedium: 3,
    peopleCountMany: 5,
    peopleCountFew: 2,
    bedridden: 4,
    elderly: 2,
    severityFactor: 2
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/ai-triage');
        if (response.ok) {
          const data = await response.json();
          setWeights(data);
        }
      } catch (error) {
        console.error('Failed to fetch AI settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/ai-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weights)
      });
      
      if (response.ok) {
        alert('บันทึกการตั้งค่า AI Triage สำเร็จ');
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader title="ตั้งค่า AI Trigger & Triage" />
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 p-4 rounded-2xl flex gap-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-800 rounded-full h-fit">
            <BrainCircuit className="w-6 h-6 text-orange-600 dark:text-orange-300" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white">Smart Triage Algorithm</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              ระบบให้คะแนนความเร่งด่วนอัตโนมัติ คำนวณจาก: 
              <code className="bg-white dark:bg-black/20 px-2 py-0.5 rounded mx-1 text-orange-600">
                Score = (Water Level) + (People) + (Bedridden) + (Elderly) + (Severity)
              </code>
            </p>
          </div>
        </div>

        <Card>
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#ff6600]" />
              ปรับแต่งน้ำหนักคะแนน (Scoring Weights)
            </h3>
            <Button variant="outline" size="sm" onClick={() => setWeights({
              waterLevelHigh: 5, waterLevelMedium: 3, peopleCountMany: 5, peopleCountFew: 2, bedridden: 4, elderly: 2, severityFactor: 2
            })}>
              <RefreshCw className="w-4 h-4 mr-2" />
              คืนค่าเริ่มต้น
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h5 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">ปัจจัยสภาพแวดล้อม</h5>
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">ระดับน้ำสูง (ท่วมมิดหัว)</label>
                <Input type="number" value={weights.waterLevelHigh} onChange={e => setWeights({...weights, waterLevelHigh: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">ระดับน้ำปานกลาง (ระดับเอว)</label>
                <Input type="number" value={weights.waterLevelMedium} onChange={e => setWeights({...weights, waterLevelMedium: Number(e.target.value)})} />
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">ปัจจัยผู้ประสบภัย</h5>
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">มีผู้ป่วยติดเตียง</label>
                <Input type="number" value={weights.bedridden} onChange={e => setWeights({...weights, bedridden: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">มีเด็ก/ผู้สูงอายุ</label>
                <Input type="number" value={weights.elderly} onChange={e => setWeights({...weights, elderly: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">จำนวนคน &gt; 5 คน</label>
                <Input type="number" value={weights.peopleCountMany} onChange={e => setWeights({...weights, peopleCountMany: Number(e.target.value)})} />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <Button className="bg-[#0b1325] hover:bg-[#0b1325]/90 flex items-center gap-2" onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4" />
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
