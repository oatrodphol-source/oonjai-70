'use client';
import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  ChevronLeft, CheckCircle2, Clock, Truck, ShieldCheck, MapPin, 
  AlertCircle, Share2, XCircle, Star, UserPlus, AlertTriangle, 
  PhoneCall, BatteryCharging, Flashlight, PackageCheck, Lightbulb, BellRing, Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CaseData {
  id: string | number;
  case_number?: string;
  type: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'cancelled';
  water_level: string;
  created_at: string;
  details: string;
  latitude: number;
  longitude: number;
  people_count?: number;
  bedridden?: number | boolean;
  elderly?: number | boolean;
  severity?: number;
  rescuer_name?: string;
  rescuer_phone?: string;
  assigned_volunteer_name?: string;
  volunteer_name?: string;
  assigned_volunteer_phone?: string;
  assigned_volunteer_unit?: string;
  destination?: string;
  rating?: number;
}

const STEPS = [
  { id: 'pending', label: 'รอดำเนินการ', desc: 'ระบบรับข้อมูลแล้ว กำลังกระจายงานให้อาสา', icon: Clock },
  { id: 'in_progress', label: 'กำลังเข้าช่วยเหลือ', desc: 'ทีมอาสากำลังเดินทางไปยังพิกัดของคุณ', icon: Truck },
  { id: 'resolved', label: 'ช่วยเหลือสำเร็จ', desc: 'ผู้ประสบภัยได้รับการช่วยเหลือแล้ว', icon: CheckCircle2 }
];

