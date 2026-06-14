'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Bell, User, LogOut, Sun, Moon, History, PhoneCall } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit as firestoreLimit, doc, where, documentId } from 'firebase/firestore';

export const TopNavbar: React.FC = () => {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
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
        const savedCases = JSON.parse(localStorage.getItem('oonjai_my_cases') || '[]');
        if (savedCases.length > 0) {
          // chunk array if more than 10 (firestore 'in' limit)
          const caseChunks = savedCases.slice(0, 10);
          const casesQuery = query(collection(db, 'cases'), where(documentId(), 'in', caseChunks));
          
          unsubCases = onSnapshot(casesQuery, (snapshot) => {
            const updatedCases: { id: string, status: string }[] = [];
            snapshot.forEach(docSnap => {
              updatedCases.push({ id: docSnap.id, status: docSnap.data().status });
            });
            const newDataString = JSON.stringify(updatedCases);
            if (newDataString !== lastKnownDataRef.current) {
              lastKnownDataRef.current = newDataString;
              setVisibleNotifications(updatedCases);
            }
            setMyCases(updatedCases);
          });
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
              {(visibleNotifications.length > 0 || (broadcasts.length > 0 && broadcasts[0].id !== 0)) && (
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
                  <div className="mt-3">
                    {visibleNotifications.length > 0 ? visibleNotifications.map(caseItem => {
                      const details = (() => {
                        switch(caseItem.status) {
                          case 'pending': return { text: "🚨 เคสของคุณ: อยู่ระหว่างรอดำเนินการ", bg: "hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30", color: "text-red-600 dark:text-red-400" };
                          case 'accepted': return { text: "🚒 เคสของคุณ: เจ้าหน้าที่รับเรื่องแล้ว", bg: "hover:bg-orange-50 dark:hover:bg-orange-900/20 border-orange-100 dark:border-orange-900/30", color: "text-orange-600 dark:text-orange-400" };
                          case 'in_progress': return { text: "⏳ เคสของคุณ: เจ้าหน้าที่กำลังเข้าช่วยเหลือ", bg: "hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-100 dark:border-blue-900/30", color: "text-blue-600 dark:text-blue-400" };
                          case 'completed': return { text: "✅ เคสของคุณ: ช่วยเหลือสำเร็จเสร็จสิ้นแล้ว", bg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30", color: "text-emerald-600 dark:text-emerald-400" };
                          case 'cancelled': return { text: "❌ เคสของคุณ: ถูกยกเลิกแล้ว", bg: "hover:bg-gray-50 dark:hover:bg-gray-800/50 border-gray-100 dark:border-gray-800", color: "text-gray-600 dark:text-gray-400" };
                          case 'ปลอดภัยแล้ว': return { text: "✅ เคสของคุณ: ปลอดภัยแล้ว", bg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30", color: "text-emerald-600 dark:text-emerald-400" };
                          default: return { text: "🚨 เคสของคุณ: กำลังดำเนินการ", bg: "hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30", color: "text-red-600 dark:text-red-400" };
                        }
                      })();
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
              className="w-12 h-12 bg-transparent rounded-full flex items-center justify-center border-2 border-white hover:border-[#ff6600] transition-colors overflow-hidden shrink-0"
            >
              <User className="text-white w-5 h-5" />
            </button>
            
            {showProfile && (
              <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-[#0b1325] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-top-4">
                <div className="flex flex-col p-2 gap-1">
                  <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800 mb-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">สถานะ</p>
                    <p className="font-bold text-gray-900 dark:text-white truncate">ผู้ใช้งานทั่วไป</p>
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
    </nav>
  );
};
