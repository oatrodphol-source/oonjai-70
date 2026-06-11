'use client';
import React from 'react';
import { Bell, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

export const DashboardHeader = ({ title = 'Dashboard' }) => {
  return (
    <header className="h-20 bg-white dark:bg-[#151b2c] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 sticky top-0 z-30">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h2>
      
      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="ค้นหาเคส, เบอร์โทร..."
            className="w-64 h-10 pl-10 pr-4 rounded-full bg-gray-100 dark:bg-[#0b1325] border-none focus:ring-2 focus:ring-[#ff6600] text-sm text-gray-800 dark:text-white outline-none transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        </div>
        
        <ThemeToggle />
        
        <button className="relative p-2 text-gray-500 hover:text-[#ff6600] transition-colors">
          <Bell className="w-6 h-6" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#151b2c]"></span>
        </button>
      </div>
    </header>
  );
};
