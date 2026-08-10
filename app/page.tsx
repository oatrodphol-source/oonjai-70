import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Users, Phone, ArrowRight, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0b1325] text-white overflow-hidden relative w-full max-w-full overflow-x-hidden">
      {/* Background Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#ff6600]/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Navbar for Landing */}
      <nav className="relative z-10 flex items-center justify-between w-full max-w-7xl mx-auto px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border border-[#ff6600] flex items-center justify-center bg-[#0b1325] overflow-hidden">
            <img src="/icon01.ico" alt="OonJai Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-wide">
            <span className="text-[#ff6600]">Oon</span>
            <span className="text-white">Jai</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:bg-white/10 px-2 md:px-4">
              <LogIn className="w-5 h-5 md:hidden" />
              <span className="hidden md:inline">เข้าสู่ระบบ (เจ้าหน้าที่)</span>
            </Button>
          </Link>
          <Link href="/sos">
            <Button variant="primary" className="text-sm px-3 py-1.5 md:text-base md:px-5 md:py-2.5">แจ้งเหตุฉุกเฉิน</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20 pb-32">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6600]/20 border border-[#ff6600]/30 text-[#ff6600] text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-[#ff6600] animate-ping"></span>
          ระบบแจ้งเหตุและประสานความช่วยเหลือ 24 ชม.
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight">
          เมื่อเกิดเหตุฉุกเฉิน <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6600] to-yellow-500">
            ให้อุ่นใจดูแลคุณ
          </span>
        </h1>
        
        <p className="text-base md:text-lg text-gray-400 mb-10 max-w-2xl">
          แพลตฟอร์มศูนย์กลางเชื่อมต่อผู้ประสบภัยและหน่วยกู้ภัย 
          รองรับการแจ้งเหตุอย่างรวดเร็ว พร้อมระบบคัดกรองความเร่งด่วนด้วย AI
        </p>
        
        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center justify-center gap-4">
          <Link href="/sos" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto h-14 text-lg group">
              <ShieldAlert className="mr-2 h-6 w-6 group-hover:animate-bounce" />
              แจ้งเหตุฉุกเฉินทันที
            </Button>
          </Link>
          <Link href="/map" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 text-lg">
              <ArrowRight className="mr-2 h-5 w-5" />
              ดูพื้นที่เสี่ยงภัย
            </Button>
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 bg-white/5 border-t border-white/10 py-24">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-[#ff6600]/20 flex items-center justify-center mb-6">
                <ShieldAlert className="text-[#ff6600] w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">แจ้งเหตุรวดเร็ว</h3>
              <p className="text-gray-400 leading-relaxed">
                ด้วยปุ่ม SOS ที่ดึงพิกัดอัตโนมัติ พร้อมส่งสัญญาณถึงหน่วยกู้ภัยที่ใกล้ที่สุดทันที
              </p>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                <Users className="text-blue-500 w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">ประสานงานกู้ภัย</h3>
              <p className="text-gray-400 leading-relaxed">
                ระบบจัดการเคสสำหรับเจ้าหน้าที่ พร้อมอัปเดตสถานะแบบ Real-time ให้ผู้ประสบภัยทราบ
              </p>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6">
                <Phone className="text-purple-500 w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">แจ้งเตือนผ่าน LINE</h3>
              <p className="text-gray-400 leading-relaxed">
                เชื่อมต่อ LINE Official Account เพื่อแจ้งเหตุและรับการอัปเดตสถานะได้อย่างสะดวก
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
