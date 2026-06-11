'use client';
import React, { useState } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { CaseTable } from '@/components/backend/CaseTable';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Filter } from 'lucide-react';

export default function CasesPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      <DashboardHeader title="จัดการเคสการช่วยเหลือ" />
      
      <div className="max-w-7xl mx-auto py-6 space-y-6">
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
                { label: 'กำลังช่วยเหลือ', value: 'กำลังช่วยเหลือ' },
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
                { label: 'วิกฤต (ระดับ 5)', value: '5' },
                { label: 'รุนแรง (ระดับ 4)', value: '4' },
                { label: 'ปานกลาง (ระดับ 3)', value: '3' },
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
        </div>

        {/* Table List */}
        <CaseTable 
          statusFilter={statusFilter} 
          severityFilter={severityFilter} 
          searchQuery={searchQuery} 
        />
      </div>
    </>
  );
}
