'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const ActiveCaseBanner = () => {
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [isBannerVisible, setIsBannerVisible] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    
    const checkActiveCases = () => {
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      let foundCaseId = null;
      let latestTimestamp = 0;

      const keys = ['oonjai_last_sos', 'oonjai_last_report'];
      keys.forEach(key => {
        const dataStr = localStorage.getItem(key);
        if (dataStr) {
          try {
            const data = JSON.parse(dataStr);
            if (now - data.timestamp < tenMinutes && data.timestamp > latestTimestamp) {
              latestTimestamp = data.timestamp;
              foundCaseId = data.caseId;
            }
          } catch (e) {
            console.error('Error parsing local storage:', e);
          }
        }
      });

      if (foundCaseId) {
        setActiveCaseId(String(foundCaseId));
        
        if (unsub) unsub();
        
        unsub = onSnapshot(doc(db, 'cases', String(foundCaseId)), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (['pending', 'wait', 'accepted', 'in_progress', 'รอการช่วยเหลือ', 'รับเรื่องแล้ว', 'กำลังช่วยเหลือ', 'รอดำเนินการ', 'กำลังดำเนินการ'].includes(data.status)) {
              setIsBannerVisible(true);
            } else {
              setIsBannerVisible(false);
            }
          } else {
            setIsBannerVisible(false);
          }
        }, (err) => {
          console.error("Failed to listen to banner case:", err);
        });
      } else {
        setIsBannerVisible(false);
      }
    };

    checkActiveCases();
    window.addEventListener('localCasesUpdated', checkActiveCases);
    
    return () => {
      window.removeEventListener('localCasesUpdated', checkActiveCases);
      if (unsub) unsub();
    };
  }, []);

  if (!isBannerVisible || !activeCaseId) return null;

  return (
    <div className="absolute bottom-6 left-4 z-[1000] pointer-events-auto">
      <Link href="/history" className="bg-red-600 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 hover:bg-red-700 transition-all border-2 border-white dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <span className="text-sm font-bold">ประวัติช่วยเหลือ</span>
      </Link>
    </div>
  );
};
