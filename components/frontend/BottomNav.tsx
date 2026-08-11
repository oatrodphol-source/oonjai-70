'use client';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Map,
  MapPinned,
  Megaphone,
  Bell,
  Headset,
  ClipboardList,
  MessageSquareWarning,
  UserPlus
} from "lucide-react";

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  useEffect(() => {
    const userStr = localStorage.getItem('oonjai_user');
    if (!userStr) return;

    try {
      const user = JSON.parse(userStr);
      const role = String(user.role || '').toLowerCase();
      
      if (['rescue', 'volunteer', 'อาสาสมัคร'].includes(role)) {
        // Catch all possible ID variations
        const rawUid = user.id || user.uid || user.docId || user._id; 
        
        if (!rawUid) {
          console.error("🚨 OonJai Presence Error: หา ID อาสาสมัครไม่เจอใน localStorage ->", user);
          return;
        }

        const uid = Number(rawUid);

        supabase.from('volunteers').update({ is_online: true }).eq('id', uid)
          .then(({ error }) => {
            if (error) console.warn('⚠️ OonJai Presence Error:', error);
            else console.log('✅ OonJai: อัปเดตสถานะ Online สำเร็จ! ID:', uid);
          });

        const handleUnload = () => {
          supabase.from('volunteers').update({ is_online: false }).eq('id', uid).then(() => {});
        };
        window.addEventListener('beforeunload', handleUnload);

        return () => {
          window.removeEventListener('beforeunload', handleUnload);
          supabase.from('volunteers').update({ is_online: false }).eq('id', uid).then(() => {});
        };
      }
    } catch (error) {
      console.error("🚨 OonJai Presence System Crashed:", error);
    }
  }, []);

  const router = useRouter();

  const handleReportOrSosClick = async (e: React.MouseEvent, targetHref: string) => {
    e.preventDefault(); // MUST BE SYNCHRONOUS to stop Next.js Link default navigation!

    // 1. Synchronous check from localStorage
    const activeCaseId = typeof window !== 'undefined' ? localStorage.getItem('oonjai_active_case_id') : null;
    const lineUid = typeof window !== 'undefined' ? localStorage.getItem('oonjai_line_uid') : null;

    if (activeCaseId) {
      alert(`คุณมีเคสขอความช่วยเหลือที่กำลังดำเนินการอยู่แล้ว (เคส #${activeCaseId}) ระบบนำทางไปหน้าติดตามสถานะ`);
      router.push(`/tracking/${activeCaseId}`);
      return;
    }

    const lastReportStr = typeof window !== 'undefined' ? localStorage.getItem('oonjai_last_report') : null;
    if (lastReportStr) {
      try {
        const lastReport = JSON.parse(lastReportStr);
        if (Date.now() - lastReport.timestamp < 10 * 60 * 1000 && lastReport.caseId) {
          alert('คุณมีเคสขอความช่วยเหลือที่กำลังดำเนินการอยู่แล้ว ระบบนำทางไปหน้าติดตามสถานะ');
          router.push(`/tracking/${lastReport.caseId}`);
          return;
        }
      } catch (err) {}
    }

    // 2. Asynchronous check from Supabase if lineUid exists
    if (lineUid) {
      try {
        const { data: activeCase } = await supabase
          .from('cases')
          .select('id')
          .eq('reporter_name', lineUid)
          .in('status', ['pending', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (activeCase) {
          localStorage.setItem('oonjai_active_case_id', String(activeCase.id));
          alert(`คุณมีเคสขอความช่วยเหลือที่กำลังดำเนินการอยู่แล้ว (เคส #${activeCase.id}) ระบบนำทางไปหน้าติดตามสถานะ`);
          router.push(`/tracking/${activeCase.id}`);
          return;
        }
      } catch (err) {}
    }

    // 3. Asynchronous check from LIFF
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (liffId) {
        const liff = (await import('@line/liff')).default;
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          if (profile?.userId) {
            localStorage.setItem('oonjai_line_uid', profile.userId);
            const { data: activeCase } = await supabase
              .from('cases')
              .select('id')
              .eq('reporter_name', profile.userId)
              .in('status', ['pending', 'in_progress'])
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (activeCase) {
              localStorage.setItem('oonjai_active_case_id', String(activeCase.id));
              alert(`คุณมีเคสขอความช่วยเหลือที่กำลังดำเนินการอยู่แล้ว (เคส #${activeCase.id}) ระบบนำทางไปหน้าติดตามสถานะ`);
              router.push(`/tracking/${activeCase.id}`);
              return;
            }
          }
        }
      }
    } catch (err) {}

    // No active case -> navigate to targetHref
    router.push(targetHref);
  };

  const navItems = [
    { href: "/map", icon: MapPinned, label: "แผนที่" },
    { href: "/feed", icon: Megaphone, label: "ฟีด" },
  ];

  const navItemsRight = [
    { href: "/report", icon: UserPlus, label: "แจ้งเหตุ" },
    { href: "/info", icon: ClipboardList, label: "ข้อมูล" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-[#1E293B] rounded-t-[32px] border-t border-[#ff6600]/50 z-[9999] shadow-[0_-20px_50px_rgba(0,0,0,0.6)] pointer-events-auto pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-[72px] px-2 w-full relative">
        
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`flex flex-col items-center justify-center w-full flex-1 min-h-[48px] gap-1 transition-all ${
                isActive ? "text-[#ff6600]" : "text-gray-400 hover:text-[#ff6600]/70"
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}

        {/* Center SOS Button (Floating) */}
        <div className="relative w-20 flex justify-center shrink-0">
          <Link
            href="/sos"
            onClick={(e) => handleReportOrSosClick(e, '/sos')}
            className={`absolute -top-10 flex flex-col items-center justify-center w-[72px] h-[72px] rounded-full border-4 shadow-lg hover:scale-105 transition-transform ${
              pathname === '/sos'
                ? "bg-[#ff6600] border-[#0b1325] text-[#0b1325]"
                : "bg-red-500 border-[#0b1325] text-white"
            }`}
          >
            <Bell size={28} fill={pathname === '/sos' ? "#0b1325" : "white"} />
            <span className="text-sm font-bold mt-0.5">SOS</span>
          </Link>
          <span className={`text-[10px] font-semibold mt-10 ${pathname === '/sos' ? "text-[#ff6600]" : "text-gray-400"}`}>
            เหตุฉุกเฉิน
          </span>
        </div>

        {navItemsRight.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              onClick={(e) => {
                if (item.href === '/report') {
                  handleReportOrSosClick(e, '/report');
                }
              }}
              className={`flex flex-col items-center justify-center w-full flex-1 min-h-[48px] gap-1 transition-all ${
                isActive ? "text-[#ff6600]" : "text-gray-400 hover:text-[#ff6600]/70"
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
        
      </div>
    </div>
  );
};
