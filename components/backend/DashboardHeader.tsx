'use client';
import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { supabase } from '@/lib/supabase';
import { VolunteerStatusToggle } from './VolunteerStatusToggle';

export const DashboardHeader = ({ title = 'Dashboard' }: { title?: string }) => {
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const storedUser = localStorage.getItem('oonjai_user');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching announcements:", error);
      } else if (data) {
        const fetched = data.filter((d: any) => d.published !== false && d.type === 'announcement');
        setAnnouncements(fetched);
      }
    };

    fetchInitialData();

    const channel = supabase
      .channel('custom-news-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => {
        fetchInitialData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isVolunteer = mounted && currentUser && currentUser.role !== 'admin';

  return (
    <header className="h-16 sm:h-20 bg-white dark:bg-[#151b2c] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 w-full max-w-[100vw]">
      <h2 className="text-sm sm:text-xl font-extrabold text-gray-800 dark:text-white whitespace-nowrap shrink-1 min-w-0">
        {title}
      </h2>
      
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Work Duty Status Toggle for Volunteers next to Bell */}
        {isVolunteer && (
          <div className="shrink-0">
            <VolunteerStatusToggle compact={true} />
          </div>
        )}

        <ThemeToggle />
        
        <div className="relative shrink-0">
          <button 
            className="relative p-2 text-gray-500 hover:text-[#ff6600] transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setShowNotifications(!showNotifications)}
            title="ประกาศแจ้งเตือนด่วน"
          >
            <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
            {announcements.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#151b2c] animate-ping"></span>
            )}
            {announcements.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#151b2c]"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#151b2c] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">ประกาศจากส่วนกลาง</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 rounded-full">
                  {announcements.length} ประกาศ
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {announcements.length > 0 ? (
                  announcements.map((n) => {
                    const timeStr = n.created_at ? new Date(n.created_at).toLocaleString('th-TH') : '';
                    return (
                      <button 
                        key={n.id} 
                        onClick={() => {
                          setSelectedAnnouncement(n);
                          setShowNotifications(false);
                        }}
                        className="w-full text-left p-3.5 border-b border-gray-100 dark:border-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-start gap-3"
                      >
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-0.5 line-clamp-1">{n.title || 'ประกาศด่วน!'}</div>
                          {timeStr && <div className="text-[10px] text-gray-400">{timeStr}</div>}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-gray-500 text-xs font-medium">
                    ไม่มีประกาศแจ้งเตือนจากศูนย์กลาง
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#151b2c] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 flex justify-between items-start border-b border-gray-100 dark:border-gray-800 bg-rose-50 dark:bg-rose-950/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white leading-tight">
                    {selectedAnnouncement.title || 'ประกาศด่วน!'}
                  </h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ประกาศเมื่อ: {selectedAnnouncement.created_at ? new Date(selectedAnnouncement.created_at).toLocaleString('th-TH') : '-'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {selectedAnnouncement.content || 'ไม่มีรายละเอียดเนื้อหา'}
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs sm:text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
