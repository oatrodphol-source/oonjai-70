'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Sun, Moon, User, History, PhoneCall, Inbox, AlertCircle } from 'lucide-react';
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
    const newsChannelName = `custom-navbar-news-${Date.now()}`;
    const newsChannel = supabase
      .channel(newsChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'news' },
        (payload: any) => {
          setBroadcasts(prev => {
            let updated = [...prev].filter(b => b.id !== 0);
            const isAnnouncement = payload.new?.type === 'announcement';

            if (payload.eventType === 'INSERT' && payload.new.published && isAnnouncement) {
              updated.push({
                id: payload.new.id,
                title: payload.new.title,
                content: payload.new.content,
                created_at: payload.new.created_at,
                message: payload.new.title,
                time: new Date(payload.new.created_at).toLocaleString('th-TH')
              });
            } else if (payload.eventType === 'UPDATE') {
              if (payload.new.published && isAnnouncement) {
                const existing = updated.find(b => b.id === payload.new.id);
                if (existing) {
                  updated = updated.map(b => b.id === payload.new.id ? { ...b, title: payload.new.title, content: payload.new.content, message: payload.new.title } : b);
                } else {
                  updated.push({
                    id: payload.new.id,
                    title: payload.new.title,
                    content: payload.new.content,
                    created_at: payload.new.created_at,
                    message: payload.new.title,
                    time: new Date(payload.new.created_at).toLocaleString('th-TH')
                  });
                }
              } else {
                updated = updated.filter(b => b.id !== payload.new.id);
              }
            } else if (payload.eventType === 'DELETE') {
              updated = updated.filter(b => b.id !== payload.old.id);
            }

            updated.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

            if (updated.length > 3) updated = updated.slice(0, 3);
            if (updated.length === 0) return [{ id: 0, message: "ยังไม่มีประกาศในขณะนี้", time: "" }];
            return updated;
          });
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
      supabase.removeChannel(newsChannel);
    };
  }, []);

  useEffect(() => {
    let casesChannel: any = null;

    const fetchCasesStatus = async (caseIds: string[]) => {
      if (!caseIds || caseIds.length === 0) return [];
      const numericIds = caseIds.map(Number).filter(id => !isNaN(id));
      if (numericIds.length === 0) return [];

      const { data: idData } = await supabase.from('cases').select('*').in('id', numericIds);
      const { data: numData } = await supabase.from('cases').select('*').in('case_number', numericIds);

      const combinedMap = new Map();
      (idData || []).forEach(c => combinedMap.set(String(c.id), c));
      (numData || []).forEach(c => combinedMap.set(String(c.id), c));

      return Array.from(combinedMap.values());
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
              const navId = data.case_number ? String(data.case_number) : String(data.id);
              casesMap.set(navId, {
                id: navId,
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

          const casesChannelName = `public:cases-navbar-${Date.now()}`;
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
      <div className="flex items-center justify-between px-4 h-16 sm:h-20 max-w-md mx-auto sm:max-w-none">

        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-[#ff6600] flex items-center justify-center bg-[#0b1325] overflow-hidden">
            <img src="/icon01.ico" alt="Mascot" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-wide">
            <span className="text-[#ff6600]">Oon</span>
            <span className="text-white">Jai</span>
          </h1>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={toggleTheme} className="text-white hover:text-[#ff6600] transition-colors p-2 rounded-full min-w-[48px] min-h-[48px] flex items-center justify-center">
            {isDark ? <Sun size={22} /> : <Moon size={22} />}
          </button>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
              className="text-[#ff6600] hover:scale-110 transition-transform relative p-2 min-w-[48px] min-h-[48px] flex items-center justify-center"
            >
              <Bell size={22} strokeWidth={2} />
              {(visibleNotifications.some(c => ['pending', 'in_progress', 'wait', 'accepted'].includes(typeof c.status === 'string' ? c.status.toLowerCase() : String(c.status))) || (broadcasts.length > 0 && broadcasts[0].id !== 0)) && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#0b1325]"></span>
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

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in pointer-events-auto">
          <div className="bg-white dark:bg-[#0b1325] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="p-5 flex justify-between items-start border-b border-gray-100 dark:border-gray-800 bg-red-50 dark:bg-red-900/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 text-red-500">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">
                    {selectedAnnouncement.title || 'ประกาศด่วน!'}
                  </h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ประกาศเมื่อ: {selectedAnnouncement.created_at ? new Date(selectedAnnouncement.created_at).toLocaleString('th-TH') : '-'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {selectedAnnouncement.content || 'ไม่มีรายละเอียดเนื้อหา'}
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-5 py-2.5 bg-[#ff6600] text-white rounded-xl text-sm font-bold hover:bg-[#e65c00] transition-colors shadow-sm"
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
