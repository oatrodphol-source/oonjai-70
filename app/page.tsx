import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Users, ArrowRight, LogIn, MapPin, MessageCircle, GraduationCap, Award, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const lineOfficialUrl = 'https://line.me/R/ti/p/@946curyj';

  return (
    <main className="min-h-screen bg-[#0b1325] text-white relative w-full max-w-full overflow-x-hidden flex flex-col justify-between">
      {/* Ambient Glowing Background Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[500px] bg-[#ff6600]/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Navigation */}
      <nav className="relative z-10 flex items-center justify-between w-full max-w-6xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border border-[#ff6600]/40 flex items-center justify-center bg-[#0b1325] overflow-hidden shrink-0 shadow-sm">
            <img src="/icon01.ico" alt="OonJai Logo" className="w-full h-full object-cover" />
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
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 sm:px-6 text-center pt-6 sm:pt-12 pb-10 sm:pb-16">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ff6600]/15 border border-[#ff6600]/30 text-[#ff6600] text-xs font-extrabold mb-5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#ff6600] animate-ping"></span>
          ระบบแจ้งเหตุและประสานความช่วยเหลือ 24 ชั่วโมง
        </div>
        
        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight tracking-tight">
          เมื่อเกิดเหตุฉุกเฉิน <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6600] via-amber-400 to-yellow-500">
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
            
            {/* Feature 1 */}
            <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 hover:border-[#ff6600]/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#ff6600]/20 flex items-center justify-center shrink-0 text-[#ff6600]">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white mb-1">แจ้งเหตุรวดเร็ว</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  ปุ่ม SOS ดึงพิกัด GPS อัตโนมัติ พร้อมส่งสัญญาณถึงหน่วยกู้ภัยใกล้เคียงทันที
                </p>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 hover:border-blue-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white mb-1">ประสานงานกู้ภัย</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  ระบบคัดกรองความเสี่ยงด้วย AI และอัปเดตสถานะแบบเรียลไทม์ให้ผู้ประสบภัย
                </p>
              </div>
            </div>
            
            {/* Feature 3 - Embedded LINE Integration */}
            <a 
              href={lineOfficialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 hover:border-green-500/40 transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0 text-green-400">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-green-400 transition-colors">
                    แจ้งเตือนผ่าน LINE
                  </h3>
                  <ArrowRight className="w-3.5 h-3.5 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
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
          
          {/* Major & Faculty Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-extrabold">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <span>คณะวิศวกรรมศาสตร์ สาขาวิศวกรรมคอมพิวเตอร์และระบบไอโอที</span>
          </div>

          {/* Creators List */}
          <div>
            <p className="text-xs text-gray-400 font-semibold mb-2.5">
              โปรเจกต์นี้ได้รับการพัฒนาและจัดทำโดย
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-white">
              <span className="bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl shadow-sm">
                นายณัฐติพงษ์ รอดผล
              </span>
              <span className="bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl shadow-sm">
                นายปัญญา นิธิธนิโยปกรณ์
              </span>
              <span className="bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl shadow-sm">
                นายนิติภูมิ ส่งผลบุญถาวร
              </span>
            </div>
          </div>

          {/* System Name & Copyright Notice */}
          <p className="text-[11px] text-gray-500 pt-2 border-t border-white/5 font-medium">
            ระบบอุ่นใจ (OonJai Disaster Relief & Rescue Management System) • สงวนลิขสิทธิ์ © 2026
          </p>

        </div>
      </footer>

    </main>
  );
}
