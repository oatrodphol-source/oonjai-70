'use client';
import React, { useState } from 'react';
import { Info, ShieldAlert, ChevronUp } from 'lucide-react';

interface RiskLegendProps {
  className?: string;
  label?: string;
}

export const RiskLegend: React.FC<RiskLegendProps> = ({ 
  className = "bottom-6 left-4",
  label = "พื้นที่เสี่ยง" 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const legendItems = [
    { level: 5, label: 'พื้นที่เสี่ยงวิกฤต (ระดับ 5)', color: 'bg-red-500' },
    { level: 4, label: 'พื้นที่เสี่ยงรุนแรง (ระดับ 4)', color: 'bg-orange-500' },
    { level: 3, label: 'พื้นที่เสี่ยงปานกลาง (ระดับ 3)', color: 'bg-yellow-500' },
    { level: 2, label: 'พื้นที่เฝ้าระวัง (ระดับ 2)', color: 'bg-blue-500' },
    { level: 1, label: 'พื้นที่ปลอดภัย/ทั่วไป (ระดับ 1)', color: 'bg-green-500' },
  ];

  return (
    <div 
      className={`absolute z-[1000] pointer-events-auto ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="relative">
        {/* Expanded Panel */}
        <div 
          className={`absolute bottom-full left-0 mb-2 w-64 bg-white/95 dark:bg-[#0b1325]/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 text-xs transition-all duration-200 origin-bottom-left transform ${
            isOpen 
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
              : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white text-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
              <span>ระดับความเสี่ยง (AI Triage)</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">พิจารณาจาก AI</span>
          </div>
          <div className="space-y-2">
            {legendItems.map((item) => (
              <div key={item.level} className="flex items-center justify-between group/item">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${item.color} shadow-sm shrink-0`} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                    {item.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Collapsed Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3.5 py-2 bg-white/90 dark:bg-[#0b1325]/90 hover:bg-white dark:hover:bg-[#0b1325] backdrop-blur-md rounded-full shadow-md border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all duration-200 hover:shadow-lg active:scale-95 group"
          aria-label="ดูระดับความเสี่ยง"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          <span>{label}</span>
          <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500 transition-colors" />
        </button>
      </div>
    </div>
  );
};
