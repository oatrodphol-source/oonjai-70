'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ChevronRight } from 'lucide-react';

export const ActiveCaseBanner = () => {
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [isBannerVisible, setIsBannerVisible] = useState(false);

  useEffect(() => {
    const checkActiveCases = async () => {
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
        
        try {
          const res = await fetch(`/api/cases/${foundCaseId}?t=${Date.now()}`);
          if (res.ok) {
            const data = await res.json();
            if (['pending', 'accepted', 'in_progress'].includes(data.status)) {
              setIsBannerVisible(true);
            } else if (['completed', 'cancelled'].includes(data.status)) {
              setIsBannerVisible(false);
            }
          }
        } catch (err) {
          console.error("Failed to fetch status for banner:", err);
        }
      } else {
        setIsBannerVisible(false);
      }
    };

    checkActiveCases();
    const interval = setInterval(checkActiveCases, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!isBannerVisible || !activeCaseId) return null;

  return (
    <Link 
      href={`/tracking/${activeCaseId}`}
      className="block w-full bg-red-600 text-white px-4 py-2.5 shadow-md relative z-40 animate-in fade-in slide-in-from-top-4"
    > 
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 animate-pulse shrink-0" />
          <span className="text-sm font-semibold truncate">🚨 มีรายการขอความช่วยเหลือที่กำลังดำเนินการ</span>
        </div>
        <div className="flex items-center text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors px-2 py-1 rounded-md shrink-0">
          ดูสถานะ <ChevronRight className="w-3 h-3 ml-0.5" />
        </div>
      </div>
    </Link>
  );
};
