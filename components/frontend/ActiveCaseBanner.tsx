'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck, Clock, ChevronRight, X, PhoneCall } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePathname, useRouter } from 'next/navigation';

export const ActiveCaseBanner = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseStatus, setCaseStatus] = useState<string>('pending');
  const [volunteerName, setVolunteerName] = useState<string | null>(null);
  const [volunteerPhone, setVolunteerPhone] = useState<string | null>(null);
  const [volunteerUnit, setVolunteerUnit] = useState<string | null>(null);
  
  const [showAcceptedModal, setShowAcceptedModal] = useState<boolean>(false);
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(false);
  const [dismissedModalCaseId, setDismissedModalCaseId] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    
    const checkActiveCases = () => {
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

      candidateIds = Array.from(new Set(candidateIds)).filter(Boolean);

      if (candidateIds.length === 0) {
        setIsBannerVisible(false);
        setShowAcceptedModal(false);
        return;
      }

      const numericIds = candidateIds.map(id => isNaN(Number(id)) ? id : Number(id));

      const fetchLatestCase = async () => {
        try {
          const { data, error } = await supabase
            .from('cases')
            .select('id, case_number, status, volunteer_name, assigned_volunteer_name, rescuer_name, assigned_volunteer_phone, rescuer_phone, assigned_volunteer_unit')
            .in('id', numericIds)
            .order('updated_at', { ascending: false })
            .limit(1);

          if (data && data.length > 0 && !error) {
            const c = data[0];
            const cId = c.case_number ? String(c.case_number).padStart(3, '0') : String(c.id);
            setActiveCaseId(cId);

            const st = (c.status || 'pending').toLowerCase();
            setCaseStatus(st);

            const vName = c.volunteer_name || c.assigned_volunteer_name || c.rescuer_name;
            const vPhone = c.assigned_volunteer_phone || c.rescuer_phone;
            const vUnit = c.assigned_volunteer_unit || 'อาสาสมัครศูนย์กู้ภัย';

            setVolunteerName(vName || null);
            setVolunteerPhone(vPhone || null);
            setVolunteerUnit(vUnit);

            if (['pending', 'wait', 'accepted', 'in_progress'].includes(st)) {
              setIsBannerVisible(true);
              if ((st === 'in_progress' || st === 'accepted' || vName) && dismissedModalCaseId !== cId) {
                setShowAcceptedModal(true);
              }
            } else {
              setIsBannerVisible(false);
              setShowAcceptedModal(false);
            }

            if (unsub) unsub();
            const channel = supabase
              .channel(`global-case-listener-${c.id}`)
              .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'cases', filter: `id=eq.${c.id}` },
                (payload) => {
                  if (payload.new) {
                    const newSt = (payload.new.status || 'pending').toLowerCase();
                    const newVName = payload.new.volunteer_name || payload.new.assigned_volunteer_name || payload.new.rescuer_name;
                    const newVPhone = payload.new.assigned_volunteer_phone || payload.new.rescuer_phone;
                    const newVUnit = payload.new.assigned_volunteer_unit || 'อาสาสมัครศูนย์กู้ภัย';

                    setCaseStatus(newSt);
                    setVolunteerName(newVName || null);
                    setVolunteerPhone(newVPhone || null);
                    setVolunteerUnit(newVUnit);

                    if (['pending', 'wait', 'accepted', 'in_progress'].includes(newSt)) {
                      setIsBannerVisible(true);
                      if (newSt === 'in_progress' || newSt === 'accepted' || newVName) {
                        setShowAcceptedModal(true);
                        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
                          window.navigator.vibrate([200, 100, 200, 100, 200]);
                        }
                      }
                    } else {
                      setIsBannerVisible(false);
                      setShowAcceptedModal(false);
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
            setShowAcceptedModal(false);
          }
        } catch (err) {
          console.error("Failed to fetch global case:", err);
        }
      };

      fetchLatestCase();
    };

    checkActiveCases();
    window.addEventListener('localCasesUpdated', checkActiveCases);
    const interval = setInterval(checkActiveCases, 10000);

    return () => {
      window.removeEventListener('localCasesUpdated', checkActiveCases);
      clearInterval(interval);
      if (unsub) unsub();
    };
  }, [dismissedModalCaseId]);

  if (!isBannerVisible || !activeCaseId) return null;

  const isTrackingPageForThisCase = pathname === `/tracking/${activeCaseId}`;

  return (
    <>
      {/* 🔔 1. HIGH-PRIORITY POPUP MODAL (Triggers on ANY page when volunteer accepts) */}
      {showAcceptedModal && (caseStatus === 'in_progress' || caseStatus === 'accepted' || volunteerName) && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0b1325] border-2 border-emerald-500 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <button
              onClick={() => {
                setShowAcceptedModal(false);
                setDismissedModalCaseId(activeCaseId);
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Truck className="w-8 h-8" />
            </div>

            <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold rounded-full mb-2">
              เจ้าหน้าที่รับเคสแล้ว!
            </span>

            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
              มีอาสาสมัครเข้ามารับเคสของคุณแล้ว
            </h3>

            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mb-5 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">ผู้รับผิดชอบ:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {volunteerName || 'เจ้าหน้าที่ทีมกู้ภัย'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">หน่วยงาน:</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {volunteerUnit}
                </span>
              </div>
              {volunteerPhone && (volunteerPhone !== 'ไม่ระบุเบอร์โทร') && (
                <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="text-xs text-gray-500">เบอร์ติดต่อ:</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    📞 {volunteerPhone}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {volunteerPhone && (volunteerPhone !== 'ไม่ระบุเบอร์โทร') && (
                <a
                  href={`tel:${volunteerPhone}`}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/30"
                >
                  📞 โทรติดต่อเจ้าหน้าที่ ({volunteerPhone})
                </a>
              )}
              
              <button
                onClick={() => {
                  setShowAcceptedModal(false);
                  setDismissedModalCaseId(activeCaseId);
                  router.push(`/tracking/${activeCaseId}`);
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#ff6600] hover:bg-orange-600 text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all shadow-md shadow-orange-500/20"
              >
                ดูสถานะการช่วยเหลือ (#160) ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 2. PERSISTENT FLOATING BANNER (Renders on other pages when banner is active) */}
      {!isTrackingPageForThisCase && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-[9990] w-full max-w-sm px-4 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
          {(caseStatus === 'in_progress' || caseStatus === 'accepted' || volunteerName) ? (
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
      )}
    </>
  );
};
