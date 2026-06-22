'use client';
import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { CaseTable } from '@/components/backend/CaseTable';
import { VolunteerTaskBoard } from '@/components/backend/VolunteerTaskBoard';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Filter } from 'lucide-react';

export default function CasesPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [role, setRole] = useState('admin');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const stored = localStorage.getItem('oonjai_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user.role) setRole(user.role);
      }
    } catch (e) {
      console.error('Error reading role:', e);
    }
  }, []);

  if (!isClient) {
    return null; // Avoid hydration mismatch
  }

  return (
    <>
      <DashboardHeader title={role === 'admin' ? "จัดการเคสการช่วยเหลือ" : "กระดานงานอาสาสมัคร (Task Board)"} />
      
      <div className="max-w-7xl mx-auto py-6 space-y-6 px-4">
        {/* Filters */}
        <div className="bg-white dark:bg-[#151b2c] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-gray-500 font-medium mb-1 w-full md:w-auto">
            <Filter className="w-5 h-5" />
            <span>ตัวกรอง:</span>
          </div>
          
          <div className="w-full md:w-48">
            <Select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { label: 'ทุกสถานะ', value: 'all' },
                { label: 'รอการช่วยเหลือ', value: 'รอการช่วยเหลือ' },
                { label: 'กำลังดำเนินการ', value: 'กำลังดำเนินการ' },
                { label: 'เสร็จสิ้น', value: 'เสร็จสิ้น' },
              ]}
            />
          </div>
          
          <div className="w-full md:w-48">
            <Select 
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              options={[
                { label: 'ทุกระดับความรุนแรง', value: 'all' },
                { label: 'พื้นที่เสี่ยงวิกฤต (ระดับ 5)', value: '5' },
                { label: 'พื้นที่เสี่ยงรุนแรง (ระดับ 4)', value: '4' },
                { label: 'พื้นที่เสี่ยงปานกลาง (ระดับ 3)', value: '3' },
                { label: 'พื้นที่เฝ้าระวัง (ระดับ 2)', value: '2' },
                { label: 'พื้นที่ปลอดภัย/ทั่วไป (ระดับ 1)', value: '1' },
              ]}
            />
          </div>
          
          <div className="w-full md:w-64">
             <Input 
               placeholder="ค้นหาด้วยรหัสเคส, ชื่อผู้แจ้ง..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          {(statusFilter !== 'all' || severityFilter !== 'all' || searchQuery !== '') && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSeverityFilter('all');
                setSearchQuery('');
              }}
              className="h-10 px-4 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-colors"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Conditional Content based on Role */}
        {role === 'admin' ? (
          <CaseTable 
            statusFilter={statusFilter} 
            severityFilter={severityFilter} 
            searchQuery={searchQuery} 
          />
        ) : (
          <VolunteerTaskBoard 
            statusFilter={statusFilter} 
            severityFilter={severityFilter} 
            searchQuery={searchQuery} 
          />
        )}
      </div>
    </>
  );
}
