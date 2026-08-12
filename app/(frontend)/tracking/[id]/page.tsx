'use client';
import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChevronLeft, CheckCircle2, Clock, Truck, ShieldCheck, MapPin, AlertCircle, Share2, XCircle, Star, UserPlus } from 'lucide-react';
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
  { id: 'pending', label: 'รอดำเนินการ', icon: Clock },
  { id: 'in_progress', label: 'กำลังเข้าช่วยเหลือ', icon: Truck },
  { id: 'resolved', label: 'ช่วยเหลือสำเร็จ', icon: CheckCircle2 }
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
        let query = supabase.from('cases').select('*');
        if (!isNaN(Number(id))) {
          query = query.or(`id.eq.${id},case_number.eq.${id}`);
        } else {
          query = query.eq('id', id);
        }

        const { data, error } = await query.order('created_at', { ascending: false }).limit(1);
        const caseItem = data && data.length > 0 ? data[0] : null;

        if (error || !caseItem) {
          setError('ไม่พบข้อมูลแจ้งเหตุ หรือเคสนี้ถูกปิด/ลบออกจากระบบแล้ว');
          setIsLoading(false);
        } else {
          setCaseData({ ...caseItem, id: String(caseItem.id) } as CaseData);
          if (caseItem.rating) {
            setRatingSubmitted(true);
            setRating(caseItem.rating);
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

    const channel = supabase.channel(`tracking-case-page-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => {
        console.log('🔄 ข้อมูลเคสมีการเปลี่ยนแปลง Realtime: re-fetching case');
        fetchCase();
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
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

  return (
    <div className="p-4 sm:p-6 w-full max-w-lg mx-auto pb-16 relative min-h-screen">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/history')} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-[#ff6600]">ติดตามสถานะการช่วยเหลือ</h1>
        </div>

        <button 
          onClick={() => router.push('/report?proxy=true')}
          className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 hover:bg-blue-100 transition-colors shadow-sm cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" /> แจ้งแทนผู้อื่น
        </button>
      </div>

      {terminalStates.includes(caseData.status) && (
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

      <Card className="p-5 border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0b1325] shadow-sm mb-6 relative overflow-hidden text-center">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>
        
        <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 relative z-10">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">หมายเลขเหตุการณ์ (Case ID)</p>
          <h1 className="text-6xl md:text-7xl font-black text-[#ff6600] tracking-tighter mt-2 mb-2">
            #{caseData.case_number ? String(caseData.case_number).padStart(3, '0') : String(caseData.id).substring(0,5)}
          </h1>
          <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200">{caseData.type === 'sos' ? '🚨 SOS ฉุกเฉิน' : caseData.type}</h2>
        </div>
        
        <div className="space-y-2 text-sm relative z-10 text-left">
          <div className="flex justify-between border-b border-gray-50 pb-2">
             <span className="text-gray-500">เวลาแจ้งเหตุ:</span>
             <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                {caseData.created_at ? new Date(caseData.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
             </span>
          </div>
          <div className="flex justify-between border-b border-gray-50 pb-2 pt-1">
            <span className="text-gray-500">ระดับน้ำ:</span>
            <span className="font-medium">{caseData.water_level || '-'}</span>
          </div>
          {caseData.details && (
            <div className="flex flex-col pt-1">
              <span className="text-gray-500 mb-1">รายละเอียด:</span>
              <span className="font-medium text-gray-700 bg-gray-50 p-2 rounded-lg">{caseData.details}</span>
            </div>
          )}
        </div>
      </Card>

      {caseData.status !== 'pending' && (caseData.volunteer_name || caseData.assigned_volunteer_name || caseData.rescuer_name) && (
        <div className="bg-white dark:bg-[#151b2c] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-2xl shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {caseData.volunteer_name || caseData.assigned_volunteer_name || caseData.rescuer_name}
              </span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {caseData.assigned_volunteer_unit || "อาสาสมัคร"}
              </span>
              {(caseData.assigned_volunteer_phone || caseData.rescuer_phone) && (caseData.assigned_volunteer_phone !== 'ไม่ระบุเบอร์โทร') && (
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-1 flex items-center gap-1.5">
                  📞 {caseData.assigned_volunteer_phone || caseData.rescuer_phone}
                </span>
              )}
            </div>
          </div>
          
          {(caseData.assigned_volunteer_phone || caseData.rescuer_phone) && (caseData.assigned_volunteer_phone !== 'ไม่ระบุเบอร์โทร') && (
            <>
              <hr className="my-4 border-gray-50 dark:border-gray-800/50" />
              <a 
                href={`tel:${caseData.assigned_volunteer_phone || caseData.rescuer_phone}`} 
                className="w-full flex items-center justify-center gap-2 bg-green-500 active:bg-green-600 text-white py-3.5 px-4 rounded-xl font-bold text-base transition-transform active:scale-[0.98]"
              >
                📞 โทรติดต่อเจ้าหน้าที่
              </a>
            </>
          )}
        </div>
      )}

      {/* 🌟 ระบบให้คะแนนอาสาสมัคร (จะโชว์เมื่อเคส resolved) */}
      {caseData.status === 'resolved' ? (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-orange-100 shadow-sm mb-8 text-center animate-in zoom-in duration-300 relative z-10">
              <h3 className="font-bold text-xl mb-2">คุณรู้สึกอย่างไรกับการช่วยเหลือ?</h3>
              <p className="text-gray-500 text-sm mb-4">คะแนนของคุณจะเป็นกำลังใจสำคัญให้ทีมกู้ภัยครับ</p>
              
              {!ratingSubmitted ? (
                  <>
                      {/* กลุ่มดาว */}
                      <div className="flex justify-center gap-2 mb-4">
                          {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                  key={star}
                                  onClick={() => setRating(star)}
                                  onMouseEnter={() => setHoveredRating(star)}
                                  onMouseLeave={() => setHoveredRating(0)}
                                  className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                              >
                                  <Star 
                                      className={`w-10 h-10 ${
                                          (hoveredRating || rating) >= star 
                                              ? 'fill-yellow-400 text-yellow-400' 
                                              : 'text-gray-300'
                                      } transition-colors`} 
                                  />
                              </button>
                          ))}
                      </div>

                      <textarea 
                          placeholder="คำขอบคุณหรือข้อเสนอแนะ (ถ้ามี)..."
                          className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none mb-4 resize-none h-24"
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                      ></textarea>

                      <Button 
                          className="w-full bg-[#ff6600] hover:bg-orange-600 text-white font-bold py-3 rounded-xl"
                          onClick={handleSubmitRating}
                          disabled={isSubmittingRating}
                      >
                          {isSubmittingRating ? 'กำลังส่งข้อมูล...' : 'ส่งคะแนนรีวิว'}
                      </Button>
                  </>
              ) : (
                  <div className="py-6 flex flex-col items-center">
                      <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-3">
                          <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h4 className="font-bold text-lg text-green-600">ขอบคุณสำหรับคะแนนครับ!</h4>
                      <div className="flex gap-1 mt-2">
                          {[...Array(rating)].map((_, i) => (
                              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          ))}
                      </div>
                  </div>
              )}
          </div>
      ) : (
          <>
              {/* Vertical Timeline */}
              <h3 className="font-bold text-lg mb-6 text-gray-800 dark:text-gray-200">สถานะปัจจุบัน</h3>
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
                            {step.id === 'pending' && 'ระบบได้รับข้อมูลแล้ว กำลังกระจายงานให้เจ้าหน้าที่...'}
                            {step.id === 'in_progress' && 'ทีมกู้ภัยรับทราบเหตุและกำลังเดินทางไปยังพิกัดของคุณ'}
                            {step.id === 'resolved' && `✅ ช่วยเหลือสำเร็จ`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 🌟 พระเอกของเรา กล่องเปล่าล่องหน! (ดันพื้นที่ให้เลื่อนจอได้ลึกขึ้น) */}
              <div className="h-40 sm:h-48 w-full bg-transparent"></div>

              {/* ปุ่มแชร์ และ ยกเลิก (ลอยอยู่ด้านล่าง) */}
              <div className="fixed bottom-14 left-0 right-0 z-40 px-4 sm:px-6 w-full max-w-lg mx-auto bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 dark:from-[#020817] dark:via-[#020817]">
                <div className="flex flex-row gap-2 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_-5px_15px_rgba(0,0,0,0.3)] rounded-xl bg-white dark:bg-[#0b1325] p-2 border border-gray-100 dark:border-gray-800">
                  <button 
                    onClick={handleShare}
                    className="flex-1 min-w-fit px-2 py-3 text-[13px] sm:text-sm font-semibold rounded-lg text-center leading-tight flex items-center justify-center gap-2 bg-[#00B900] hover:bg-[#009900] text-white transition-colors"
                  >
                    <Share2 className="w-4 h-4" /> แชร์สถานะ
                  </button>

                  {caseData.status === 'pending' && (
                    <button 
                      onClick={handleCancel}
                      className="flex-1 min-w-fit px-2 py-3 text-[13px] sm:text-sm font-semibold rounded-lg text-center leading-tight flex items-center justify-center gap-2 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> ยกเลิก
                    </button>
                  )}
                  
                  <Button variant="outline" className="flex-1 min-w-fit px-2 py-3 text-[13px] sm:text-sm font-semibold rounded-lg text-center leading-tight flex items-center justify-center gap-2" onClick={() => router.push('/map')}>
                    <MapPin className="w-4 h-4" /> แผนที่หลัก
                  </Button>
                </div>
              </div>
          </>
      )}

      {/* ถ้าเป็นสถานะ resolved แล้ว ให้แสดงปุ่มกลับหน้าหลักแบบปกติ (ไม่ลอย) */}
      {caseData.status === 'resolved' && (
        <Button variant="primary" className="mt-4 w-full px-4 py-3 text-[13px] sm:text-sm font-semibold rounded-xl text-center leading-tight flex items-center justify-center gap-2" onClick={() => router.push('/map')}>
          <MapPin className="w-4 h-4" /> กลับสู่หน้าแผนที่หลัก
        </Button>
      )}

    </div>
  );
}