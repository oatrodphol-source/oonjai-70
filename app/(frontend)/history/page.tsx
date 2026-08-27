"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';

export default function HistoryPage() {
  const [activeCases, setActiveCases] = useState<any[]>([]);
  const [pastCases, setPastCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    // Volunteer Taskboard: Listen to all cases in real-time
    const fetchCases = async () => {
      try {
        let myCaseIds: string[] = [];
        try {
          const stored = localStorage.getItem('oonjai_my_cases');
          if (stored) {
            myCaseIds = JSON.parse(stored);
          }
        } catch (e) {
          console.error('Error parsing my cases', e);
        }

        if (!myCaseIds || myCaseIds.length === 0) {
          setActiveCases([]);
          setPastCases([]);
          setIsLoading(false);
          return;
        }

        const numericCaseIds = myCaseIds.map(Number).filter(id => !isNaN(id));

        if (numericCaseIds.length === 0) {
          setActiveCases([]);
          setPastCases([]);
          setIsLoading(false);
          return;
        }

        const { data: snapshot, error } = await supabase
          .from('cases')
          .select('*')
          .in('id', numericCaseIds)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const activeStatuses = ['pending', 'in_progress', 'wait', 'accepted'];

        const active: any[] = [];
        const past: any[] = [];

        (snapshot || []).forEach(data => {
          const docId = String(data.id);
          const caseItem = {
            id: data.case_number ? `CAS-${String(data.case_number).padStart(3, '0')}` : `CAS-${docId.substring(0, 5)}`,
            rawId: docId,
            type: data.type || 'ไม่ระบุ',
            status: data.status || 'pending',
            time: data.updated_at ? new Date(data.updated_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) :
              (data.created_at ? new Date(data.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'),
            timestamp: data.updated_at || data.created_at || 0
          };

          const s = typeof caseItem.status === 'string' ? caseItem.status.toLowerCase() : String(caseItem.status);
          if (activeStatuses.includes(s)) {
            active.push(caseItem);
          } else {
            past.push(caseItem);
          }
        });

        // Sort by newest first
        active.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        past.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setActiveCases(active);
        setPastCases(past);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching volunteer taskboard cases:', error);
        setIsLoading(false);
      }
    };

    fetchCases();

    const channel = supabase
      .channel('custom-history-cases')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        () => {
          fetchCases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-gray-900 pt-24 pb-32 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-6">รายการขอความช่วยเหลือของฉัน</h1>

        {isLoading ? (
          <p className="text-center text-gray-500 mt-10">กำลังโหลดข้อมูล...</p>
        ) : (activeCases.length === 0 && pastCases.length === 0) ? (
          <div className="text-center mt-10 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <p className="text-gray-500 dark:text-gray-400">📭 ยังไม่มีประวัติการแจ้งเหตุในอุปกรณ์นี้</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Active Cases */}
            <div>
              {activeCases.length > 0 && (
                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  🔴 เคสปัจจุบัน (กำลังดำเนินการ)
                </h2>
              )}
              {activeCases.length > 0 ? (
                <div className="space-y-4">
                  {activeCases.map(c => (
                    <Link
                      href={`/tracking/${c.rawId}`}
                      key={c.id}
                      className="block bg-white dark:bg-[#151b2c] p-5 rounded-2xl shadow-sm border-2 border-orange-200 dark:border-orange-900/50 hover:border-orange-400 transition-colors relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full"></div>
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">{c.type}</h3>
                        <span className="text-xs text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 px-2.5 py-1 rounded-md font-bold">{c.time}</span>
                      </div>
                      <div className="flex items-center justify-between relative z-10">
                        <span className="text-xs text-gray-500 dark:text-gray-400">รหัสอ้างอิง: {c.id}</span>
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-orange-500 text-white shadow-md shadow-orange-500/30">
                          {c.status}
                        </span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 relative z-10">
                        <span className="text-sm text-slate-500 dark:text-slate-400">สถานะการช่วยเหลือล่าสุด:</span>
                        <span className={`px-4 py-2 rounded-xl text-sm font-bold text-center w-full sm:w-auto transition-colors duration-300 ${c.status === 'pending' || c.status === 'wait' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50' :
                            c.status === 'in_progress' || c.status === 'accepted' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50' :
                              'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-800/50'
                          }`}>
                          {c.status === 'pending' || c.status === 'wait' ? '⏳ รอดำเนินการ (รอทีมอาสา)' :
                            c.status === 'in_progress' || c.status === 'accepted' ? '🚨 กำลังเข้าช่วยเหลือ' :
                              '✅ ช่วยเหลือเสร็จสิ้นแล้ว'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-[#151b2c]/50 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">ไม่มีเคสที่กำลังดำเนินการในขณะนี้</p>
                </div>
              )}
            </div>

            {/* Past Cases */}
            <div>
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                ⚪ ประวัติในอดีต (ดำเนินการเสร็จสิ้น)
              </h2>
              {pastCases.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {pastCases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(c => (
                      <Link
                        href={`/tracking/${c.rawId}`}
                        key={c.id}
                        className="block bg-white dark:bg-[#0b1325] p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#151b2c] transition-colors opacity-80 hover:opacity-100"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm line-clamp-1">{c.type}</h3>
                          <span className="text-[10px] text-gray-500">{c.time}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">{c.id}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${['resolved', 'completed'].includes(c.status)
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                              : c.status === 'resolved'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                            }`}>
                            {c.status === 'resolved' ? '✓ ปลอดภัยแล้ว' : c.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {pastCases.length > itemsPerPage && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                      </button>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        หน้าที่ {currentPage} / {Math.ceil(pastCases.length / itemsPerPage)}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(pastCases.length / itemsPerPage)))}
                        disabled={currentPage === Math.ceil(pastCases.length / itemsPerPage)}
                        className="p-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
