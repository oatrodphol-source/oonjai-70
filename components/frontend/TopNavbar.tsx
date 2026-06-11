'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Bell, User, LogOut, Sun, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const TopNavbar: React.FC = () => {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [caseStatus, setCaseStatus] = useState<string | null>(null);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const checkCaseStatus = async () => {
    const lastSOS = localStorage.getItem('oonjai_last_sos');
    const lastReport = localStorage.getItem('oonjai_last_report');
    let cid = null;
    
    if (lastSOS) {
      try { cid = JSON.parse(lastSOS).caseId; } catch (e) {}
    } else if (lastReport) {
      try { cid = JSON.parse(lastReport).caseId; } catch (e) {}
    }

    if (cid) {
      setCaseId(cid);
      try {
        const res = await fetch(`/api/cases/${cid}?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setCaseStatus(data.status);
        }
      } catch (err) {
        console.error("Failed to fetch case status:", err);
      }
    }
  };

  useEffect(() => {
    if (showNotifications) {
      checkCaseStatus();
    }
  }, [showNotifications]);

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

    // Initial load
    checkCaseStatus();

    // Auto-polling for near real-time updates every 5 seconds
    const intervalId = setInterval(() => {
      checkCaseStatus();
    }, 5000);

    // Fetch live announcements
    const fetchBroadcasts = async () => {
      try {
        const res = await fetch('/api/news?limit=3');
        if (res.ok) {
          const data = await res.json();
          const newsItems = data.news || [];
          const formatted = newsItems.map((n: any) => ({
            id: n.id,
            message: `⚠️ ${n.title}`,
            time: new Date(n.created_at).toLocaleDateString('th-TH')
          }));
          setBroadcasts(formatted.length > 0 ? formatted : [{ id: 0, message: "📢 ยังไม่มีประกาศในขณะนี้", time: "" }]);
        }
      } catch (err) {
        console.error("Failed to fetch broadcasts:", err);
      }
    };
    fetchBroadcasts();

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
      clearInterval(intervalId);
    };
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
  };

  // Notifications are loaded dynamically inside the render below

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
          <button onClick={toggleTheme} className="text-white hover:text-[#ff6600] transition-colors p-2 rounded-full">
            {isDark ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
              className="text-[#ff6600] hover:scale-110 transition-transform relative p-1"
            >
              <Bell size={22} strokeWidth={2} />
              {((caseId && (caseStatus === null || ['pending', 'accepted', 'in_progress'].includes(caseStatus))) || broadcasts.length > 0) && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#0b1325]"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-[#0b1325] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-top-4 flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">การแจ้งเตือนของฉัน</h3>
                  <div className="mt-3">
                    {caseId ? (() => {
                      const details = (() => {
                        switch(caseStatus) {
                          case 'pending': return { text: "🚨 เคสของคุณ: อยู่ระหว่างรอดำเนินการ", bg: "hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30", color: "text-red-600 dark:text-red-400" };
                          case 'accepted': return { text: "🚒 เคสของคุณ: เจ้าหน้าที่รับเรื่องแล้ว", bg: "hover:bg-orange-50 dark:hover:bg-orange-900/20 border-orange-100 dark:border-orange-900/30", color: "text-orange-600 dark:text-orange-400" };
                          case 'in_progress': return { text: "⏳ เคสของคุณ: เจ้าหน้าที่กำลังเข้าช่วยเหลือ", bg: "hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-100 dark:border-blue-900/30", color: "text-blue-600 dark:text-blue-400" };
                          case 'completed': return { text: "✅ เคสของคุณ: ช่วยเหลือสำเร็จเสร็จสิ้นแล้ว", bg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30", color: "text-emerald-600 dark:text-emerald-400" };
                          case 'cancelled': return { text: "❌ เคสของคุณ: ถูกยกเลิกแล้ว", bg: "hover:bg-gray-50 dark:hover:bg-gray-800/50 border-gray-100 dark:border-gray-800", color: "text-gray-600 dark:text-gray-400" };
                          default: return { text: "🚨 เคสของคุณ: กำลังดำเนินการ", bg: "hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30", color: "text-red-600 dark:text-red-400" };
                        }
                      })();
                      return (
                        <button 
                          onClick={() => { setShowNotifications(false); router.push(`/tracking/${caseId}`); }}
                          className={`w-full text-left p-3 rounded-xl transition-colors border shadow-sm ${details.bg}`}
                        >
                          <p className={`text-sm font-medium ${details.color}`}>
                            {details.text}
                          </p>
                          <span className="text-xs text-gray-500 mt-1 block font-bold">คลิกเพื่อดูรายละเอียด</span>
                        </button>
                      );
                    })() : (
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
              className="w-8 h-8 sm:w-10 sm:h-10 bg-transparent rounded-full flex items-center justify-center border-2 border-white hover:border-[#ff6600] transition-colors overflow-hidden"
            >
              <User className="text-white w-5 h-5" />
            </button>
            
            {showProfile && (
              <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-[#0b1325] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-top-4">
                <div className="flex flex-col p-1">
                  <button 
                    onClick={() => { setShowProfile(false); router.push('/login'); }}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors w-full text-left"
                  >
                    <span>👤</span> ข้อมูลผู้ใช้ / เข้าสู่ระบบ
                  </button>
                  
                  <button 
                    onClick={() => { setShowProfile(false); router.push(`/history`); }}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors w-full text-left"
                  >
                    <span>📋</span> รายการขอความช่วยเหลือของฉัน
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
