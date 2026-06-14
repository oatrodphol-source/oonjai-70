'use client';
import React, { useState, useEffect } from 'react';
import { Bell, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const DashboardHeader = ({ title = 'Dashboard' }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'news'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.published !== false) {
          fetched.push({ id: doc.id, ...data });
        }
      });
      setAnnouncements(fetched);
    }, (error) => {
      console.error("Error fetching announcements:", error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <header className="h-20 bg-white dark:bg-[#151b2c] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 sticky top-0 z-30">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h2>
      
      <div className="flex items-center gap-6">
        <ThemeToggle />
        
        <div className="relative">
          <button 
            className="relative p-2 text-gray-500 hover:text-[#ff6600] transition-colors"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="w-6 h-6" />
            {announcements.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#151b2c]"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#151b2c] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-bold text-gray-900 dark:text-white">ประกาศจากส่วนกลาง</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {announcements.length > 0 ? (
                  announcements.map((n) => {
                    const isEmergency = n.type === 'emergency' || n.type === 'ฉุกเฉิน' || n.level === 'high' || (n.title && n.title.includes('ฉุกเฉิน'));
                    const icon = isEmergency ? '⚠️' : 'ℹ️';
                    const timeStr = n.created_at ? new Date(n.created_at).toLocaleString('th-TH') : '';
                    return (
                      <div key={n.id} className="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors flex items-start gap-3">
                        <span className="text-lg">{icon}</span>
                        <div>
                          <div className="font-bold text-sm text-gray-900 dark:text-white mb-1">{n.title || 'ประกาศใหม่'}</div>
                          {timeStr && <div className="text-xs text-gray-500 mt-1">{timeStr}</div>}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    ไม่มีประกาศแจ้งเตือนจากศูนย์กลาง
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
