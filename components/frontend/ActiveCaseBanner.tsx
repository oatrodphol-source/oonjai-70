'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

export const ActiveCaseBanner = () => {
  const pathname = usePathname();
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseStatus, setCaseStatus] = useState<string>('pending');
  const [volunteerName, setVolunteerName] = useState<string | null>(null);
  const [isBannerVisible, setIsBannerVisible] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    
    const checkActiveCases = () => {
      let foundCaseId = typeof window !== 'undefined' ? localStorage.getItem('oonjai_active_case_id') : null;
      
      if (!foundCaseId) {
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;
        let latestTimestamp = 0;
        const keys = ['oonjai_last_sos', 'oonjai_last_report', 'oonjai_last_report_data'];
        keys.forEach(key => {
          const dataStr = localStorage.getItem(key);
          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);
              if (now - data.timestamp < tenMinutes && data.timestamp > latestTimestamp && data.caseId) {
                latestTimestamp = data.timestamp;
                foundCaseId = String(data.caseId);
              }
            } catch (e) {}
          }
        });
      }

      if (foundCaseId) {
        setActiveCaseId(String(foundCaseId));
        if (unsub) unsub();
        
        let channel: any = null;

        const fetchCaseStatus = async () => {
          try {
            const { data, error } = await supabase
              .from('cases')
              .select('status, volunteer_name, assigned_volunteer_name, rescuer_name')
              .eq('id', foundCaseId)
              .single();

            if (data && !error) {
              const st = (data.status || 'pending').toLowerCase();
              setCaseStatus(st);
              const vName = data.volunteer_name || data.assigned_volunteer_name || data.rescuer_name;
              setVolunteerName(vName || null);

              if (['pending', 'wait', 'accepted', 'in_progress'].includes(st)) {
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
          .channel(`case-global-banner-${foundCaseId}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'cases', filter: `id=eq.${foundCaseId}` },
            (payload) => {
              if (payload.new) {
                const newSt = (payload.new.status || 'pending').toLowerCase();
                const newVName = payload.new.volunteer_name || payload.new.assigned_volunteer_name || payload.new.rescuer_name;
                
                // Trigger vibration if volunteer just accepted
                if (caseStatus === 'pending' && newSt === 'in_progress' && typeof window !== 'undefined' && window.navigator?.vibrate) {
                  window.navigator.vibrate([200, 100, 200]);
                }

                setCaseStatus(newSt);
                setVolunteerName(newVName || null);

                if (['pending', 'wait', 'accepted', 'in_progress'].includes(newSt)) {
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
  }, [caseStatus]);

  // Hide on tracking page of the active case
  if (pathname === `/tracking/${activeCaseId}`) return null;
  if (!isBannerVisible || !activeCaseId) return null;

  return (
    <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[9990] w-full max-w-sm px-4 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
      {caseStatus === 'in_progress' ? (
        <Link
          href={`/tracking/${activeCaseId}`}
          className="bg-emerald-600 dark:bg-emerald-700 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border-2 border-emerald-400 hover:bg-emerald-700 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-white text-emerald-700 rounded-xl flex items-center justify-center shrink-0 shadow-sm animate-bounce">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded-full">เจ้าหน้าที่รับเคสแล้ว!</span>
              </div>
              <p className="text-xs font-black truncate mt-0.5">
                {volunteerName ? `ทีมอาสา ${volunteerName} กำลังเดินทาง` : 'อาสาสมัครกำลังเดินทางมาช่วยเหลือ'}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1">
            ดูสถานะ <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      ) : (
        <Link
          href={`/tracking/${activeCaseId}`}
          className="bg-orange-600 text-white px-5 py-2.5 rounded-full shadow-xl flex items-center justify-between gap-2 hover:bg-orange-700 transition-all border-2 border-white/20 backdrop-blur-md"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <Clock className="w-4 h-4 text-orange-200" />
            <span className="text-xs font-bold tracking-wide">กำลังขอความช่วยเหลือ (#{activeCaseId})</span>
          </div>
          <span className="text-[11px] font-extrabold bg-white/20 px-2.5 py-1 rounded-full flex items-center gap-0.5">
            ติดตาม <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      )}
    </div>
  );
};
