'use client';
import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Save, 
  Settings2, 
  Phone, 
  Map, 
  ShieldAlert, 
  Megaphone, 
  Building2, 
  Compass, 
  SlidersHorizontal,
  Radio
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState({
    maintenance_mode: 'false',
    show_announcement: 'false',
    announcement_banner: 'ประกาศ: ทีมกู้ภัยกำลังเร่งเข้าช่วยเหลือในพื้นที่เสี่ยง โปรดติดตามข้อมูลอย่างใกล้ชิด',
    system_title: 'ศูนย์บรรเทาสาธารณภัย อุ่นใจ (OonJai)',
    agency_name: 'ศูนย์กู้ภัยฉุกเฉินส่วนกลาง',
    emergency_contact: '1669',
    volunteer_contact: '02-123-4567',
    default_lat: '18.7883',
    default_lng: '98.9853',
    heatmap_history_days: '7',
    proximity_radius_meters: '500',
    max_cases_per_volunteer: '3'
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
            show_announcement: data.show_announcement || 'false',
            announcement_banner: data.announcement_banner || prev.announcement_banner,
            system_title: data.system_title || prev.system_title,
            agency_name: data.agency_name || prev.agency_name,
            emergency_contact: data.emergency_contact || '1669',
            volunteer_contact: data.volunteer_contact || '02-123-4567',
            default_lat: data.default_lat || '18.7883',
            default_lng: data.default_lng || '98.9853',
            heatmap_history_days: data.heatmap_history_days || '7',
            proximity_radius_meters: data.proximity_radius_meters || '500',
            max_cases_per_volunteer: data.max_cases_per_volunteer || '3'
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
        toast.success('บันทึกการตั้งค่าระบบส่วนกลางสำเร็จ');
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
  const showAnnouncement = settings.show_announcement === 'true';

  return (
    <>
      <DashboardHeader title="ตั้งค่าระบบส่วนกลาง (System Control Center)" />
      <div className="max-w-5xl mx-auto py-6 pb-32 md:pb-10 space-y-6 px-4 md:px-0">
        
        {/* 1. Maintenance Mode Switch */}
        <div className={`p-6 rounded-2xl border transition-all ${isMaintenance ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-white dark:bg-[#151b2c] border-gray-100 dark:border-gray-800'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                <ShieldAlert className={`w-5 h-5 ${isMaintenance ? 'text-red-500' : 'text-blue-500'}`} />
                โหมดซ่อมบำรุงระบบ (Maintenance Mode)
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                หากเปิดใช้งาน ประชาชนทั่วไปจะไม่สามารถแจ้งเหตุเข้าใช้งานได้ โดยระบบจะแสดงป้ายประกาศปรับปรุงระบบแทน
              </p>
            </div>
            
            <label className="flex items-center cursor-pointer shrink-0">
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
              <div className="ml-3 text-sm font-bold text-slate-700 dark:text-slate-300 w-20">
                {isMaintenance ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </div>
            </label>
          </div>
        </div>

        {/* 2. Emergency Global Announcement Banner */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-orange-500" />
              แบนเนอร์ประกาศด่วนส่วนกลาง (Global Announcement)
            </h3>
            
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={showAnnouncement} 
                  onChange={() => setSettings({...settings, show_announcement: showAnnouncement ? 'false' : 'true'})} 
                />
                <div className={`block w-12 h-6 rounded-full transition-colors ${showAnnouncement ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showAnnouncement ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <span className="ml-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                {showAnnouncement ? 'แสดงบนเว็บ' : 'ซ่อนประกาศ'}
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">ข้อความประกาศด่วน (จะแสดงเป็นแถบสีส้มด้านบนสุดของหน้าเว็บประชาชน)</label>
            <Input 
              type="text" 
              placeholder="เช่น ประกาศด่วน: อพยพประชาชนในพื้นที่ อ.เมือง ไปยังศูนย์พักพิงหลัก..." 
              value={settings.announcement_banner} 
              onChange={e => setSettings({...settings, announcement_banner: e.target.value})} 
            />
          </div>
        </Card>

        {/* 3. Organization Profile & Emergency Contacts */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              ข้อมูลศูนย์กู้ภัย & เบอร์โทรสายด่วน (Agency & Hotlines)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">ชื่อศูนย์ปฏิบัติการ / ชื่อระบบ</label>
              <Input 
                type="text" 
                value={settings.system_title} 
                onChange={e => setSettings({...settings, system_title: e.target.value})} 
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">ชื่อหน่วยงานกู้ภัยหลัก</label>
              <Input 
                type="text" 
                value={settings.agency_name} 
                onChange={e => setSettings({...settings, agency_name: e.target.value})} 
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                <Phone className="w-3.5 h-3.5 text-green-500" /> เบอร์โทรฉุกเฉินประชาชน (Hotline)
              </label>
              <Input 
                type="text" 
                placeholder="เช่น 1669, 1784" 
                value={settings.emergency_contact} 
                onChange={e => setSettings({...settings, emergency_contact: e.target.value})} 
              />
              <p className="text-[11px] text-gray-500 mt-1">เบอร์หลักกดโทรออกด่วนในหน้าแจ้งเหตุ/หน้าแรก</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                <Radio className="w-3.5 h-3.5 text-purple-500" /> เบอร์ศูนย์ประสานงานกู้ภัยภาคสนาม
              </label>
              <Input 
                type="text" 
                placeholder="เช่น 02-123-4567" 
                value={settings.volunteer_contact} 
                onChange={e => setSettings({...settings, volunteer_contact: e.target.value})} 
              />
              <p className="text-[11px] text-gray-500 mt-1">เบอร์ตรงให้อาสาสมัครโทรติดต่อศูนย์สั่งการ</p>
            </div>
          </div>
        </Card>

        {/* 4. Map Center & Proximity Rules */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-500" />
              การตั้งค่าพิกัดแผนที่ & รัศมีเตือนภัย (Map & Proximity Rules)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">พิกัดศูนย์กลางแผนที่ (Latitude)</label>
              <Input 
                type="text" 
                placeholder="18.7883" 
                value={settings.default_lat} 
                onChange={e => setSettings({...settings, default_lat: e.target.value})} 
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">พิกัดศูนย์กลางแผนที่ (Longitude)</label>
              <Input 
                type="text" 
                placeholder="98.9853" 
                value={settings.default_lng} 
                onChange={e => setSettings({...settings, default_lng: e.target.value})} 
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">แสดงผลแผนที่ความร้อนย้อนหลัง (วัน)</label>
              <Input 
                type="number" 
                min="1"
                max="365"
                value={settings.heatmap_history_days} 
                onChange={e => setSettings({...settings, heatmap_history_days: e.target.value})} 
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" /> รัศมีเตือนภัยเคสซ้ำซ้อนใกล้เคียง (เมตร)
              </label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number" 
                  min="50"
                  max="5000"
                  className="w-48"
                  value={settings.proximity_radius_meters} 
                  onChange={e => setSettings({...settings, proximity_radius_meters: e.target.value})} 
                />
                <span className="text-xs text-gray-500">เมตร (หากมีเคสเกิดห่างกันไม่เกินระยะนี้ ระบบจะเตือนเป็นกลุ่มเคสใกล้เคียงทันที)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 5. Rescue Operations Policy */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-500" />
              นโยบายภารกิจกู้ภัย (Rescue Operations Policy)
            </h3>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">จำนวนเคสสูงสุดที่อาสาสมัคร 1 คนสามารถรับงานซ้อนกันได้</label>
            <div className="flex items-center gap-3">
              <Input 
                type="number" 
                min="1"
                max="20"
                className="w-32"
                value={settings.max_cases_per_volunteer} 
                onChange={e => setSettings({...settings, max_cases_per_volunteer: e.target.value})} 
              />
              <span className="text-xs text-gray-500">เคสพร้อมกัน (เพื่อป้องกันอาสารับงานซ้อนกันเกินกำลัง และช่วยกระจายงานให้ทีมอื่น)</span>
            </div>
          </div>
        </Card>

        {/* Save Button Bar */}
        <div className="flex justify-end gap-3 mt-8">
          <Button className="bg-[#ff6600] hover:bg-[#e65c00] flex items-center gap-2 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-orange-500/20" onClick={handleSave} disabled={isSaving || isLoading}>
            <Save className="w-5 h-5" />
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าระบบ'}
          </Button>
        </div>

      </div>
    </>
  );
}
