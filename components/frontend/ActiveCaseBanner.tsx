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
    <Link 
      href={`/tracking/${activeCaseId}`}
      className="w-full bg-red-600 text-white px-3 py-2 flex flex-row flex-wrap items-center justify-between gap-2 text-xs sm:text-sm z-50 shadow-md relative animate-in fade-in slide-in-from-top-4"
    > 
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <AlertCircle className="w-5 h-5 animate-pulse shrink-0" />
          <span className="font-semibold text-left break-words whitespace-normal leading-tight">🚨 มีรายการขอความช่วยเหลือที่กำลังดำเนินการ</span>
        </div>
        <div className="flex items-center font-bold bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-md shrink-0">
          ดูสถานะ <ChevronRight className="w-3 h-3 ml-0.5" />
        </div>
    </Link>
  );
};
