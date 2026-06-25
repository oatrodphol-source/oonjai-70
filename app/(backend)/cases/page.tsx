'use client';
import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { CaseTable } from '@/components/backend/CaseTable';
import { VolunteerTaskBoard } from '@/components/backend/VolunteerTaskBoard';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Filter } from 'lucide-react';
import { useAuthProfile } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function CasesPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSafeModal, setShowSafeModal] = useState(false);
  const [role, setRole] = useState('admin');
  const [isClient, setIsClient] = useState(false);
  const { name: userName, loading } = useAuthProfile();

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
      
      <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#0b1325] p-4 pb-36 md:pb-10 w-full max-w-[100vw] md:max-w-5xl mx-auto space-y-6 overflow-x-hidden overflow-y-auto">

        {/* Filters */}
        <div className="bg-white dark:bg-[#111c35] p-4 rounded-xl shadow-sm mb-4 w-full max-w-[100vw] overflow-hidden sticky top-0 z-10 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div className="flex items-center gap-2 text-gray-500 font-medium shrink-0">
              <Filter className="w-5 h-5" />
              <span>ตัวกรอง:</span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button onClick={() => setShowSafeModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 text-sm flex items-center justify-center gap-2 whitespace-nowrap">
                + เพิ่มผู้ปลอดภัย (ทีมอื่นช่วย)
              </button>
              <div className="w-full sm:w-64">
                 <Input 
                   placeholder="ค้นหาด้วยรหัสเคส, ชื่อผู้แจ้ง..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 w-full overflow-hidden">
            <div className="flex w-full overflow-x-auto snap-x gap-2 hide-scrollbar pb-1">
              {[
                { label: 'ทุกสถานะ', value: 'all' },
                { label: 'รอการช่วยเหลือ', value: 'รอการช่วยเหลือ' },
                { label: 'กำลังดำเนินการ', value: 'กำลังดำเนินการ' },
                { label: 'เสร็จสิ้น', value: 'เสร็จสิ้น' },
              ].map((opt, i) => (
                <button 
                  key={`status-${i}`}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`snap-start shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-all ${statusFilter === opt.value ? 'bg-[#ff6600] text-white border-[#ff6600] shadow-md' : 'bg-gray-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex w-full overflow-x-auto snap-x gap-2 hide-scrollbar pb-1">
              {[
                { label: 'ทุกระดับความรุนแรง', value: 'all' },
                { label: 'วิกฤต (5)', value: '5' },
                { label: 'รุนแรง (4)', value: '4' },
                { label: 'ปานกลาง (3)', value: '3' },
                { label: 'เฝ้าระวัง (2)', value: '2' },
                { label: 'ปลอดภัย (1)', value: '1' },
              ].map((opt, i) => (
                <button 
                  key={`severity-${i}`}
                  onClick={() => setSeverityFilter(opt.value)}
                  className={`snap-start shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-all ${severityFilter === opt.value ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-gray-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          
          {(statusFilter !== 'all' || severityFilter !== 'all' || searchQuery !== '') && (
            <div className="flex justify-end border-t border-gray-100 dark:border-gray-800 pt-3">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSeverityFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-1.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-full transition-colors"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
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

      {showSafeModal && (
        <div className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-slate-900">เพิ่มรายชื่อผู้ปลอดภัย (ภายนอก)</h3>
            <input type="text" id="safeName" placeholder="ชื่อ-นามสกุล ผู้ได้รับการช่วยเหลือ" className="w-full border border-slate-300 p-3 rounded-lg mb-4 text-slate-900" />
            <input type="text" id="safeTeam" placeholder="หน่วยงานที่ช่วยเหลือ (เช่น กู้ภัย ก.)" className="w-full border border-slate-300 p-3 rounded-lg mb-4 text-slate-900" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSafeModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">ยกเลิก</button>
              <button onClick={async () => {
                const name = (document.getElementById('safeName') as HTMLInputElement).value;
                const team = (document.getElementById('safeTeam') as HTMLInputElement).value;
                if(name) {
                  await addDoc(collection(db, 'safe_reports'), {
                    name, agency: team || 'หน่วยงานภายนอก', created_at: new Date().toISOString(), status: 'safe', type: 'manual_entry'
                  });
                  setShowSafeModal(false);
                }
              }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">บันทึกรายชื่อ</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
