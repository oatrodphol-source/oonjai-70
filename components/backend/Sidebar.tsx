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
  LogOut,
  User,
  Menu
} from 'lucide-react';

export const Sidebar = ({ role = 'volunteer', userName = 'กำลังโหลด...' }: { role?: string, userName?: string }) => {
  const pathname = usePathname();
  const [clientRole, setClientRole] = useState(role);
  const [clientName, setClientName] = useState(userName);
  const [isOpen, setIsOpen] = useState(false);

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
    { href: '/profile', icon: User, label: 'ตั้งค่าบัญชี', roles: ['admin', 'rescue', 'volunteer'] },
    { href: '/ai-trigger', icon: Settings, label: 'AI Trigger', roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(clientRole));

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-[#0b1325] border-b border-[#ff6600]/20 flex items-center px-4 z-40">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-2 rounded-lg active:bg-white/10 text-white"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-wide ml-4 text-white">
          <span className="text-[#ff6600]">Oon</span>Jai
        </h1>
      </div>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0b1325] border-r border-[#ff6600]/20 flex-col text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0 flex' : '-translate-x-full hidden md:flex'}`}>
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
              onClick={() => setIsOpen(false)}
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
        <Link href="/login" className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">ออกจากระบบ</span>
        </Link>
      </div>
    </div>
    </>
  );
};
