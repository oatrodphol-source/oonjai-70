'use client';
import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { CaseTable } from '@/components/backend/CaseTable';
import { VolunteerTaskBoard } from '@/components/backend/VolunteerTaskBoard';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Filter } from 'lucide-react';
import { useAuthProfile } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function CasesPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCaseId, setSearchCaseId] = useState('');
  const [searchVolunteerName, setSearchVolunteerName] = useState('');
  const [role, setRole] = useState('admin');
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { name: userName, loading } = useAuthProfile();

  useEffect(() => {
    setIsClient(true);
    
    // Check URL parameters for initial search
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('search')) {
        setSearchQuery(params.get('search') || '');
      }
      if (params.has('caseId')) {
        setSearchCaseId(params.get('caseId') || '');
      }
    }

    try {
      const stored = localStorage.getItem('oonjai_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user.role) setRole(user.role);
        setCurrentUser(user);
      }
    } catch (e) {
      console.error('Error reading role:', e);
    }
  }, []);

  useEffect(() => {
    // Make sure we have a logged-in volunteer
    if (!currentUser || (currentUser.role !== 'volunteer' && currentUser.role !== 'rescue')) return;

    const rawUserId = currentUser.uid || currentUser.id;
    if (!rawUserId) return;

    const userId = Number(rawUserId);

    // Mark as online when component mounts
    supabase.from('volunteers').update({ is_online: true }).eq('id', userId).then(({ error }) => {
      if (error) console.error(error);
    });

    // Setup beforeunload listener to mark offline when they close the browser tab
    const handleBeforeUnload = () => {
      supabase.from('volunteers').update({ is_online: false }).eq('id', userId).then(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup when component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase.from('volunteers').update({ is_online: false }).eq('id', userId).then(() => {});
    };
  }, [currentUser]);

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
              <div className="w-full sm:w-64">
                 <Input 
                   placeholder="ค้นหาด้วยรหัสเคส, ชื่อผู้แจ้ง..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
              </div>
            </div>
          </div>
          
          <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-0 mt-4">
            {[
              { id: 'all', label: 'รายการทั้งหมด' },
              { id: 'pending', label: '🔴 รอดำเนินการ' },
              { id: 'in_progress', label: '🟡 กำลังช่วยเหลือ' },
              { id: 'completed', label: '🟢 เสร็จสิ้นแล้ว' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 rounded-t-xl font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id 
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white border-b-4 border-orange-500' 
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b-4 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {activeTab === 'completed' && (
            <div className="flex flex-col gap-4 mt-2 animate-in fade-in slide-in-from-top-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${role === 'admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 w-full`}>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">ค้นหารหัสเคส</label>
                  <Input 
                    placeholder="เช่น CAS-001..." 
                    value={searchCaseId}
                    onChange={(e) => setSearchCaseId(e.target.value)}
                  />
                </div>
                {role === 'admin' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">ค้นหาชื่ออาสาสมัคร</label>
                    <Input 
                      placeholder="พิมพ์ชื่อทีมหรืออาสา..." 
                      value={searchVolunteerName}
                      onChange={(e) => setSearchVolunteerName(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">ระดับความรุนแรง</label>
                  <select className="w-full border border-slate-300 dark:border-slate-700 p-2.5 rounded-lg dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                    <option value="all">ทุกระดับ</option>
                    <option value="5">ระดับ 5 (วิกฤต)</option>
                    <option value="4">ระดับ 4 (รุนแรง)</option>
                    <option value="3">ระดับ 3 (ปานกลาง)</option>
                    <option value="2">ระดับ 2 (เฝ้าระวัง)</option>
                    <option value="1">ระดับ 1 (ทั่วไป)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">จุดหมายที่นำส่ง (Destination)</label>
                  <select className="w-full border border-slate-300 dark:border-slate-700 p-2.5 rounded-lg dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500" value={destinationFilter} onChange={(e) => setDestinationFilter(e.target.value)}>
                    <option value="all">ทุกจุดหมาย</option>
                    <option value="ศูนย์พักพิง">ศูนย์พักพิง</option>
                    <option value="มอบถุงยังชีพ">มอบถุงยังชีพ</option>
                    <option value="นำส่งโรงพยาบาล">นำส่งโรงพยาบาล</option>
                    <option value="พื้นที่ปลอดภัย">พื้นที่ปลอดภัย</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Conditional Content based on Role */}
        {role === 'admin' ? (
          <CaseTable 
            statusFilter={activeTab} 
            severityFilter={severityFilter} 
            searchQuery={searchQuery} 
            destinationFilter={destinationFilter}
            searchCaseId={searchCaseId}
            searchVolunteerName={searchVolunteerName}
          />
        ) : (
          <VolunteerTaskBoard 
            statusFilter={activeTab} 
            severityFilter={severityFilter} 
            searchQuery={searchQuery} 
            destinationFilter={destinationFilter}
            searchCaseId={searchCaseId}
            searchVolunteerName={searchVolunteerName}
          />
        )}
      </div>
    </>
  );
}
