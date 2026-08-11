'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

export const ActiveCaseBanner = () => {
  const pathname = usePathname();
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [isBannerVisible, setIsBannerVisible] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    
    const checkActiveCases = () => {
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      let foundCaseId: string | number | null = null;
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
        
        let channel: any = null;

        const fetchCaseStatus = async () => {
          try {
            const { data, error } = await supabase
              .from('cases')
              .select('status')
              .eq('id', foundCaseId)
              .single();

            if (data && !error) {
              if (['pending', 'wait', 'accepted', 'in_progress'].includes(data.status)) {
                setIsBannerVisible(true);
              } else {
                setIsBannerVisible(false);
              }
            } else {
              setIsBannerVisible(false);
            }
          } catch (err) {
            console.error("Failed to fetch banner case:", err);
          }
        };

        fetchCaseStatus();

        channel = supabase
          .channel(`case-banner-${foundCaseId}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'cases', filter: `id=eq.${foundCaseId}` },
            (payload) => {
              if (payload.new) {
                if (['pending', 'wait', 'accepted', 'in_progress'].includes(payload.new.status)) {
                  setIsBannerVisible(true);
                } else {
                  setIsBannerVisible(false);
                }
              }
            }
          )
          .subscribe();

        unsub = () => {
          if (channel) supabase.removeChannel(channel);
        };
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

  // Show only on map pages
  if (pathname !== '/' && pathname !== '/map') return null;
  
  if (!isBannerVisible || !activeCaseId) return null;

  return (
    <div className="absolute top-28 sm:top-32 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
      <Link href="/history" className="bg-red-600 text-white px-6 py-2 rounded-full shadow-xl flex items-center gap-3 hover:bg-red-700 transition-all border-2 border-white/20 backdrop-blur-md animate-in fade-in slide-in-from-top-4">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <span className="text-sm font-bold tracking-wide">กำลังขอความช่วยเหลือ</span>
      </Link>
    </div>
  );
};
