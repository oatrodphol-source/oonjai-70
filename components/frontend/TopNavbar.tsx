'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Sun, Moon, User, History, PhoneCall, Inbox, AlertCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const TopNavbar: React.FC = () => {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [myCases, setMyCases] = useState<{ id: string, status: string, timestamp?: number | string }[]>([]);
  const [visibleNotifications, setVisibleNotifications] = useState<{ id: string, status: string, timestamp?: number | string }[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const lastKnownDataRef = useRef<string>("");

  useEffect(() => {
    // Check dark mode
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setIsDark(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDark(false);
        document.documentElement.classList.remove('dark');
      }
    }

    // Subscribe to news broadcasts
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase
          .from('news')
          .select('*')
          .eq('published', true)
          .eq('type', 'announcement')
          .order('created_at', { ascending: false })
          .limit(3);

        if (!error && data) {
          const newsItems = data.map(doc => ({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            created_at: doc.created_at,
            message: doc.title,
            time: new Date(doc.created_at).toLocaleString('th-TH')
          }));
          setBroadcasts(newsItems.length > 0 ? newsItems : [{ id: 0, message: "ยังไม่มีประกาศในขณะนี้", time: "" }]);
        } else {
          setBroadcasts([{ id: 0, message: "ยังไม่มีประกาศในขณะนี้", time: "" }]);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchNews();
    // Extended polling safeguard to 30 seconds to prevent mobile network/CPU lag
    const newsInterval = setInterval(fetchNews, 30000);

    const newsChannel = supabase
      .channel('topnavbar-news-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'news' },
        () => {
          fetchNews();
        }
      )
      .subscribe();

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(newsInterval);
      supabase.removeChannel(newsChannel);
    };
  }, []);

  useEffect(() => {
    let casesChannel: any = null;

    const fetchCasesStatus = async (caseIds: string[]) => {
      if (!caseIds || caseIds.length === 0) return [];
      const numericIds = caseIds.map(Number).filter(id => !isNaN(id) && Number.isInteger(id) && id > 0);
      if (numericIds.length === 0) return [];
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .in('id', numericIds);
      if (data && !error) {
        return data;
      }
      return [];
    };

    const loadAndSubscribeCases = async () => {
      if (casesChannel) {
        supabase.removeChannel(casesChannel);
        casesChannel = null;
      }
      try {
        let savedCases = JSON.parse(localStorage.getItem('oonjai_my_cases') || '[]');
        if (!Array.isArray(savedCases)) savedCases = [];

        const keys = ['oonjai_last_sos', 'oonjai_last_report'];
        keys.forEach(key => {
          const dataStr = localStorage.getItem(key);
          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);
              if (data && data.caseId && !savedCases.includes(data.caseId)) {
                savedCases.push(data.caseId);
              }
            } catch (e) {
              console.error(e);
            }
          }
        });

        if (savedCases.length > 0) {
          const updateCasesUI = (fetchedData: any[]) => {
            const casesMap = new Map();
            fetchedData.forEach(data => {
              casesMap.set(String(data.id), {
                id: String(data.id),
                status: data.status,
                timestamp: data.updated_at || data.created_at || 0
              });
            });

            const updatedCases = Array.from(casesMap.values());
            updatedCases.sort((a, b) => {
              return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
            });
            const newDataString = JSON.stringify(updatedCases);
            if (newDataString !== lastKnownDataRef.current) {
              lastKnownDataRef.current = newDataString;
              setVisibleNotifications(updatedCases);
            }
            setMyCases(updatedCases);
          };

          // Initial Fetch
          const data = await fetchCasesStatus(savedCases);
          updateCasesUI(data);

          const casesChannelName = 'topnavbar-my-cases-channel';
          casesChannel = supabase
            .channel(casesChannelName)
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'cases' },
              (payload: any) => {
                const updatedCaseId = String(payload.new.id);
                if (savedCases.map(String).includes(updatedCaseId)) {
                  setMyCases(prev => {
                    const exists = prev.find(c => c.id === updatedCaseId);
                    let next = [...prev];
                    if (exists) {
                      next = next.map(c => c.id === updatedCaseId ? {
                        id: updatedCaseId,
                        status: payload.new.status,
                        timestamp: payload.new.updated_at || payload.new.created_at || 0
                      } : c);
                    } else {
                      next.push({
                        id: updatedCaseId,
                        status: payload.new.status,
                        timestamp: payload.new.updated_at || payload.new.created_at || 0
                      });
                    }
                    next.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

                    const newDataString = JSON.stringify(next);
                    if (newDataString !== lastKnownDataRef.current) {
                      lastKnownDataRef.current = newDataString;
                      setVisibleNotifications(next);
                    }

                    return next;
                  });
                }
              }
            )
            .subscribe();

        } else {
          setMyCases([]);
          setVisibleNotifications([]);
        }
      } catch (e) {
        console.error('Error parsing my cases from local storage', e);
      }
    };

    // Initial load
    loadAndSubscribeCases();

    // Listen for updates from other parts of the app in the same tab
    window.addEventListener('localCasesUpdated', loadAndSubscribeCases);

    return () => {
      window.removeEventListener('localCasesUpdated', loadAndSubscribeCases);
      if (casesChannel) supabase.removeChannel(casesChannel);
    };

  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
  };

  return (
    <nav className="fixed top-0 z-50 w-full bg-[#0b1325]/90 backdrop-blur-md border-b-2 border-[#ff6600] rounded-b-2xl shadow-lg pointer-events-auto transition-all duration-200">
      <div className="flex items-center justify-between px-2.5 sm:px-6 h-16 sm:h-20 w-full max-w-7xl mx-auto">

        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full border border-[#ff6600] flex items-center justify-center bg-[#0b1325] overflow-hidden shrink-0">
            <img src="/icon01.ico" alt="Mascot" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-wide">
            <span className="text-[#ff6600]">Oon</span>
            <span className="text-white">Jai</span>
          </h1>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* History Button with Responsive Text Label */}
          <Link
            href="/history"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-[#ff6600] border border-[#ff6600]/40 rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            title="ประวัติขอความช่วยเหลือ (History)"
          >
            <History size={15} strokeWidth={2.2} className="shrink-0 text-[#ff6600]" />
            <span className="text-[11px] sm:text-xs font-extrabold text-white tracking-tight whitespace-nowrap">
              ประวัติ<span className="hidden sm:inline">ช่วยเหลือ</span>
            </span>
          </Link>

          {/* Theme Toggle */}
          <button onClick={toggleTheme} className="text-white hover:text-[#ff6600] transition-colors p-1.5 sm:p-2 rounded-full min-w-[34px] min-h-[34px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center cursor-pointer" title="เปลี่ยนธีม (Theme)">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Bell Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
              className="text-[#ff6600] hover:scale-110 transition-transform relative p-1.5 sm:p-2 min-w-[34px] min-h-[34px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center cursor-pointer"
              title="การแจ้งเตือน (Notifications)"
            >
              <Bell size={18} strokeWidth={2} />
              {(visibleNotifications.some(c => ['pending', 'in_progress', 'wait', 'accepted'].includes(typeof c.status === 'string' ? c.status.toLowerCase() : String(c.status))) || (broadcasts.length > 0 && broadcasts[0].id !== 0)) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#0b1325]"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-[#0b1325] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-top-4 flex flex-col">
                {/* Cell Broadcast Section */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3">ประกาศจากส่วนกลาง</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    {broadcasts.map(b => (
                      b.id === 0 ? (
                        <div key={b.id} className="p-6 text-center text-sm text-gray-500">{b.message}</div>
                      ) : (
                        <button
                          key={b.id}
                          onClick={() => { setSelectedAnnouncement(b); setShowNotifications(false); }}
                          className="w-full text-left p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-start gap-3"
                        >
                          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 text-red-500">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="font-bold text-sm text-gray-900 dark:text-white mb-1 line-clamp-1">{b.title || b.message}</div>
                            {b.time && <div className="text-xs text-gray-500 mt-1">{b.time}</div>}
                          </div>
                        </button>
                      )
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">การแจ้งเตือนของฉัน</h3>
                    {visibleNotifications.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVisibleNotifications([]);
                        }}
                        className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                      >
                        ล้างการแจ้งเตือน
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-col gap-2 p-1 max-h-48 overflow-y-auto overscroll-contain custom-scrollbar">
                    {visibleNotifications.length > 0 ? visibleNotifications.map(caseItem => {
                      const activeStatuses = ['pending', 'in_progress', 'wait', 'accepted'];
                      const s = typeof caseItem.status === 'string' ? caseItem.status.toLowerCase() : String(caseItem.status);
                      const statusMap: Record<string, string> = {
                        pending: 'รอดำเนินการ',
                        in_progress: 'กำลังเข้าช่วยเหลือ',
                        resolved: 'ช่วยเหลือสำเร็จ',
                        cancelled: 'ยกเลิกแล้ว',
                        accepted: 'รับเรื่องแล้ว',
                        wait: 'รอดำเนินการ',
                      };
                      const thaiStatus = statusMap[s] || caseItem.status;
                      const isCompleted = !activeStatuses.includes(s);
                      const details = isCompleted
                        ? { text: `เคสของคุณ: ${thaiStatus}`, bg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30", color: "text-emerald-600 dark:text-emerald-400" }
                        : { text: `เคสของคุณ: ${thaiStatus}`, bg: "hover:bg-orange-50 dark:hover:bg-orange-900/20 border-orange-100 dark:border-orange-900/30", color: "text-orange-600 dark:text-orange-400" };
                      return (
                        <button
                          key={caseItem.id}
                          onClick={() => { setShowNotifications(false); router.push(`/tracking/${caseItem.id}`); }}
                          className={`w-full text-left p-3 min-h-[48px] rounded-xl transition-colors border shadow-sm mb-2 ${details.bg}`}
                        >
                          <p className={`text-sm font-medium ${details.color}`}>
                            {details.text}
                          </p>
                          <span className="text-xs text-gray-500 mt-1 block font-bold">คลิกเพื่อดูรายละเอียด</span>
                        </button>
                      );
                    }) : (
                      <div className="py-2 text-center flex flex-col items-center justify-center text-gray-400 my-2">
                        <Inbox className="w-8 h-8 text-gray-400 mb-1" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">ไม่มีแจ้งเตือนเคสของคุณในขณะนี้</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-[#ff6600] rounded-full flex items-center justify-center border-2 border-white hover:border-[#ff6600] transition-colors overflow-hidden shrink-0 text-white font-bold shadow-lg"
            >
              <User className="text-white w-5 h-5" />
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-[#0b1325] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-top-4">
                <div className="flex flex-col p-2 gap-1">
                  <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800 mb-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">เมนูลัด</p>
                    <p className="font-bold text-gray-900 dark:text-white truncate">สำหรับประชาชน</p>
                  </div>

                  <button
                    onClick={() => { setShowProfile(false); router.push(`/history`); }}
                    className="flex items-center gap-3 px-3 py-2.5 min-h-[48px] text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors w-full text-left"
                  >
                    <History className="w-4 h-4 text-gray-400" />
                    ประวัติขอความช่วยเหลือ
                  </button>

                  <button
                    onClick={() => { setShowProfile(false); router.push(`/info`); }}
                    className="flex items-center gap-3 px-3 py-2.5 min-h-[48px] text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors w-full text-left"
                  >
                    <PhoneCall className="w-4 h-4 text-gray-400" />
                    เบอร์ติดต่อฉุกเฉิน
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Announcement Detail Modal - Fit to All Devices with Instant 1-Tap Dismiss */}
      {selectedAnnouncement && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedAnnouncement(null);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-[#0b1325] rounded-3xl max-w-sm sm:max-w-lg w-full shadow-2xl overflow-hidden border border-red-200 dark:border-red-900/40 flex flex-col max-h-[75vh] sm:max-h-[80vh] my-auto relative scale-100 animate-in zoom-in-95 duration-200 cursor-default select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Accent */}
            <div className="p-4 sm:p-5 flex justify-between items-start border-b border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/40 shrink-0">
              <div className="flex items-center gap-3 pr-2">
                <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800">
                  <AlertCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                      📢 ประกาศด่วน
                    </span>
                    {selectedAnnouncement.created_at && (
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                        {new Date(selectedAnnouncement.created_at).toLocaleString('th-TH')}
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white leading-tight">
                    {selectedAnnouncement.title || 'ประกาศด่วน!'}
                  </h3>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                onPointerDown={() => setSelectedAnnouncement(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0 touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed select-text">
              {selectedAnnouncement.content || 'ไม่มีรายละเอียดเนื้อหา'}
            </div>

            {/* Elevated Bottom Action Bar */}
            <div className="p-3.5 sm:p-4 bg-gray-50 dark:bg-[#0b1325] border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-semibold text-gray-400">
                ศูนย์กู้ภัยอุ่นใจ OonJai
              </span>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                onPointerDown={() => setSelectedAnnouncement(null)}
                className="px-5 py-2.5 sm:px-6 sm:py-2.5 bg-[#ff6600] hover:bg-[#e65c00] active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-extrabold transition-all shadow-md shadow-orange-500/20 cursor-pointer touch-manipulation"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
