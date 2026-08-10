'use client';
import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Save, Settings2, Phone, Map, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState({
    maintenance_mode: 'false',
    emergency_contact: '1669',
    heatmap_history_days: '7'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(prev => ({
            ...prev,
            maintenance_mode: data.maintenance_mode || 'false',
            emergency_contact: data.emergency_contact || '1669',
            heatmap_history_days: data.heatmap_history_days || '7'
          }));
        }
      } catch (error) {
        console.error('Failed to fetch system settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        toast.success('บันทึกการตั้งค่าระบบสำเร็จ');
      } else {
        toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const isMaintenance = settings.maintenance_mode === 'true';

  return (
    <>
      <DashboardHeader title="ตั้งค่าระบบ (System Settings)" />
      <div className="max-w-4xl mx-auto py-6 pb-32 md:pb-10 space-y-6 px-4 md:px-0">
        
        <div className={`p-6 rounded-2xl border ${isMaintenance ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ShieldAlert className={`w-5 h-5 ${isMaintenance ? 'text-red-500' : 'text-blue-500'}`} />
                โหมดซ่อมบำรุง (Maintenance Mode)
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                หากเปิดใช้งาน ผู้ใช้ทั่วไปจะไม่สามารถเข้าใช้งานระบบได้ จะขึ้นหน้าประกาศปรับปรุงระบบ
              </p>
            </div>
            
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={isMaintenance} 
                  onChange={() => setSettings({...settings, maintenance_mode: isMaintenance ? 'false' : 'true'})} 
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${isMaintenance ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isMaintenance ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <div className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300 w-20">
                {isMaintenance ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </div>
            </label>
          </div>
        </div>

        <Card>
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              การตั้งค่าทั่วไป (General)
            </h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-500" /> เบอร์โทรฉุกเฉินส่วนกลาง
              </label>
              <Input 
                type="text" 
                placeholder="เช่น 1669, 191, เบอร์กู้ภัยท้องถิ่น..." 
                value={settings.emergency_contact} 
                onChange={e => setSettings({...settings, emergency_contact: e.target.value})} 
              />
              <p className="text-xs text-gray-500 mt-1">เบอร์นี้จะแสดงเป็นเบอร์หลักให้ประชาชนติดต่อกรณีฉุกเฉินในหน้าแจ้งเหตุ</p>
            </div>
            
            <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
              <label className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Map className="w-4 h-4 text-orange-500" /> การจำกัดการมองเห็นแผนที่ความร้อน (Heatmap Visibility)
              </label>
              <div className="flex items-center gap-3 mt-2">
                <Input 
                  type="number" 
                  min="1"
                  max="365"
                  className="w-32"
                  value={settings.heatmap_history_days} 
                  onChange={e => setSettings({...settings, heatmap_history_days: e.target.value})} 
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">วันย้อนหลัง</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">ตั้งค่าว่าจะให้แผนที่ความร้อนแสดงจุดแจ้งเหตุย้อนหลังกี่วัน (แนะนำ: 7-30 วันเพื่อไม่ให้แผนที่รกเกินไป)</p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3 mt-8">
          <Button className="bg-[#0b1325] hover:bg-[#0b1325]/90 flex items-center gap-2 text-white" onClick={handleSave} disabled={isSaving || isLoading}>
            <Save className="w-4 h-4" />
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </Button>
        </div>
      </div>
    </>
  );
}
