'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ListOrdered, 
  Map as MapIcon, 
  Newspaper, 
  FileText, 
  Users, 
  Settings, 
  History,
  LogOut
} from 'lucide-react';

export const Sidebar = ({ role = 'volunteer', userName = 'กำลังโหลด...' }: { role?: string, userName?: string }) => {
  const pathname = usePathname();
  const [clientRole, setClientRole] = useState(role);
  const [clientName, setClientName] = useState(userName);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oonjai_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user.role) setClientRole(user.role);
        if (user.name) setClientName(user.name);
      }
    } catch (e) {}
  }, []);

  const menuItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'แดชบอร์ด', roles: ['admin', 'rescue', 'volunteer'] },
    { href: '/cases', icon: ListOrdered, label: 'จัดการเคส', roles: ['admin', 'rescue', 'volunteer'] },
    { href: '/heatmap', icon: MapIcon, label: 'แผนที่ความร้อน', roles: ['admin', 'rescue', 'volunteer'] },
    { href: '/news', icon: Newspaper, label: 'จัดการข่าวสาร', roles: ['admin'] },
    { href: '/report-dashboard', icon: FileText, label: 'รายงานและส่งออก', roles: ['admin', 'rescue', 'volunteer'] },
    { href: '/admin/history', icon: History, label: 'ประวัติช่วยเหลือ', roles: ['rescue', 'volunteer'] },
    { href: '/users', icon: Users, label: 'จัดการผู้ใช้งาน', roles: ['admin'] },
    { href: '/ai-trigger', icon: Settings, label: 'AI Trigger', roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(clientRole));

  return (
    <div className="w-64 h-screen bg-[#0b1325] border-r border-[#ff6600]/20 flex flex-col text-white fixed left-0 top-0">
      <div className="h-20 flex items-center gap-3 px-6 border-b border-[#ff6600]/20">
        <div className="w-10 h-10 rounded-full border border-[#ff6600] flex items-center justify-center overflow-hidden">
          <img src="/icon01.ico" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-xl font-bold tracking-wide">
          <span className="text-[#ff6600]">Oon</span>Jai
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
        {filteredMenu.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-[#ff6600] text-white shadow-lg shadow-orange-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl mb-4">
          <div className="w-8 h-8 rounded-full bg-[#ff6600] flex items-center justify-center text-sm font-bold uppercase">
            {clientRole.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{clientName}</p>
            <p className="text-xs text-gray-400 capitalize">{clientRole}</p>
          </div>
        </div>
        <Link href="/login" className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">ออกจากระบบ</span>
        </Link>
      </div>
    </div>
  );
};
