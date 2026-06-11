"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HistoryPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userPhone = localStorage.getItem('oonjai_user_phone');
    const lastSOS = localStorage.getItem('oonjai_last_sos');
    const lastReport = localStorage.getItem('oonjai_last_report');
    
    if (!userPhone && !lastSOS && !lastReport) {
      setIsLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        let fetchedCases: any[] = [];
        
        if (userPhone) {
          const res = await fetch(`/api/cases?phone=${userPhone}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              fetchedCases = data;
            }
          }
        }
        
        // Fallback: If no cases found via phone, try to salvage via exact case ID
        if (fetchedCases.length === 0) {
          let fallbackId = null;
          if (lastSOS) {
            try { fallbackId = JSON.parse(lastSOS).caseId; } catch (e) {}
          } else if (lastReport) {
            try { fallbackId = JSON.parse(lastReport).caseId; } catch (e) {}
          }
          
          if (fallbackId) {
            const fallbackRes = await fetch(`/api/cases?id=${fallbackId}`);
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              if (Array.isArray(fallbackData) && fallbackData.length > 0) {
                fetchedCases = fallbackData;
              }
            }
          }
        }
        
        setCases(fetchedCases);
      } catch (error) {
        console.error('Error fetching history:', error);
        setCases([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-gray-900 pt-24 pb-32 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-6">รายการขอความช่วยเหลือของฉัน</h1>

        {isLoading ? (
          <p className="text-center text-gray-500 mt-10">กำลังโหลดข้อมูล...</p>
        ) : cases.length === 0 ? (
          <div className="text-center mt-10 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <p className="text-gray-500 dark:text-gray-400">📭 ยังไม่มีประวัติการแจ้งเหตุในอุปกรณ์นี้</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Active Cases */}
            <div>
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                🔴 เคสปัจจุบัน (กำลังดำเนินการ)
              </h2>
              {cases.filter(c => ['รอการช่วยเหลือ', 'รับเรื่องแล้ว', 'กำลังช่วยเหลือ'].includes(c.status)).length > 0 ? (
                <div className="space-y-4">
                  {cases.filter(c => ['รอการช่วยเหลือ', 'รับเรื่องแล้ว', 'กำลังช่วยเหลือ'].includes(c.status)).map(c => (
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
              {cases.filter(c => ['เสร็จสิ้น', 'ยกเลิก'].includes(c.status)).length > 0 ? (
                <div className="space-y-3">
                  {cases.filter(c => ['เสร็จสิ้น', 'ยกเลิก'].includes(c.status)).map(c => (
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
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${c.status === 'เสร็จสิ้น' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                          {c.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
