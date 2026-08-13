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

  const [volunteersList, setVolunteersList] = useState<any[]>([]);

  useEffect(() => {
    const fetchVolunteers = async () => {
      try {
        const { data } = await supabase.from('volunteers').select('id, name, agency, province').order('name');
        if (data) setVolunteersList(data);
      } catch (e) {}
    };
    fetchVolunteers();
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
              <div className="w-full sm:w-64">
                 <Input 
                   placeholder="ค้นหาด้วยรหัสเคส, ชื่อผู้แจ้ง..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
              </div>
            </div>
          </div>
          
          <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-2 border-b border-slate-200 dark:border-slate-800 pb-0 mt-2">
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

          {/* 🚑 Dynamic Volunteer & Priority Filter Bar for Admin */}
          {role === 'admin' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  🚑 กรองตามทีมอาสาสมัคร (Supabase)
                </label>
                <select
                  value={searchVolunteerName}
                  onChange={(e) => setSearchVolunteerName(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 p-2 text-xs rounded-lg dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                >
                  <option value="">-- อาสาสมัครทั้งหมด --</option>
                  {volunteersList.map((vol) => (
                    <option key={vol.id} value={vol.name}>
                      {vol.name} {vol.agency ? `(${vol.agency})` : ''} {vol.province ? `[จ.${vol.province}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  🎯 ระดับความรุนแรง
                </label>
                <select 
                  className="w-full border border-slate-300 dark:border-slate-700 p-2 text-xs rounded-lg dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 font-medium" 
                  value={severityFilter} 
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <option value="all">ทุกระดับความรุนแรง</option>
                  <option value="5">ระดับ 5 (วิกฤต)</option>
                  <option value="4">ระดับ 4 (รุนแรง)</option>
                  <option value="3">ระดับ 3 (ปานกลาง)</option>
                  <option value="2">ระดับ 2 (เฝ้าระวัง)</option>
                  <option value="1">ระดับ 1 (ทั่วไป)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  📍 จุดหมายที่นำส่ง
                </label>
                <select 
                  className="w-full border border-slate-300 dark:border-slate-700 p-2 text-xs rounded-lg dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 font-medium" 
                  value={destinationFilter} 
                  onChange={(e) => setDestinationFilter(e.target.value)}
                >
                  <option value="all">ทุกจุดหมาย</option>
                  <option value="ศูนย์พักพิง">ศูนย์พักพิง</option>
                  <option value="มอบถุงยังชีพ">มอบถุงยังชีพ</option>
                  <option value="นำส่งโรงพยาบาล">นำส่งโรงพยาบาล</option>
                  <option value="พื้นที่ปลอดภัย">พื้นที่ปลอดภัย</option>
                </select>
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
