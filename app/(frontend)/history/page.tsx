"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, documentId } from 'firebase/firestore';

export default function HistoryPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const myCases = JSON.parse(localStorage.getItem('oonjai_my_cases') || '[]');
      
      if (!Array.isArray(myCases) || myCases.length === 0) {
        setIsLoading(false);
        return;
      }

      // Safe limit for Firebase 'in' query is 10
      const recentCases = myCases.slice(-10);

      const q = query(
        collection(db, 'cases'),
        where(documentId(), 'in', recentCases)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedCases: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedCases.push({
            id: data.case_number ? `CAS-${String(data.case_number).padStart(3, '0')}` : `CAS-${doc.id.substring(0, 5)}`,
            rawId: doc.id,
            type: data.type || 'ไม่ระบุ',
            status: data.status || 'รอการช่วยเหลือ',
            time: data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 
                  data.createdAt ? new Date(data.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-',
            timestamp: data.updatedAt || data.createdAt || 0
          });
        });
        
        // Sort by timestamp descending
        fetchedCases.sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        setCases(fetchedCases);
        setIsLoading(false);
      }, (error) => {
        console.error('Error fetching history:', error);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error reading local storage:", error);
      setIsLoading(false);
    }
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
              {cases.filter(c => ['รอการช่วยเหลือ', 'กำลังเข้าช่วยเหลือ', 'รอดำเนินการ'].includes(c.status)).length > 0 ? (
                <div className="space-y-4">
                  {cases.filter(c => ['รอการช่วยเหลือ', 'กำลังเข้าช่วยเหลือ', 'รอดำเนินการ'].includes(c.status)).map(c => (
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
              {cases.filter(c => ['ปลอดภัยแล้ว', 'ส่งเข้าศูนย์พักพิงสำเร็จ', 'มอบถุงยังชีพเสร็จสิ้น', 'นำส่งโรงพยาบาลแล้ว', 'เสร็จสิ้น', 'ยุติการช่วยเหลือ', 'completed', 'cancelled', 'ยกเลิก'].includes(c.status)).length > 0 ? (
                <div className="space-y-3">
                  {cases.filter(c => ['ปลอดภัยแล้ว', 'ส่งเข้าศูนย์พักพิงสำเร็จ', 'มอบถุงยังชีพเสร็จสิ้น', 'นำส่งโรงพยาบาลแล้ว', 'เสร็จสิ้น', 'ยุติการช่วยเหลือ', 'completed', 'cancelled', 'ยกเลิก'].includes(c.status)).map(c => (
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
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          ['เสร็จสิ้น', 'completed', 'ส่งเข้าศูนย์พักพิงสำเร็จ', 'มอบถุงยังชีพเสร็จสิ้น', 'นำส่งโรงพยาบาลแล้ว'].includes(c.status)
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' 
                            : c.status === 'ปลอดภัยแล้ว'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                        }`}>
                          {c.status === 'ปลอดภัยแล้ว' ? '✓ ปลอดภัยแล้ว' : c.status}
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
