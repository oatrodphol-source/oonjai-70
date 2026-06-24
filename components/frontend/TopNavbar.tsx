'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Bell, User, LogOut, Sun, Moon, History, PhoneCall, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit as firestoreLimit, doc, where, documentId } from 'firebase/firestore';
import { useAuthProfile } from '@/hooks/useAuth';

export const TopNavbar: React.FC = () => {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { name, role, initial, loading } = useAuthProfile();
  const [myCases, setMyCases] = useState<{ id: string, status: string }[]>([]);
  const [visibleNotifications, setVisibleNotifications] = useState<{ id: string, status: string }[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

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
    const q = query(collection(db, 'news'), orderBy('created_at', 'desc'), firestoreLimit(3));
    const unsubNews = onSnapshot(q, (snapshot) => {
      const newsItems: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.published) {
          newsItems.push({
            id: doc.id,
            message: `⚠️ ${data.title}`,
            time: new Date(data.created_at).toLocaleDateString('th-TH')
          });
        }
      });
      setBroadcasts(newsItems.length > 0 ? newsItems : [{ id: 0, message: "📢 ยังไม่มีประกาศในขณะนี้", time: "" }]);
    });

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
      unsubNews();
    };
  }, []);

  useEffect(() => {
    let unsubCases: (() => void) | null = null;
    
    const loadAndSubscribeCases = () => {
      if (unsubCases) {
        unsubCases();
        unsubCases = null;
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
          const unsubscribers: (() => void)[] = [];
          const casesMap = new Map();

          savedCases.forEach((id: string) => {
            if (typeof id !== 'string') return;
            const docRef = doc(db, 'cases', id);
            const unsub = onSnapshot(docRef, (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                casesMap.set(id, { 
                  id: docSnap.id, 
                  status: data.status,
                  timestamp: data.updatedAt || data.createdAt || 0
                });
              } else {
                casesMap.delete(id);
              }
              
              const updatedCases = Array.from(casesMap.values());
              updatedCases.sort((a, b) => {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
              });
              const newDataString = JSON.stringify(updatedCases);
              if (newDataString !== lastKnownDataRef.current) {
                lastKnownDataRef.current = newDataString;
                setVisibleNotifications(updatedCases);
              }
              setMyCases(updatedCases);
            });
            unsubscribers.push(unsub);
          });

          unsubCases = () => {
            unsubscribers.forEach(u => u());
          };
        } else {
          setMyCases([]);
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
      if (unsubCases) unsubCases();
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
              {(visibleNotifications.some(c => ['รอดำเนินการ', 'กำลังดำเนินการ', 'กำลังเข้าช่วยเหลือ', 'pending', 'active', 'in_progress', 'dispatched', 'รอการช่วยเหลือ', 'รับเรื่องแล้ว', 'กำลังช่วยเหลือ', 'wait', 'accepted'].includes(typeof c.status === 'string' ? c.status.toLowerCase() : String(c.status))) || (broadcasts.length > 0 && broadcasts[0].id !== 0)) && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#0b1325]"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-[#0b1325] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-top-4 flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
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
                  <div className="mt-3 flex flex-col gap-2 p-1 max-h-[60vh] overflow-y-auto overscroll-contain custom-scrollbar">
                    {visibleNotifications.length > 0 ? visibleNotifications.map(caseItem => {
                      const activeStatuses = ['รอดำเนินการ', 'กำลังดำเนินการ', 'กำลังเข้าช่วยเหลือ', 'pending', 'active', 'in_progress', 'dispatched', 'รอการช่วยเหลือ', 'รับเรื่องแล้ว', 'กำลังช่วยเหลือ', 'wait', 'accepted'];
                      const s = typeof caseItem.status === 'string' ? caseItem.status.toLowerCase() : String(caseItem.status);
                      const isCompleted = !activeStatuses.includes(s);
                      const details = isCompleted
                        ? { text: `✅ เคสของคุณ: ${caseItem.status}`, bg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30", color: "text-emerald-600 dark:text-emerald-400" }
                        : { text: `🚨 เคสของคุณ: ${caseItem.status}`, bg: "hover:bg-orange-50 dark:hover:bg-orange-900/20 border-orange-100 dark:border-orange-900/30", color: "text-orange-600 dark:text-orange-400" };
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
                      <div className="py-2 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">📭 ไม่มีแจ้งเตือนเคสของคุณในขณะนี้</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Cell Broadcast Section */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3">ประกาศจากส่วนกลาง</h3>
                  <div className="space-y-2">
                    {broadcasts.map(b => (
                      <div key={b.id} className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3 rounded-r-xl shadow-sm">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-200">{b.message}</p>
                        <span className="text-xs text-red-600 dark:text-red-400 mt-1 block font-medium">{b.time}</span>
                      </div>
                    ))}
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
              {loading ? <span className="animate-pulse">...</span> : (initial !== '?' ? initial : <User className="text-white w-5 h-5" />)}
            </button>
            
            {showProfile && (
              <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-[#0b1325] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-top-4">
                <div className="flex flex-col p-2 gap-1">
                  <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800 mb-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">เข้าสู่ระบบในชื่อ</p>
                    <p className="font-bold text-gray-900 dark:text-white truncate">{loading ? 'กำลังโหลด...' : name}</p>
                    {(!loading && role) && <p className="text-xs font-medium text-[#ff6600] mt-0.5">{role}</p>}
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
                  
                  {(!loading && name !== 'ไม่ได้เข้าสู่ระบบ') && (
                    <button 
                      onClick={() => { setShowProfile(false); router.push(`/login`); }}
                      className="flex items-center gap-3 px-3 py-2.5 min-h-[48px] text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors w-full text-left mt-1 border-t border-gray-100 dark:border-gray-800"
                    >
                      <LogOut className="w-4 h-4" />
                      ออกจากระบบ
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
