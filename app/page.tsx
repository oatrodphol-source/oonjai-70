'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, Users, ArrowRight, LogIn, MapPin, MessageCircle, GraduationCap, Award, Code2, Sparkles, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const lineOfficialUrl = 'https://line.me/R/ti/p/@946curyj';

  const emergencyKeywords = [
    'น้ำท่วมฉับพลัน',
    'ผู้ป่วยติดเตียง',
    'ขอเรืออพยพด่วน',
    'พายุลมแรง/ต้นไม้ล้ม',
    'เสาไฟล้ม/ไฟฟ้าดับ',
    'สัตว์มีพิษ/บาดเจ็บ'
  ];

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeState('out');
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % emergencyKeywords.length);
        setFadeState('in');
      }, 300);
    }, 2600);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#0b1325] text-white relative w-full max-w-full overflow-x-hidden flex flex-col justify-between">
      {/* Cyber Rescue Grid Background Overlay */}
      <div className="absolute inset-0 bg-rescue-grid opacity-60 pointer-events-none z-0"></div>

      {/* Optimized Ambient Breathing Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] sm:w-[850px] h-[350px] sm:h-[550px] bg-[#ff6600]/15 rounded-full blur-[70px] sm:blur-[140px] pointer-events-none transform-gpu animate-breathing-pulse z-0"></div>
      <div className="absolute bottom-0 right-0 w-[250px] sm:w-[450px] h-[250px] sm:h-[450px] bg-blue-600/10 rounded-full blur-[60px] sm:blur-[120px] pointer-events-none transform-gpu z-0"></div>

      {/* Top Navigation */}
      <nav className="relative z-10 flex items-center justify-between w-full max-w-6xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border border-[#ff6600]/40 flex items-center justify-center bg-[#0b1325] overflow-hidden shrink-0 shadow-sm">
            <img src="/icon01.ico" alt="OonJai Logo" className="w-full h-full object-cover" loading="eager" decoding="async" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none">
              <span className="text-[#ff6600]">Oon</span>
              <span className="text-white">Jai</span>
            </h1>
            <span className="text-[10px] text-gray-400 font-semibold block">ศูนย์ช่วยเหลือภัยพิบัติ</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:bg-white/10 px-2.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl">
              <LogIn className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">เข้าสู่ระบบเจ้าหน้าที่</span>
            </Button>
          </Link>
          <Link href="/sos">
            <Button variant="primary" className="text-xs sm:text-sm font-extrabold px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-md shadow-orange-500/20">
              แจ้งเหตุฉุกเฉิน
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section - Perfectly Proportioned 3 Buttons across Mobile, Tablet, Desktop */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 sm:px-6 text-center pt-6 sm:pt-10 pb-10 sm:pb-16">
        {/* Status Badge with Live Pulse */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ff6600]/15 border border-[#ff6600]/35 text-[#ff6600] text-xs font-extrabold mb-4 shadow-sm backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6600]"></span>
          </span>
          ระบบแจ้งเหตุและประสานความช่วยเหลือ 24 ชั่วโมง
        </div>

        {/* Dynamic Disaster Scenario Badge (Word Switcher) */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-xs sm:text-sm text-gray-400 font-bold">รับแจ้งเหตุทุกประเภท:</span>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-orange-500/10 border border-orange-500/30 text-amber-400 text-xs sm:text-sm font-extrabold shadow-sm transition-all duration-300 transform-gpu ${
            fadeState === 'in' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1'
          }`}>
            <Activity className="w-3.5 h-3.5 text-[#ff6600]" />
            {emergencyKeywords[currentWordIndex]}
          </span>
        </div>
        
        {/* Main Title with Shimmering Golden Gradient Flow */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight tracking-tight">
          เมื่อเกิดเหตุฉุกเฉิน <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6600] via-amber-300 via-yellow-400 via-orange-400 to-[#ff6600] animate-shimmer-flow inline-block drop-shadow-sm">
            ให้อุ่นใจดูแลคุณ
          </span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-xs sm:text-base text-gray-300 mb-8 max-w-xl leading-relaxed font-medium">
          แพลตฟอร์มศูนย์กลางเชื่อมต่อผู้ประสบภัยและหน่วยกู้ภัย
          แจ้งเหตุรวดเร็ว พร้อมระบบคัดกรองความเสี่ยงด้วย AI
        </p>
        
        {/* Primary Action Buttons Container - Perfectly Fitted & Uniform Height */}
        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center justify-center gap-3 sm:gap-4 max-w-full sm:max-w-3xl mx-auto px-2">
          {/* 1. SOS Button */}
          <Link href="/sos" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto min-w-[200px] h-13 sm:h-14 px-5 bg-[#ff6600] hover:bg-[#e65c00] active:scale-98 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all border border-orange-400/30 cursor-pointer whitespace-nowrap">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>แจ้งเหตุฉุกเฉินทันที</span>
            </button>
          </Link>

          {/* 2. Embedded LINE Official Help Button */}
          <a
            href={lineOfficialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto min-w-[220px] h-13 sm:h-14 px-5 bg-[#00B900] hover:bg-[#009900] active:scale-98 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-green-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer border border-green-400/30 whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>ขอความช่วยเหลือผ่าน LINE</span>
          </a>

          {/* 3. Map Link Button */}
          <Link href="/map" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto min-w-[160px] h-13 sm:h-14 px-5 bg-white/10 hover:bg-white/20 active:scale-98 text-white font-extrabold text-xs sm:text-sm rounded-2xl border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff6600] shrink-0" />
              <span>พื้นที่เสี่ยงภัย</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Compact Features Grid */}
      <div className="relative z-10 border-t border-white/10 py-8 sm:py-10 bg-black/20 backdrop-blur-md">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6">
            
            {/* Feature 1 - Orange/Amber Glow */}
            <div className="relative group overflow-hidden bg-white/[0.04] backdrop-blur-xl border border-white/10 hover:border-[#ff6600]/60 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 hover:bg-gradient-to-br hover:from-[#ff6600]/15 hover:via-white/[0.05] hover:to-transparent hover:shadow-[0_0_25px_rgba(255,102,0,0.22)] hover:-translate-y-1 transition-all duration-300 transform-gpu">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#ff6600]/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
              <div className="w-10 h-10 rounded-xl bg-[#ff6600]/20 group-hover:bg-[#ff6600]/30 group-hover:scale-110 flex items-center justify-center shrink-0 text-[#ff6600] transition-all duration-300 shadow-sm">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="relative z-10">
                <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-amber-300 transition-colors mb-1">แจ้งเหตุรวดเร็ว</h3>
                <p className="text-xs text-gray-400 group-hover:text-gray-300 leading-relaxed transition-colors">
                  ปุ่ม SOS ดึงพิกัด GPS อัตโนมัติ พร้อมส่งสัญญาณถึงหน่วยกู้ภัยใกล้เคียงทันที
                </p>
              </div>
            </div>
            
            {/* Feature 2 - Blue/Cyan Glow */}
            <div className="relative group overflow-hidden bg-white/[0.04] backdrop-blur-xl border border-white/10 hover:border-blue-400/60 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 hover:bg-gradient-to-br hover:from-blue-500/15 hover:via-white/[0.05] hover:to-transparent hover:shadow-[0_0_25px_rgba(59,130,246,0.22)] hover:-translate-y-1 transition-all duration-300 transform-gpu">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 group-hover:bg-blue-500/30 group-hover:scale-110 flex items-center justify-center shrink-0 text-blue-400 transition-all duration-300 shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div className="relative z-10">
                <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors mb-1">ประสานงานกู้ภัย</h3>
                <p className="text-xs text-gray-400 group-hover:text-gray-300 leading-relaxed transition-colors">
                  ระบบคัดกรองความเสี่ยงด้วย AI และอัปเดตสถานะแบบเรียลไทม์ให้ผู้ประสบภัย
                </p>
              </div>
            </div>
            
            {/* Feature 3 - Emerald/Green LINE Glow */}
            <a 
              href={lineOfficialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group overflow-hidden bg-white/[0.04] backdrop-blur-xl border border-white/10 hover:border-[#00B900]/60 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 hover:bg-gradient-to-br hover:from-[#00B900]/15 hover:via-white/[0.05] hover:to-transparent hover:shadow-[0_0_25px_rgba(0,185,0,0.22)] hover:-translate-y-1 transition-all duration-300 transform-gpu cursor-pointer"
            >
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#00B900]/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
              <div className="w-10 h-10 rounded-xl bg-green-500/20 group-hover:bg-[#00B900]/30 group-hover:scale-110 flex items-center justify-center shrink-0 text-green-400 transition-all duration-300 shadow-sm">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                    แจ้งเตือนผ่าน LINE
                  </h3>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-gray-400 group-hover:text-gray-300 leading-relaxed transition-colors">
                  เชื่อมต่อ LINE Official Account เพื่อส่งเรื่องและติดตามสถานะความช่วยเหลือ
                </p>
              </div>
            </a>

          </div>
        </div>
      </div>

      {/* 🎓 Academic Project & Team Credits Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#070d1a] py-8 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          
          {/* Major & Faculty Badge - Clean Responsive Layout (No Broken Text) */}
          <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-4 py-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs sm:text-sm font-extrabold max-w-full leading-snug shadow-sm">
            <div className="flex items-center gap-1.5 shrink-0">
              <GraduationCap className="w-4 h-4 text-blue-400 shrink-0" />
              <span>คณะวิศวกรรมศาสตร์</span>
            </div>
            <span className="hidden sm:inline text-blue-500/40">•</span>
            <span className="whitespace-normal sm:whitespace-nowrap">สาขาวิศวกรรมคอมพิวเตอร์และระบบไอโอที</span>
          </div>

          {/* Creators List */}
          <div>
            <p className="text-xs text-gray-400 font-semibold mb-2.5">
              โปรเจกต์นี้ได้รับการพัฒนาและจัดทำโดย
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-white">
              <span className="bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl shadow-sm whitespace-nowrap">
                นายณัฐติพงษ์ รอดผล
              </span>
              <span className="bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl shadow-sm whitespace-nowrap">
                นายปัญญา นิธิธนิโยปกรณ์
              </span>
              <span className="bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl shadow-sm whitespace-nowrap">
                นายนิติภูมิ ส่งผลบุญถาวร
              </span>
            </div>
          </div>

          {/* System Name & Copyright Notice */}
          <div className="pt-3 border-t border-white/10 text-gray-400 text-center space-y-1 max-w-2xl mx-auto">
            <p className="font-extrabold text-xs sm:text-sm text-gray-200">
              OonJai Systems
            </p>
            <p className="text-[11px] sm:text-xs text-gray-400 leading-normal">
              Development of a Web Application for Emergency Reporting and Disaster Relief Assistance
            </p>
            <p className="text-[10px] text-gray-500 font-medium pt-0.5">
              สงวนลิขสิทธิ์ © 2026
            </p>
          </div>

        </div>
      </footer>

    </main>
  );
}