export default function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Realtime notification state when volunteer accepts case
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);

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

  const caseIdQuery = isNaN(Number(id)) ? id : Number(id);

  const handleCancel = async () => {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการขอความช่วยเหลือ?")) {
      try {
        const { error: sbError } = await supabase
          .from('cases')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', caseIdQuery);

        if (!sbError) {
          localStorage.removeItem('oonjai_last_report');
          localStorage.removeItem('oonjai_last_report_data');
          localStorage.removeItem('oonjai_last_report_time');
          localStorage.removeItem('oonjai_last_sos');
          setCaseData(prev => prev ? { ...prev, status: 'cancelled' } : null);
          alert('✅ ยกเลิกการแจ้งเหตุเรียบร้อยแล้ว');
          router.push('/report?proxy=true');
        } else {
          alert('ไม่สามารถยกเลิกได้ กรุณาลองใหม่อีกครั้ง');
        }
      } catch (error) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
      }
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      alert('กรุณาให้คะแนนอย่างน้อย 1 ดาว');
      return;
    }

    setIsSubmittingRating(true);
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          rating: rating,
          feedback: feedbackText,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseIdQuery);

      if (error) {
        console.error('Error saving rating:', error);
        alert('ไม่สามารถส่งคะแนนได้ กรุณาลองใหม่');
      } else {
        setRatingSubmitted(true);
      }
    } catch (err) {
      console.error('Submit rating error:', err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const { data, error } = await supabase.from('cases').select('*').eq('id', caseIdQuery).single();
        if (error || !data) {
          localStorage.removeItem('oonjai_last_sos');
          localStorage.removeItem('oonjai_last_report');
          setError('ไม่พบข้อมูลแจ้งเหตุ หรือเคสนี้ถูกปิด/ลบออกจากระบบแล้ว');
          setIsLoading(false);
        } else {
          setCaseData({ ...data, id: String(data.id) } as CaseData);
          setPrevStatus(data.status);
          if (data.rating) {
            setRatingSubmitted(true);
            setRating(data.rating);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error(err);
        setError('เกิดข้อผิดพลาดในการดึงข้อมูล');
        setIsLoading(false);
      }
    };
    fetchCase();

    const channel = supabase.channel(`tracking-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases', filter: `id=eq.${id}` }, async (payload) => {
        console.log('🔄 ข้อมูลเคสมีการเปลี่ยนแปลง:', payload.eventType);

        const { data, error } = await supabase.from('cases').select('*').eq('id', caseIdQuery).single();
        if (data && !error) {
          // Check if volunteer just accepted the case
          if ((prevStatus === 'pending' || !caseData?.volunteer_name) && (data.status === 'in_progress' || data.volunteer_name || data.assigned_volunteer_name)) {
            setShowVolunteerModal(true);
          }
          setCaseData({ ...data, id: String(data.id) } as CaseData);
          setPrevStatus(data.status);
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, caseIdQuery, prevStatus]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="w-12 h-12 border-4 border-[#ff6600]/30 border-t-[#ff6600] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">กำลังโหลดข้อมูลติดตามเรียลไทม์จากระบบ...</p>
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
        <Button
          variant="primary"
          className="w-full bg-[#ff6600] hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
          onClick={() => {
            localStorage.removeItem('oonjai_last_report');
            localStorage.removeItem('oonjai_last_report_data');
            localStorage.removeItem('oonjai_last_report_time');
            localStorage.removeItem('oonjai_last_sos');
            router.push('/report?proxy=true');
          }}
        >
          🚨 แจ้งเหตุใหม่ (กลับสู่หน้าแจ้งเหตุ)
        </Button>
      </div>
    );
  }

  let activeIndex = 0;
  const terminalStates = ['resolved', 'cancelled'];

  if (terminalStates.includes(caseData.status)) {
    activeIndex = 2;
  } else if (caseData.status === 'in_progress') {
    activeIndex = 1;
  } else {
    activeIndex = 0;
  }

  const volunteerName = caseData.volunteer_name || caseData.assigned_volunteer_name || caseData.rescuer_name;
  const volunteerPhone = caseData.assigned_volunteer_phone || caseData.rescuer_phone;
  const volunteerUnit = caseData.assigned_volunteer_unit || "อาสาสมัครศูนย์กู้ภัย";

  // Dynamic ETA Severity Computation
  const sevVal = (caseData as any).severity || (caseData.type === 'sos' || caseData.type === 'SOS ด่วน' ? 5 : 1);
  const eta = (() => {
    const sev = Number(sevVal || 1);
    if (sev >= 5) {
      return {
        timeText: 'ภายใน 15 – 30 นาที',
        label: 'ระดับ 5 (วิกฤตฉุกเฉินด่วนที่สุด)',
        badgeBg: 'bg-red-600 text-white',
        borderBg: 'border-red-500/30 bg-red-500/10 dark:bg-red-950/40 text-red-700 dark:text-red-300',
        IconComponent: AlertTriangle
      };
    }
    if (sev === 4) {
      return {
        timeText: 'ภายใน 30 – 60 นาที',
        label: 'ระดับ 4 (เสี่ยงสูง/รุนแรง)',
        badgeBg: 'bg-orange-600 text-white',
        borderBg: 'border-orange-500/30 bg-orange-500/10 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
        IconComponent: Clock
      };
    }
    if (sev === 3) {
      return {
        timeText: 'ภายใน 1 – 3 ชั่วโมง',
        label: 'ระดับ 3 (ปานกลาง)',
        badgeBg: 'bg-amber-500 text-white',
        borderBg: 'border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
        IconComponent: Truck
      };
    }
    if (sev === 2) {
      return {
        timeText: 'ภายใน 6 – 12 ชั่วโมง',
        label: 'ระดับ 2 (เฝ้าระวัง)',
        badgeBg: 'bg-blue-600 text-white',
        borderBg: 'border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
        IconComponent: ShieldCheck
      };
    }
    return {
      timeText: 'ภายใน 24 ชั่วโมง',
      label: 'ระดับ 1 (ทั่วไป/พื้นที่ปลอดภัย)',
      badgeBg: 'bg-emerald-600 text-white',
      borderBg: 'border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
      IconComponent: AlertCircle
    };
  })();

  const EtaIcon = eta.IconComponent;

  return (
    <div className="p-4 sm:p-6 w-full max-w-lg mx-auto pb-24 relative min-h-screen">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/history')} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg sm:text-xl font-extrabold text-[#ff6600]">ติดตามสถานะการช่วยเหลือ</h1>
        </div>

        <button
          onClick={() => router.push('/report?proxy=true')}
          className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-full font-semibold flex items-center gap-1 hover:bg-blue-100 transition-colors shadow-sm cursor-pointer shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" /> แจ้งแทนผู้อื่น
        </button>
      </div>

      {/* 🚚 Volunteer Accepted Popup Modal */}
      {showVolunteerModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0b1325] border-2 border-emerald-500 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
            
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Truck className="w-8 h-8" />
            </div>

            <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold rounded-full mb-2">
              เจ้าหน้าที่รับเคสแล้ว!
            </span>

            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
              มีอาสาสมัครเข้ามารับเคสของคุณแล้ว
            </h3>

            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mb-5 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">ผู้รับผิดชอบ:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {volunteerName || 'เจ้าหน้าที่ทีมกู้ภัย'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">หน่วยงาน:</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {volunteerUnit}
                </span>
              </div>
              {volunteerPhone && (volunteerPhone !== 'ไม่ระบุเบอร์โทร') && (
                <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="text-xs text-gray-500">เบอร์ติดต่อ:</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    📞 {volunteerPhone}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {volunteerPhone && (volunteerPhone !== 'ไม่ระบุเบอร์โทร') && (
                <a
                  href={`tel:${volunteerPhone}`}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/30"
                >
                  📞 โทรติดต่อเจ้าหน้าที่ทันที
                </a>
              )}
              <Button
                variant="outline"
                className="w-full py-3 text-sm font-bold rounded-xl border-gray-300 text-gray-700 dark:text-gray-300"
                onClick={() => setShowVolunteerModal(false)}
              >
                รับทราบ / ดูสถานะติดตาม
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 1. Star Rating & Feedback (PROMINENT AT TOP CENTER when resolved) */}
      {caseData.status === 'resolved' && (
        <div className="bg-white dark:bg-[#0b1325] p-6 rounded-3xl border-2 border-amber-400 shadow-xl mb-5 text-center animate-in zoom-in duration-300 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl"></div>

          <span className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-full mb-3">
            ประเมินการช่วยเหลือ
          </span>
          <h3 className="font-black text-xl text-gray-900 dark:text-white mb-1">คุณรู้สึกอย่างไรกับการช่วยเหลือ?</h3>
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">คะแนนของคุณจะเป็นกำลังใจสำคัญให้ทีมอาสาสมัครและกู้ภัยครับ</p>

          {!ratingSubmitted ? (
            <>
              {/* Star Rating Group */}
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none transition-transform hover:scale-125 active:scale-95 p-1"
                  >
                    <Star
                      className={`w-10 h-10 ${(hoveredRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400 drop-shadow-md'
                          : 'text-gray-300 dark:text-gray-700'
                        } transition-colors`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                placeholder="พิมพ์คำขอบคุณหรือข้อเสนอแนะให้ทีมกู้ภัย (ถ้ามี)..."
                className="w-full p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none mb-4 resize-none h-24 dark:text-white"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              ></textarea>

              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/30 text-base"
                onClick={handleSubmitRating}
                disabled={isSubmittingRating}
              >
                {isSubmittingRating ? 'กำลังส่งคะแนน...' : '⭐ ส่งคะแนนการช่วยเหลือ'}
              </Button>
            </>
          ) : (
            <div className="py-4 flex flex-col items-center">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-lg text-emerald-600 dark:text-emerald-400">ขอบคุณสำหรับคะแนนประเมิน!</h4>
              <div className="flex gap-1 mt-2">
                {[...Array(rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🏆 CONSOLIDATED MASTER HERO CARD (รวมข้อมูลหลักทั้งหมดไว้อย่างสะอาดและเรียบหรู) */}
      <Card className="p-5 border-2 border-orange-100 dark:border-orange-950 bg-white dark:bg-[#0b1325] shadow-md mb-5 relative overflow-hidden rounded-3xl">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Case Badge & Status Pill */}
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest block">CASE ID</span>
            <h2 className="text-3xl font-black text-[#ff6600] tracking-tight">
              #{caseData.case_number ? String(caseData.case_number).padStart(3, '0') : String(caseData.id).substring(0, 5)}
            </h2>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {caseData.type === 'sos' ? '🚨 SOS ฉุกเฉิน' : caseData.type}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-sm ${
              caseData.status === 'pending'
                ? 'bg-orange-500 text-white animate-pulse'
                : caseData.status === 'in_progress'
                ? 'bg-yellow-500 text-white animate-pulse'
                : caseData.status === 'resolved'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-500 text-white'
            }`}>
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              {(caseData.status as string) === 'pending' && 'รอดำเนินการ'}
              {(caseData.status as string) === 'in_progress' && 'กำลังเข้าช่วยเหลือ'}
              {(caseData.status as string) === 'resolved' && 'ช่วยเหลือสำเร็จ'}
              {(caseData.status as string) === 'cancelled' && 'ยกเลิกแล้ว'}
            </span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-semibold">
              {caseData.created_at ? new Date(caseData.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.' : '-'}
            </span>
          </div>
        </div>

        {/* ETA Arrival Banner (if active) */}
        {!terminalStates.includes(caseData.status) && (
          <div className={`mt-4 p-3.5 rounded-2xl border ${eta.borderBg} flex items-center gap-3`}>
            <div className="p-2 rounded-xl bg-white/80 dark:bg-black/30 shrink-0">
              <EtaIcon className="w-5 h-5 text-current" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase">คาดการณ์เวลาทีมอาสาถึงพื้นที่</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${eta.badgeBg}`}>
                  {eta.label}
                </span>
              </div>
              <p className="text-sm font-extrabold mt-0.5">
                ประมาณ: <span className="underline decoration-2 text-base font-black">{eta.timeText}</span>
              </p>
            </div>
          </div>
        )}

        {/* Integrated Volunteer Card (If assigned) */}
        {caseData.status !== 'pending' && volunteerName && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">เจ้าหน้าที่รับเคสแล้ว</div>
                  <div className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{volunteerName}</div>
                  <div className="text-[11px] text-gray-500 truncate">{volunteerUnit}</div>
                </div>
              </div>

              {volunteerPhone && (volunteerPhone !== 'ไม่ระบุเบอร์โทร') && (
                <a
                  href={`tel:${volunteerPhone}`}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 shadow-md shadow-emerald-600/30 transition-transform"
                >
                  📞 โทรหาอาสา
                </a>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* 📋 SECTION 2: Dynamic Supabase Incident Details & Smart Guide */}
      <div className="space-y-4 mb-5">
        
        {/* Incident Raw Details Card from Supabase */}
        <Card className="p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0b1325] rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
            <Info className="w-4 h-4 text-orange-500" />
            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">ข้อมูลรายละเอียดแจ้งเหตุ</h3>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-gray-400 block text-[10px]">ระดับน้ำ</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{caseData.water_level || '-'}</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-gray-400 block text-[10px]">จำนวนผู้ติดค้าง</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{caseData.people_count || 1} คน</span>
            </div>
          </div>

          {caseData.details && (
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs">
              <span className="text-gray-400 block text-[10px] mb-1">รายละเอียดเพิ่มเติม:</span>
              <p className="font-medium text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{caseData.details}</p>
            </div>
          )}
        </Card>

        {/* Smart Victim Action & Preparation Guide (Shown ONLY after volunteer accepts case) */}
        {caseData.status === 'in_progress' && (
          <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-sm border border-slate-800 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-2.5 border-b border-slate-800 pb-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <h3 className="font-bold text-xs text-yellow-400 tracking-wider uppercase">
                คำแนะนำสำหรับการเตรียมพร้อมรับการช่วยเหลือ
              </h3>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">ทีมอาสากำลังเดินทาง:</strong> โปรดเตรียมพร้อมรับการเข้าช่วยเหลือ</span>
              </div>
              <div className="flex items-start gap-2">
                <PackageCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">จัดเตรียมของจำเป็น:</strong> รวบรวมเอกสาร ยาประจำตัว และน้ำดื่ม</span>
              </div>
              <div className="flex items-start gap-2">
                <Flashlight className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">ส่งสัญญาณ:</strong> หากเป็นกลางคืน ให้เปิดไฟฉายเมื่อได้ยินเสียงเจ้าหน้าที่</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 🛤️ SECTION 3: Vertical Status Timeline */}
      {caseData.status !== 'resolved' && (
        <Card className="bg-white dark:bg-[#0b1325] rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
          <h3 className="font-extrabold text-sm mb-4 text-gray-800 dark:text-gray-200">ลำดับขั้นตอนการช่วยเหลือ</h3>
          <div className="relative pl-5 space-y-6">
            <div className="absolute top-2 bottom-2 left-[23px] w-0.5 bg-gray-200 dark:bg-gray-800 z-0"></div>

            {STEPS.map((step, index) => {
              const isCompleted = index < activeIndex;
              const isActive = index === activeIndex;
              const StepIcon = step.icon;

              return (
                <div key={step.id} className="relative z-10 flex items-start gap-3">
                  <div className={`
                        w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all duration-300
                        ${isCompleted ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                      isActive ? 'bg-[#ff6600] text-white shadow-[#ff6600]/30 ring-4 ring-orange-100 dark:ring-orange-900/20' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700'}
                      `}>
                    <StepIcon className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : ''}`} />
                  </div>

                  <div className={`pt-0.5 transition-all duration-300 ${isActive ? 'opacity-100 translate-x-1' : isCompleted ? 'opacity-80' : 'opacity-40'}`}>
                    <h4 className={`font-bold text-xs sm:text-sm ${isActive ? 'text-[#ff6600]' : isCompleted ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {step.label}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Floating Bottom Actions (Share, Cancel, Map) */}
      <div className="fixed bottom-14 left-0 right-0 z-40 px-4 sm:px-6 w-full max-w-lg mx-auto bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 dark:from-[#020817] dark:via-[#020817]">
        <div className="flex flex-row gap-2 shadow-xl rounded-2xl bg-white dark:bg-[#0b1325] p-2 border border-gray-100 dark:border-gray-800">
          <button
            onClick={handleShare}
            className="flex-1 min-w-fit px-2 py-3 text-xs sm:text-sm font-semibold rounded-xl text-center leading-tight flex items-center justify-center gap-1.5 bg-[#00B900] hover:bg-[#009900] text-white transition-colors shadow-sm"
          >
            <Share2 className="w-4 h-4" /> แชร์สถานะ
          </button>

          {caseData.status === 'pending' && (
            <button
              onClick={handleCancel}
              className="flex-1 min-w-fit px-2 py-3 text-xs sm:text-sm font-semibold rounded-xl text-center leading-tight flex items-center justify-center gap-1.5 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <XCircle className="w-4 h-4" /> ยกเลิก
            </button>
          )}

          <Button variant="outline" className="flex-1 min-w-fit px-2 py-3 text-xs sm:text-sm font-semibold rounded-xl text-center leading-tight flex items-center justify-center gap-1.5" onClick={() => router.push('/map')}>
            <MapPin className="w-4 h-4" /> แผนที่หลัก
          </Button>
        </div>
      </div>

    </div>
  );
}