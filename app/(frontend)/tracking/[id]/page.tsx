'use client';
import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChevronLeft, CheckCircle2, Clock, Truck, ShieldCheck, MapPin, AlertCircle, Share2, XCircle } from 'lucide-react';

interface CaseData {
  id: string | number;
  case_number?: string;
  type: string;
  status: string;
  waterLevel: string;
  createdAt: string;
  details: string;
  latitude: number;
  longitude: number;
  rescuer_name?: string;
  rescuer_phone?: string;
  destination?: string;
}

const STEPS = [
  { id: 'pending', label: 'รอดำเนินการ', icon: Clock },
  { id: 'accepted', label: 'รับเรื่องแล้ว', icon: ShieldCheck },
  { id: 'in_progress', label: 'กำลังเข้าช่วยเหลือ', icon: Truck },
  { id: 'completed', label: 'ช่วยเหลือสำเร็จ', icon: CheckCircle2 }
];

export default function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ติดตามสถานะการช่วยเหลือฉุกเฉินของฉัน',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('คัดลอกลิงก์เรียบร้อยแล้ว');
    }
  };

  const handleCancel = async () => {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการขอความช่วยเหลือ?")) {
      try {
        const response = await fetch(`/api/cases/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' })
        });
        
        if (response.ok) {
          setCaseData(prev => prev ? { ...prev, status: 'cancelled' } : null);
        } else {
          alert('ไม่สามารถยกเลิกได้ กรุณาลองใหม่อีกครั้ง');
        }
      } catch (error) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      }
    }
  };

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const response = await fetch(`/api/cases/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            localStorage.removeItem('oonjai_last_sos');
            localStorage.removeItem('oonjai_last_report');
            throw new Error('ไม่พบข้อมูลแจ้งเหตุ หรือเคสนี้ถูกปิด/ลบออกจากระบบแล้ว');
          }
          throw new Error('เกิดข้อผิดพลาดในการดึงข้อมูล');
        }
        const result = await response.json();
        setCaseData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCase();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchCase, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="w-12 h-12 border-4 border-[#ff6600]/30 border-t-[#ff6600] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">กำลังโหลดสถานะ...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">เกิดข้อผิดพลาด</h2>
        <p className="text-gray-500 mb-8">{error}</p>
        <Button variant="outline" className="w-full" onClick={() => router.push('/map')}>กลับสู่หน้าหลัก</Button>
      </div>
    );
  }

  if (caseData.status === 'cancelled') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
          <XCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-red-600">ยกเลิกการแจ้งเหตุแล้ว</h2>
        <p className="text-gray-500 mb-8">รายการขอความช่วยเหลือนี้ถูกยกเลิกแล้วโดยผู้ใช้</p>
        <Button variant="outline" className="w-full" onClick={() => router.push('/')}>กลับสู่หน้าหลัก</Button>
      </div>
    );
  }

  let activeIndex = 0;
  if (caseData.status === 'ปลอดภัยแล้ว' || caseData.status === 'completed' || caseData.status === 'เสร็จสิ้น') {
    activeIndex = STEPS.length;
  } else {
    const currentStepIndex = STEPS.findIndex(s => s.id === caseData.status);
    activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
  }

  return (
    <div className="p-4 sm:p-6 w-full max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/history')} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-[#ff6600]">ติดตามสถานะการช่วยเหลือ</h1>
      </div>

      {(caseData.status === 'ปลอดภัยแล้ว' || caseData.status === 'completed' || caseData.status === 'เสร็จสิ้น') && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl mb-6 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold">ผู้ประสบภัยปลอดภัยแล้ว / ยุติการช่วยเหลือ</h3>
            <p className="text-xs opacity-90 mt-0.5">ระบบได้อัปเดตสถานะให้เจ้าหน้าที่ทราบแล้ว</p>
          </div>
        </div>
      )}

      <Card className="p-5 border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0b1325] shadow-sm mb-6 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>
        
        <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 relative z-10">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">รหัสอ้างอิง: CAS-{caseData.case_number ? String(caseData.case_number).padStart(3, '0') : String(caseData.id).substring(0,5)}</p>
            <h2 className="font-bold text-lg">{caseData.type === 'sos' ? '🚨 SOS ฉุกเฉิน' : caseData.type}</h2>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-md">
              {(() => {
                const timeStr = caseData.createdAt || (caseData as any).created_at;
                if (!timeStr) return '-';
                const timeDate = timeStr.seconds ? new Date(timeStr.seconds * 1000) : new Date(timeStr);
                return isNaN(timeDate.getTime()) ? '-' : timeDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
              })()}
            </span>
          </div>
        </div>
        
        <div className="space-y-2 text-sm relative z-10">
          <div className="flex gap-2">
            <span className="text-gray-500 dark:text-gray-400 w-24 shrink-0">ระดับน้ำ:</span>
            <span className="font-medium">{caseData.waterLevel || '-'}</span>
          </div>
          {caseData.details && (
            <div className="flex gap-2">
              <span className="text-gray-500 dark:text-gray-400 w-24 shrink-0">รายละเอียด:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300 line-clamp-2">{caseData.details}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Rescuer Information Card */}
      {caseData.rescuer_name && caseData.status !== 'pending' && (
        <Card className="p-4 border-2 border-[#ff6600]/20 dark:border-[#ff6600]/30 bg-orange-50 dark:bg-orange-900/10 shadow-sm mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white dark:bg-[#0b1325] rounded-full flex items-center justify-center shadow-sm border border-orange-200 dark:border-orange-800">
              <Truck className="w-6 h-6 text-[#ff6600]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">เจ้าหน้าที่กู้ภัย</p>
              <h3 className="font-bold text-gray-800 dark:text-gray-200">{caseData.rescuer_name}</h3>
            </div>
          </div>
          {caseData.rescuer_phone && (
            <a 
              href={`tel:${caseData.rescuer_phone}`} 
              className="flex items-center gap-1.5 px-3 py-2 bg-[#ff6600] hover:bg-orange-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
            >
              โทรติดต่อ
            </a>
          )}
        </Card>
      )}

      <h3 className="font-bold text-lg mb-6 text-gray-800 dark:text-gray-200">สถานะปัจจุบัน</h3>
      
      {/* Vertical Timeline */}
      <div className="relative pl-6 space-y-8 mb-10">
        <div className="absolute top-2 bottom-2 left-[27px] w-0.5 bg-gray-200 dark:bg-gray-800 z-0"></div>
        
        {STEPS.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;
          
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="relative z-10 flex items-start gap-4">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all duration-300
                ${isCompleted ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                  isActive ? 'bg-[#ff6600] text-white shadow-[#ff6600]/30 ring-4 ring-orange-100 dark:ring-orange-900/20' : 
                  'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700'}
              `}>
                <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
              </div>
              
              <div className={`pt-1.5 transition-all duration-300 ${isActive ? 'opacity-100 translate-x-1' : isCompleted ? 'opacity-80' : 'opacity-40'}`}>
                <h4 className={`font-bold ${isActive ? 'text-[#ff6600] text-lg' : isCompleted ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {step.label}
                </h4>
                {isActive && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {step.id === 'pending' && 'ระบบได้รับข้อมูลแล้ว กรุณารอสักครู่...'}
                    {step.id === 'accepted' && 'เจ้าหน้าที่รับทราบเหตุและกำลังจัดเตรียมความช่วยเหลือ'}
                    {step.id === 'in_progress' && 'ทีมกู้ภัยกำลังเดินทางไปยังพิกัดของคุณ'}
                    {step.id === 'completed' && (
                      caseData.destination === 'โรงพยาบาล' ? '✅ ช่วยเหลือสำเร็จ: นำส่งโรงพยาบาล/หน่วยแพทย์เรียบร้อยแล้ว' :
                      caseData.destination === 'ศูนย์พักพิง' ? '✅ ช่วยเหลือสำเร็จ: นำส่งศูนย์พักพิงชั่วคราวเรียบร้อยแล้ว' :
                      '✅ ช่วยเหลือสำเร็จเรียบร้อยแล้ว'
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 mt-6">
        <button 
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 bg-[#00B900] hover:bg-[#009900] text-white font-bold py-2.5 rounded-lg shadow-sm transition-colors"
        >
          <Share2 className="w-5 h-5" /> แชร์สถานะให้ครอบครัว
        </button>

        {caseData.status === 'pending' && (
          <button 
            onClick={handleCancel}
            className="w-full flex items-center justify-center gap-2 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold py-2.5 rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5" /> ยกเลิกการขอความช่วยเหลือ
          </button>
        )}

        <Button variant="primary" className="w-full flex items-center justify-center gap-2 mt-2" onClick={() => router.push('/')}>
          <MapPin className="w-4 h-4" /> กลับสู่หน้าแผนที่หลัก
        </Button>
      </div>
    </div>
  );
}
