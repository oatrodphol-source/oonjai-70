'use client';
import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Activity, Clock, HeartPulse, Home } from 'lucide-react';

export default function HistoryRescuePage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read the logged-in volunteer's ID from localStorage
    const userStr = localStorage.getItem('oonjai_user');
    if (!userStr) {
      setLoading(false);
      return;
    }

    let uid = '';
    try {
      const user = JSON.parse(userStr);
      uid = user.uid;
    } catch (e) {
      setLoading(false);
      return;
    }

    if (!uid) {
      setLoading(false);
      return;
    }

    // Query the 'cases' collection
    const q = query(collection(db, 'cases'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const terminalStates = ['ส่งเข้าศูนย์พักพิงสำเร็จ', 'มอบถุงยังชีพเสร็จสิ้น', 'นำส่งโรงพยาบาลแล้ว', 'เสร็จสิ้น', 'completed'];
      const fetched: any[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        // Check if assigned to current user and status is terminal
        if (data.assigned_volunteer_id === uid && terminalStates.includes(data.status)) {
          fetched.push({
            id: data.case_number ? `CAS-${String(data.case_number).padStart(3, '0')}` : `CAS-${doc.id.substring(0, 5)}`,
            type: data.type || 'ไม่ระบุ',
            status: data.status,
            timeCompleted: data.completedAt ? new Date(data.completedAt).toLocaleString('th-TH') : 
                           (data.updatedAt ? new Date(data.updatedAt).toLocaleString('th-TH') : '-'),
            timestamp: data.completedAt ? new Date(data.completedAt).getTime() : 
                       (data.updatedAt ? new Date(data.updatedAt).getTime() : 0)
          });
        }
      });

      // Sort by newest first
      fetched.sort((a, b) => b.timestamp - a.timestamp);
      setCases(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusBadge = (status: string) => {
    if (status === 'นำส่งโรงพยาบาลแล้ว') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-bold whitespace-nowrap">
          <HeartPulse className="w-3.5 h-3.5" />
          ส่งโรงพยาบาล
        </span>
      );
    }
    if (status === 'ส่งเข้าศูนย์พักพิงสำเร็จ') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold whitespace-nowrap">
          <Home className="w-3.5 h-3.5" />
          ศูนย์พักพิง
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-bold whitespace-nowrap">
        <Activity className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  };

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดประวัติการช่วยเหลือ...</div>;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-[env(safe-area-inset-bottom)] pt-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">ประวัติการให้ความช่วยเหลือ</h1>
      
      {cases.length === 0 ? (
        <div className="bg-white dark:bg-[#151b2c] rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center text-gray-500">
          คุณยังไม่มีประวัติการช่วยเหลือเคสที่เสร็จสิ้น
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((c, i) => (
            <div key={i} className="bg-white dark:bg-[#151b2c] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3 gap-2">
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-lg">{c.id}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">{c.type}</div>
                </div>
                {getStatusBadge(c.status)}
              </div>
              <div className="flex items-center text-xs text-gray-500 gap-1.5">
                <Clock className="w-4 h-4" />
                เวลาที่เสร็จสิ้น: {c.timeCompleted}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
