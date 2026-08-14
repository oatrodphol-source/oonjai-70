'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck, Clock, ChevronRight, X, PhoneCall, CheckCircle2, Home, Package, Hospital } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePathname, useRouter } from 'next/navigation';

interface CaseUpdateModalData {
  caseId: string;
  status: string;
  destination: string | null;
  volunteerName: string | null;
  volunteerPhone: string | null;
  volunteerUnit: string;
  seenKey: string;
}

export const ActiveCaseBanner = () => {
  const pathname = usePathname();
  const router = useRouter();

  // Banner State
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseStatus, setCaseStatus] = useState<string>('pending');
  const [volunteerName, setVolunteerName] = useState<string | null>(null);
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(false);

  // Dedicated Popup Modal State (Independent of Banner Polling)
  const [activeUpdateModal, setActiveUpdateModal] = useState<CaseUpdateModalData | null>(null);

  useEffect(() => {
    let realtimeChannel: any = null;

    const getCandidateIds = (): string[] => {
      let candidateIds: string[] = [];

      const activeId = typeof window !== 'undefined' ? localStorage.getItem('oonjai_active_case_id') : null;
      if (activeId) candidateIds.push(String(activeId));

      try {
        const myCasesStr = localStorage.getItem('oonjai_my_cases');
        if (myCasesStr) {
          const parsed = JSON.parse(myCasesStr);
          if (Array.isArray(parsed)) {
            parsed.forEach((cId) => candidateIds.push(String(cId)));
          }
        }
      } catch (e) {}

      const keys = ['oonjai_last_sos', 'oonjai_last_report', 'oonjai_last_report_data'];
      keys.forEach(key => {
        const dataStr = localStorage.getItem(key);
        if (dataStr) {
          try {
            const data = JSON.parse(dataStr);
            if (data.caseId) candidateIds.push(String(data.caseId));
          } catch (e) {}
        }
      });

      return Array.from(new Set(candidateIds)).filter(Boolean);
    };

    const isKeySeen = (key: string) => {
      try {
        const seen = localStorage.getItem('oonjai_seen_case_updates');
        const seenArr = seen ? JSON.parse(seen) : [];
        return seenArr.includes(key);
      } catch (e) {
        return false;
      }
    };

    const triggerModalIfUnseen = (caseData: any) => {
      const cId = caseData.case_number ? String(caseData.case_number).padStart(3, '0') : String(caseData.id);
      const cSt = (caseData.status || 'pending').toLowerCase();
      const cVName = caseData.volunteer_name || caseData.assigned_volunteer_name || caseData.rescuer_name;
      const cDest = caseData.destination || '';
      const cPhone = caseData.assigned_volunteer_phone || caseData.rescuer_phone;
      const cUnit = caseData.assigned_volunteer_unit || 'อาสาสมัครศูนย์กู้ภัย';

      if (cSt !== 'pending' && cSt !== 'wait') {
        const updateKey = `case_${caseData.id}_${cSt}_${cDest}_${cVName || ''}`;
        if (!isKeySeen(updateKey)) {
          setActiveUpdateModal({
            caseId: cId,
            status: cSt,
            destination: cDest || null,
            volunteerName: cVName || null,
            volunteerPhone: cPhone || null,
            volunteerUnit: cUnit,
            seenKey: updateKey,
          });

          if (typeof window !== 'undefined' && window.navigator?.vibrate) {
            window.navigator.vibrate([200, 100, 200, 100, 200]);
          }
        }
      }
    };

    const checkActiveCases = async () => {
      const candidateIds = getCandidateIds();

      const numericIds = candidateIds
        .map(id => Number(id))
        .filter(id => !isNaN(id) && Number.isInteger(id) && id > 0);

      if (numericIds.length === 0) {
        setIsBannerVisible(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('cases')
          .select('id, case_number, status, destination, volunteer_name, assigned_volunteer_name, rescuer_name, assigned_volunteer_phone, rescuer_phone, assigned_volunteer_unit, updated_at')
          .in('id', numericIds)
          .order('id', { ascending: false });

        if (data && data.length > 0 && !error) {
          // Banner state logic
          const activeCase = data.find(c => ['pending', 'wait', 'accepted', 'in_progress'].includes((c.status || '').toLowerCase())) || data[0];
          const activeCId = activeCase.case_number ? String(activeCase.case_number).padStart(3, '0') : String(activeCase.id);
          
          setActiveCaseId(activeCId);
          const st = (activeCase.status || 'pending').toLowerCase();
          setCaseStatus(st);
          const vName = activeCase.volunteer_name || activeCase.assigned_volunteer_name || activeCase.rescuer_name;
          setVolunteerName(vName || null);

          if (['pending', 'wait', 'accepted', 'in_progress'].includes(st)) {
            setIsBannerVisible(true);
          } else {
            setIsBannerVisible(false);
          }

          // Check if any case has unseen status update
          for (const c of data) {
            triggerModalIfUnseen(c);
          }
        }
      } catch (err) {
        console.error("Failed to fetch global case updates:", err);
      }
    };

    // Initial check
    checkActiveCases();

    // Persistent Supabase Realtime Listener across all victim cases
    const channelName = 'victim-global-updates-channel';
    realtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cases' },
        (payload) => {
          if (payload.new) {
            const candidateIds = getCandidateIds();
            const payloadIdStr = String(payload.new.id);
            const payloadCaseNumStr = payload.new.case_number ? String(payload.new.case_number).padStart(3, '0') : payloadIdStr;

            const isMyCase = candidateIds.some(id => String(id) === payloadIdStr || String(id) === payloadCaseNumStr);

            if (isMyCase) {
              triggerModalIfUnseen(payload.new);
              checkActiveCases();
            }
          }
        }
      )
      .subscribe();

    window.addEventListener('localCasesUpdated', checkActiveCases);
    // Polling safeguard extended to 30 seconds to prevent mobile CPU & network lag
    const interval = setInterval(checkActiveCases, 30000);

    return () => {
      window.removeEventListener('localCasesUpdated', checkActiveCases);
      clearInterval(interval);
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const isTrackingPageForThisCase = pathname === `/tracking/${activeCaseId}`;

  const markUpdateAsSeen = (key: string | null) => {
    if (key) {
      try {
        const seen = localStorage.getItem('oonjai_seen_case_updates');
        const arr = seen ? JSON.parse(seen) : [];
        if (!arr.includes(key)) {
          arr.push(key);
          localStorage.setItem('oonjai_seen_case_updates', JSON.stringify(arr));
        }
      } catch (e) {}
    }
    setActiveUpdateModal(null);
  };

  // Helper for dynamic badge and titles
  const getBadgeAndTitle = (modalData: CaseUpdateModalData) => {
    const { status, destination } = modalData;
    if (status === 'in_progress' || status === 'accepted') {
      return {
        badge: 'เจ้าหน้าที่รับเคสแล้ว!',
        title: 'มีอาสาสมัครเข้ามารับเคสของคุณแล้ว',
        icon: <Truck className="w-8 h-8" />
      };
    }
    if (destination?.includes('ศูนย์พักพิง') || status.includes('ศูนย์พักพิง')) {
      return {
        badge: 'นำส่งศูนย์พักพิงแล้ว!',
        title: 'เจ้าหน้าที่ได้นำส่งเข้าศูนย์พักพิงเรียบร้อยแล้ว',
        icon: <Home className="w-8 h-8 text-emerald-400" />
      };
    }
    if (destination?.includes('ถุงยังชีพ') || status.includes('ถุงยังชีพ')) {
      return {
        badge: 'มอบถุงยังชีพเรียบร้อย!',
        title: 'เจ้าหน้าที่ได้ส่งมอบถุงยังชีพให้คุณเรียบร้อยแล้ว',
        icon: <Package className="w-8 h-8 text-amber-400" />
      };
    }
    if (destination?.includes('โรงพยาบาล') || status.includes('โรงพยาบาล')) {
      return {
        badge: 'นำส่งโรงพยาบาลแล้ว!',
        title: 'เจ้าหน้าที่ได้นำส่งโรงพยาบาลเรียบร้อยแล้ว',
        icon: <Hospital className="w-8 h-8 text-red-400" />
      };
    }
    if (status === 'completed' || status === 'resolved') {
      return {
        badge: 'ช่วยเหลือสำเร็จ!',
        title: 'เคสขอความช่วยเหลือของคุณเสร็จสิ้นเรียบร้อยแล้ว',
        icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      };
    }
    return {
      badge: 'อัปเดตสถานะช่วยเหลือ!',
      title: 'มีการอัปเดตสถานะการช่วยเหลือเคสของคุณ',
      icon: <Truck className="w-8 h-8" />
    };
  };

  return (
    <>
      {/* 🔔 1. HIGH-PRIORITY POPUP MODAL (z-[999999] Frontmost Layer across all pages) */}
      {activeUpdateModal && (() => {
        const modalContent = getBadgeAndTitle(activeUpdateModal);
        return (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto">
            <div className="bg-white dark:bg-[#0b1325] border-2 border-emerald-500 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden">
              <button
                onClick={() => markUpdateAsSeen(activeUpdateModal.seenKey)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                {modalContent.icon}
              </div>

              <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold rounded-full mb-2">
                {modalContent.badge}
              </span>

              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                {modalContent.title}
              </h3>

              <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mb-5 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">ผู้รับผิดชอบ:</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {activeUpdateModal.volunteerName || 'เจ้าหน้าที่ทีมกู้ภัย'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">หน่วยงาน:</span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {activeUpdateModal.volunteerUnit}
                  </span>
                </div>
                {activeUpdateModal.volunteerPhone && (activeUpdateModal.volunteerPhone !== 'ไม่ระบุเบอร์โทร') && (
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                    <span className="text-xs text-gray-500">เบอร์ติดต่อ:</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      📞 {activeUpdateModal.volunteerPhone}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {activeUpdateModal.volunteerPhone && (activeUpdateModal.volunteerPhone !== 'ไม่ระบุเบอร์โทร') && (
                  <a
                    href={`tel:${activeUpdateModal.volunteerPhone}`}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    📞 โทรติดต่อเจ้าหน้าที่ทันที
                  </a>
                )}
                
                <button
                  onClick={() => {
                    const cId = activeUpdateModal.caseId;
                    markUpdateAsSeen(activeUpdateModal.seenKey);
                    router.push(`/tracking/${cId}`);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#ff6600] hover:bg-orange-600 text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  รับทราบ / ดูสถานะติดตาม (#{activeUpdateModal.caseId}) ➔
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🚨 2. PERSISTENT FLOATING BANNER */}
      {!isTrackingPageForThisCase && (caseStatus === 'in_progress' || caseStatus === 'accepted' || volunteerName) && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-[9990] w-full max-w-sm px-4 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
          <Link
            href={`/tracking/${activeCaseId}`}
            className="bg-emerald-600 dark:bg-emerald-700 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border-2 border-emerald-400 hover:bg-emerald-700 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 bg-white text-emerald-700 rounded-xl flex items-center justify-center shrink-0 shadow-sm animate-bounce">
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded-full inline-block">อาสารับเคสแล้ว!</div>
                <p className="text-xs font-black truncate mt-0.5">
                  {volunteerName ? `ทีมอาสา ${volunteerName} กำลังเดินทาง` : 'อาสาสมัครกำลังเดินทางมาช่วยเหลือ'}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1">
              ดูสถานะ <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>
      )}

      {/* 🔴 3. RED ACTIVE CASE PILL BUTTON */}
      {(pathname === '/' || pathname === '/map') && isBannerVisible && (
        <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[9995] pointer-events-auto">
          <Link 
            href="/history" 
            className="bg-red-600 hover:bg-red-700 active:scale-95 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 transition-all border-2 border-white/40 backdrop-blur-md animate-in fade-in slide-in-from-top-4"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="text-xs sm:text-sm font-extrabold tracking-wide drop-shadow-sm">กำลังขอความช่วยเหลือ</span>
          </Link>
        </div>
      )}
    </>
  );
};
