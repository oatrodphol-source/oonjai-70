'use client';
import React, { useState, useEffect } from 'react';
import { Stepper } from '@/components/ui/Stepper';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Camera, MapPin, AlertTriangle, CheckCircle2, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getSeveritySolidColor } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// Dynamically import the map to prevent SSR Leaflet DOM errors
const DraggableMap = dynamic(() => import('./DraggableMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400 text-sm">
      กำลังโหลดแผนที่...
    </div>
  )
});

const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};

export const ReportStepForm = () => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedCaseId, setSubmittedCaseId] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isProxyReport, setIsProxyReport] = useState(false);

  const [showTriageModal, setShowTriageModal] = useState(false);
  const [triagePhase, setTriagePhase] = useState(1);
  const [calculatedSeverity, setCalculatedSeverity] = useState(1);
  const [visionFeedback, setVisionFeedback] = useState('');
  
  const [isLiff, setIsLiff] = useState(false);
  const [liffProfile, setLiffProfile] = useState<{ displayName?: string; pictureUrl?: string; userId?: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    type: 'ฉุกเฉิน/ป่วยต้องการหมออาสา',
    peopleCount: 1,
    bedridden: false,
    elderly: false,
    waterLevel: '',
    details: '',
    latitude: 0,
    longitude: 0,
    image_url: '',
    image_name: '',
    locationReady: false,
    image_file: null as File | null,
  });

  // LIFF Initialization & Profile Pre-fill
  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) return;
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });

        if (liff.isInClient() || liff.isLoggedIn()) {
          setIsLiff(true);
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            setLiffProfile(profile);
            if (profile?.displayName) {
              setFormData((prev) => ({
                ...prev,
                name: prev.name ? prev.name : profile.displayName
              }));
            }
            if (profile?.userId) {
              const { data: activeCase } = await supabase
                .from('cases')
                .select('id')
                .eq('reporter_name', profile.userId)
                .in('status', ['pending', 'in_progress'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              if (activeCase) {
                router.push(`/tracking/${activeCase.id}`);
              }
            }
          }
        }
      } catch (err) {
        console.warn('LIFF init warning:', err);
      }
    };
    initLiff();
  }, [router]);


  const handleCloseLiff = async () => {
    try {
      const liff = (await import('@line/liff')).default;
      if (liff.isInClient()) {
        liff.closeWindow();
      } else {
        router.push(`/tracking/${submittedCaseId}`);
      }
    } catch (e) {
      router.push(`/tracking/${submittedCaseId}`);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('proxy') === 'true') {
        setIsProxyReport(true);
      }
    }
  }, []);

  useEffect(() => {
    const checkCooldown = () => {
      const lastReportTime = localStorage.getItem('oonjai_last_report_time');
      if (lastReportTime) {
        const elapsed = Date.now() - parseInt(lastReportTime);
        const remaining = 600000 - elapsed;
        if (remaining > 0) {
          setCooldownRemaining(remaining);
        } else {
          setCooldownRemaining(0);
        }
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
  };

  const calculateSeverity = () => {
    let baseLevel = 1;
    let feedback = '';

    // 1. Base Score from Water Level
    switch (formData.waterLevel) {
      case 'ข้อเท้า/ตาตุ่ม': baseLevel = 1; break;
      case 'ระดับเข่า': baseLevel = 2; break;
      case 'ระดับเอว': baseLevel = 3; break;
      case 'ระดับอก/ท่วมในบ้าน': baseLevel = 4; break;
      case 'ท่วมมิดหลังคา': baseLevel = 5; break;
      default: baseLevel = 1;
    }

    let finalLevel = baseLevel;

    // 2. AI Modifiers for Vulnerability
    if (formData.bedridden) {
      finalLevel += 2; // Critical priority for bedridden
    }
    if (formData.elderly) {
      finalLevel += 1; // High priority for kids/elderly
    }
    if (formData.peopleCount && parseInt(formData.peopleCount.toString()) > 5) {
      finalLevel += 1; // Extra priority for large groups
    }
    
    // Auto-escalate if it's a direct SOS type
    if (formData.type === 'SOS ด่วน') {
       finalLevel = 5;
    }

    if (formData.image_url) {
      const fileName = formData.image_name?.toLowerCase() || '';
      const isIrrelevant = ['slip', 'สลิป', 'receipt', 'ใบเสร็จ', 'โอน', 'transfer', 'pay'].some(keyword => fileName.includes(keyword));
      
      if (isIrrelevant) {
        feedback = '⚠️ ภาพอาจไม่เกี่ยวข้องกับภัยพิบัติ (ไม่นำภาพมาคำนวณความเสี่ยง)';
      } else {
        finalLevel += 1;
        feedback = '✅ AI ประเมินภาพถ่ายเบื้องต้น (+1 ระดับความเสี่ยง) *รอศูนย์ฯ ยืนยัน*';
      }
    }
    
    setVisionFeedback(feedback);

    // 3. Strict Cap at Level 5
    return Math.min(finalLevel, 5);
  };

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 5: return 'พื้นที่เสี่ยงวิกฤต (ระดับ 5)';
      case 4: return 'พื้นที่เสี่ยงรุนแรง (ระดับ 4)';
      case 3: return 'พื้นที่เสี่ยงปานกลาง (ระดับ 3)';
      case 2: return 'พื้นที่เฝ้าระวัง (ระดับ 2)';
      case 1: return 'พื้นที่ปลอดภัย/ทั่วไป (ระดับ 1)';
      default: return `ระดับ ${severity}`;
    }
  };

  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  const handleNext = async () => {
    if (!formData.name.trim()) {
      alert('กรุณาระบุชื่อ-นามสกุล');
      return;
    }
    if (!validatePhone(formData.phone)) {
      setPhoneError('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักเท่านั้น');
      return;
    }
    setPhoneError('');
    if (!formData.waterLevel) {
      alert('กรุณาระบุระดับน้ำ');
      return;
    }
    
    let severity = calculateSeverity();
    setCalculatedSeverity(severity);
    setShowTriageModal(true);
    setTriagePhase(1);

    // If an image was uploaded, perform real Gemini AI Vision analysis
    if (formData.image_file) {
      try {
        const analyzeData = new FormData();
        analyzeData.append('image', formData.image_file);
        analyzeData.append('prompt', `ช่วยวิเคราะห์ความรุนแรงของภัยพิบัติ ระดับน้ำ ผู้ประสบภัย และกลุ่มเปราะบาง จากรูปภาพนี้ร่วมกับข้อมูล: น้ำ=${formData.waterLevel}, มีผู้ป่วยติดเตียง=${formData.bedridden ? 'มี' : 'ไม่มี'}, เด็ก/ผู้สูงอายุ=${formData.elderly ? 'มี' : 'ไม่มี'}`);

        const aiRes = await fetch('/api/analyze', {
          method: 'POST',
          body: analyzeData
        });

        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          let parsed = null;
          try {
            parsed = typeof aiJson.result === 'string' ? JSON.parse(aiJson.result) : aiJson.result;
          } catch {
            parsed = null;
          }

          if (parsed && parsed.risk_level) {
            const aiLevel = Number(parsed.risk_level) || severity;
            const finalLevel = Math.max(severity, aiLevel);
            setCalculatedSeverity(finalLevel);
            setAiAnalysisResult(parsed);

            const feedbackText = `🤖 AI Vision (${parsed.ai_score || 0}/100): ${parsed.situation_summary || 'วิเคราะห์สำเร็จ'} ${parsed.detected_keywords ? `[${parsed.detected_keywords.join(', ')}]` : ''}`;
            setVisionFeedback(feedbackText);
          }
        }
      } catch (err) {
        console.warn('AI Vision Analysis error, fallback to algorithm:', err);
      }
    }

    // Move to results phase
    setTriagePhase(2);
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData, 
            latitude: position.coords.latitude, 
            longitude: position.coords.longitude,
            locationReady: true
          });
        },
        () => alert('ไม่สามารถดึงตำแหน่งได้')
      );
    } else {
      alert('เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่ง GPS');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_url: reader.result as string, image_name: file.name, image_file: file });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    const lastReportStr = localStorage.getItem('oonjai_last_report_data');
    if (lastReportStr) {
      try {
        const lastReport = JSON.parse(lastReportStr);
        const elapsed = Date.now() - lastReport.timestamp;
        
        if (elapsed < 10 * 60 * 1000) { // Under 10 mins
          if (isProxyReport) {
            const proxyCount = parseInt(localStorage.getItem('oonjai_proxy_count') || '0', 10);
            if (proxyCount >= 3) {
              alert('คุณได้แจ้งเหตุแทนบุคคลอื่นครบกำหนด (3 เคส) แล้ว กรุณารอสักครู่เพื่อป้องกันสแปม');
              return; // Block
            }
            // Allow through for proxy report!
          } else {
            // Not proxy, check distance between new pin and previous pin (SOS or Form)
            const dist = getDistanceKm(formData.latitude, formData.longitude, lastReport.lat, lastReport.lng);
            if (dist <= 0.5) { // Same area <= 500m
              const targetId = lastReport.caseId || localStorage.getItem('oonjai_active_case_id');
              if (targetId) {
                setIsSubmitting(false);
                router.push(`/tracking/${targetId}`);
                return; // Block submission & silently redirect directly to tracking page
              }
            }
            // Distance > 500m (different location pin), allow new submission!
          }
        }
      } catch (e) {}
    }

    if (!validatePhone(formData.phone)) {
      setPhoneError('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักเท่านั้น');
      setStep(1);
      return;
    }
  
    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('phone', formData.phone);
      submitData.append('type', formData.type);
      submitData.append('peopleCount', formData.peopleCount.toString());
      submitData.append('bedridden', formData.bedridden ? '1' : '0');
      submitData.append('elderly', formData.elderly ? '1' : '0');
      let finalDetails = formData.details.trim();
      if (aiAnalysisResult) {
        const aiInfo = `[AI Analysis Score: ${aiAnalysisResult.ai_score || 0}/100 | ${aiAnalysisResult.situation_summary || ''} | Recommended Action: ${aiAnalysisResult.recommended_action || ''}]`;
        finalDetails = finalDetails ? `${finalDetails}\n${aiInfo}` : aiInfo;
      }
      submitData.append('details', finalDetails);
      submitData.append('latitude', formData.latitude.toString());
      submitData.append('longitude', formData.longitude.toString());
      submitData.append('severity', calculatedSeverity.toString());
      
      if (formData.image_file) {
        submitData.append('image', formData.image_file);
      }
      const lineUid = liffProfile?.userId || (typeof window !== 'undefined' ? localStorage.getItem('oonjai_line_uid') : null);
      if (lineUid) {
        submitData.append('reporter_name', lineUid);
      }

      const response = await fetch('/api/cases', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        let errorMsg = 'Failed to submit case';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch(e) {
          errorMsg = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      const caseId = data?.id ? String(data.id) : '456';
      
      localStorage.setItem('oonjai_last_report', JSON.stringify({ caseId: caseId, timestamp: Date.now() }));
      localStorage.setItem('oonjai_user_phone', formData.phone);
      
      localStorage.setItem('oonjai_last_report_data', JSON.stringify({
        timestamp: Date.now(),
        caseId: String(caseId),
        lat: formData.latitude,
        lng: formData.longitude,
        type: 'report'
      }));
      if (isProxyReport) {
        const currentCount = parseInt(localStorage.getItem('oonjai_proxy_count') || '0', 10);
        localStorage.setItem('oonjai_proxy_count', (currentCount + 1).toString());
      }
      
      try {
        const newCaseId = caseId;
        const existingCases = JSON.parse(localStorage.getItem('oonjai_my_cases') || '[]');
        if (!existingCases.includes(newCaseId)) {
          existingCases.push(newCaseId);
          localStorage.setItem('oonjai_my_cases', JSON.stringify(existingCases));
        }
        console.log("🔥 SAVED TO LOCAL STORAGE:", newCaseId, existingCases);
        
        // Dispatch a custom event so the History page can listen and refresh immediately
        window.dispatchEvent(new Event('localCasesUpdated'));
      } catch (error) {
        console.error("🔥 FAILED TO SAVE LOCAL STORAGE:", error);
      }
      
      localStorage.setItem('oonjai_active_case_id', String(caseId));
      setSubmittedCaseId(caseId);
      router.push(`/tracking/${caseId}`);
    } catch (error) {
      console.error('Submission error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "text-base p-3 md:p-4 border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl";

  return (
    <div className="p-4 sm:p-6 w-full max-w-lg mx-auto pb-24 space-y-6">
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 shadow-sm border border-orange-200 dark:border-orange-800">
          <AlertTriangle className="w-8 h-8 text-[#ff6600]" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">แจ้งเหตุฉุกเฉิน</h2>
        <p className="text-sm leading-relaxed break-words text-balance text-gray-500 dark:text-gray-400">กรอกข้อมูลเพื่อให้เจ้าหน้าที่ช่วยเหลือได้รวดเร็วและแม่นยำที่สุด</p>
      </div>

      <Card className="mt-8 border border-gray-200 dark:border-[#ff6600]/20 shadow-xl shadow-orange-500/10 bg-white dark:bg-[#0b1325] relative z-10 overflow-hidden rounded-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff6600] to-orange-400"></div>
        <div className="p-6">
          
          {cooldownRemaining > 0 && !isProxyReport && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl animate-pulse text-center shadow-sm">
              <p className="text-red-600 dark:text-red-400 font-bold text-sm sm:text-base">
                ⏳ ระบบกำลังดำเนินการเคสของคุณ กรุณารอ {formatTime(cooldownRemaining)} นาทีก่อนแจ้งเหตุครั้งถัดไป
              </p>
            </div>
          )}

          {/* LINE LIFF Banner */}
          {isLiff && liffProfile && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                {liffProfile.pictureUrl ? (
                  <img src={liffProfile.pictureUrl} alt={liffProfile.displayName} className="w-10 h-10 rounded-full border-2 border-emerald-400 object-cover shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">LINE</div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">เชื่อมต่อบัญชี LINE แล้ว</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{liffProfile.displayName}</p>
                </div>
              </div>
              <span className="text-[11px] bg-emerald-600 text-white px-2.5 py-1 rounded-full font-bold shadow-sm">LIFF Connected</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm">แจ้งเหตุแทนญาติ/บุคคลอื่น</h4>
                  <p className="text-xs text-blue-700 mt-0.5">เปิดสวิตช์นี้หากคุณกำลังรายงานแทนผู้ที่ติดอยู่ในพื้นที่อื่น</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsProxyReport(!isProxyReport)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isProxyReport ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isProxyReport ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Location Section - One-Tap GPS */}
              <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">พิกัดสถานที่เกิดเหตุ (GPS) *</label>
                  {formData.locationReady && (
                    <span className="text-[11px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ปักหมุดเรียบร้อย
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant={formData.locationReady ? "primary" : "outline"} 
                    className={`w-full flex justify-center items-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-bold transition-all rounded-xl leading-tight ${formData.locationReady ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'hover:border-[#ff6600] hover:text-[#ff6600] border-2 border-slate-300 dark:border-slate-700'}`}
                    onClick={getLocation}
                  >
                    <MapPin className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${formData.locationReady ? 'text-white' : 'text-[#ff6600]'}`} />
                    <span className="truncate">{formData.locationReady ? 'ปักหมุดตำแหน่งปัจจุบันเรียบร้อย' : 'ปักหมุดตำแหน่งปัจจุบัน (GPS)'}</span>
                  </Button>
                </div>
                
                {formData.locationReady ? (
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                    <span>📍 ละติจูด: {formData.latitude.toFixed(6)}, ลองจิจูด: {formData.longitude.toFixed(6)}</span>
                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">GPS Ready</span>
                  </div>
                ) : (
                  <p className="text-xs text-[#ff6600] flex items-center gap-1.5 mt-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> จำเป็นต้องระบุตำแหน่งเพื่อให้เจ้าหน้าที่ไปถูกที่
                  </p>
                )}
                
                {formData.locationReady && (
                  <DraggableMap 
                    lat={formData.latitude} 
                    lng={formData.longitude} 
                    onLocationChange={(lat, lng) => setFormData({...formData, latitude: lat, longitude: lng})} 
                  />
                )}
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input 
                  label="ชื่อ-นามสกุล *" 
                  placeholder="เช่น สมชาย ใจดี" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={inputClass}
                />
                <div className="space-y-1">
                  <Input 
                    label="เบอร์โทรศัพท์ (10 หลัก) *" 
                    placeholder="เช่น 0812345678" 
                    type="tel"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData({...formData, phone: val});
                      if (val.length === 10) setPhoneError('');
                    }}
                    className={inputClass}
                  />
                  {phoneError && <p className="text-xs text-red-500 font-medium animate-in slide-in-from-top-1">{phoneError}</p>}
                </div>
              </div>

              {/* Incident Type Select */}
              <Select 
                label="ประเภทการขอความช่วยเหลือ *"
                options={[
                  { label: 'ฉุกเฉิน/ป่วยต้องการหมออาสา', value: 'ฉุกเฉิน/ป่วยต้องการหมออาสา' },
                  { label: 'อพยพ/เคลื่อนย้ายออกนอกพื้นที่', value: 'อพยพ/เคลื่อนย้ายออกนอกพื้นที่' },
                  { label: 'ต้องการน้ำ/อาหาร/ยา', value: 'ต้องการน้ำ/อาหาร/ยา' },
                  { label: 'เตรียมอพยพ/เฝ้าระวัง', value: 'เตรียมอพยพ/เฝ้าระวัง' },
                  { label: 'อพยพสัตว์', value: 'อพยพสัตว์' },
                ]}
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className={inputClass}
              />

              {/* Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">จำนวนผู้ประสบภัย (คน) *</label>
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 w-full mt-1">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, peopleCount: Math.max(1, formData.peopleCount - 1)})}
                      className="w-12 h-10 flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white rounded-lg text-xl font-bold hover:bg-slate-300 active:scale-95 transition-all"
                    >
                      -
                    </button>
                    
                    <div className="text-center flex-1">
                      <span className="text-xl font-bold text-slate-800 dark:text-white">{formData.peopleCount}</span>
                      <span className="text-sm text-slate-500 ml-2">คน</span>
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, peopleCount: formData.peopleCount + 1})}
                      className="w-12 h-10 flex items-center justify-center bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-500 rounded-lg text-xl font-bold hover:bg-orange-200 dark:hover:bg-orange-500/30 active:scale-95 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
                <Select 
                  label="ระดับน้ำปัจจุบัน *"
                  options={[
                    { label: '-- กรุณาระบุระดับน้ำ --', value: '' },
                    { label: 'ข้อเท้า/ตาตุ่ม', value: 'ข้อเท้า/ตาตุ่ม' },
                    { label: 'ระดับเข่า', value: 'ระดับเข่า' },
                    { label: 'ระดับเอว', value: 'ระดับเอว' },
                    { label: 'ระดับอก/ท่วมในบ้าน', value: 'ระดับอก/ท่วมในบ้าน' },
                    { label: 'ท่วมมิดหลังคา', value: 'ท่วมมิดหลังคา' },
                  ]}
                  value={formData.waterLevel}
                  onChange={(e) => setFormData({...formData, waterLevel: e.target.value})}
                  className={inputClass}
                />
              </div>

              {/* Toggles for Vulnerable people */}
              <div className="bg-orange-50/50 dark:bg-orange-900/10 p-5 rounded-xl border border-orange-100 dark:border-orange-900/30 space-y-4">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block border-b border-orange-200 dark:border-orange-900/50 pb-2">คัดกรองกลุ่มเปราะบาง (AI Triage)</label>
                
                <label className="flex items-center justify-between cursor-pointer group min-h-[48px]">
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">มีผู้ป่วยติดเตียงในพื้นที่ไหม?</span>
                  <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input 
                      type="checkbox" 
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:right-0 checked:border-[#ff6600]"
                      checked={formData.bedridden}
                      onChange={(e) => setFormData({...formData, bedridden: e.target.checked})}
                    />
                    <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer transition-colors"></label>
                  </div>
                </label>

                <label className="flex items-center justify-between cursor-pointer group min-h-[48px]">
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">มีเด็กเล็กหรือผู้สูงอายุไหม?</span>
                  <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input 
                      type="checkbox" 
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:right-0 checked:border-[#ff6600]"
                      checked={formData.elderly}
                      onChange={(e) => setFormData({...formData, elderly: e.target.checked})}
                    />
                    <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer transition-colors"></label>
                  </div>
                </label>
              </div>

              {/* Photo Upload & Camera Choice Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">รูปภาพหน้างาน (ถ้ามี)</label>
                
                {/* Hidden File Inputs */}
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  id="camera-input" 
                  className="hidden" 
                  onChange={handleImageUpload} 
                />
                <input 
                  type="file" 
                  accept="image/*" 
                  id="gallery-input" 
                  className="hidden" 
                  onChange={handleImageUpload} 
                />

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-5 md:p-6 bg-gray-50/50 dark:bg-gray-800/40 text-center relative overflow-hidden transition-all">
                  {formData.image_url ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                      <div className="relative group mb-3">
                        <img src={formData.image_url} alt="Preview" className="h-40 max-w-full object-cover rounded-xl shadow-md border border-gray-200 dark:border-gray-700" />
                        <button 
                          type="button" 
                          onClick={() => setFormData({ ...formData, image_url: '', image_name: '', image_file: null })}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors"
                          title="ลบรูปภาพ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center text-emerald-600 dark:text-emerald-400 gap-1.5 text-sm font-bold mb-4">
                        <CheckCircle2 className="w-5 h-5" /> เลือกรูปภาพเรียบร้อยแล้ว
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => document.getElementById('camera-input')?.click()}
                          className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <Camera className="w-4 h-4 text-orange-500" /> ถ่ายใหม่
                        </button>
                        <button
                          type="button"
                          onClick={() => document.getElementById('gallery-input')?.click()}
                          className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <ImageIcon className="w-4 h-4 text-blue-500" /> เปลี่ยนรูป
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-orange-100 dark:bg-orange-950/50 rounded-full flex items-center justify-center mb-3 text-[#ff6600] border border-orange-200 dark:border-orange-800">
                        <Camera className="w-7 h-7" />
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-base mb-1">แนบรูปภาพหน้างาน</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 max-w-xs leading-relaxed">
                        ถ่ายรูปสดจากกล้อง หรือ เลือกรูปภาพจากคลัง เพื่อให้ AI และทีมกู้ภัยประเมินสถานการณ์ได้แม่นยำขึ้น
                      </p>

                      {/* Choice Buttons: Camera vs Upload */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-sm">
                        <button
                          type="button"
                          onClick={() => document.getElementById('camera-input')?.click()}
                          className="w-full py-3 px-4 bg-[#ff6600] hover:bg-orange-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />  ถ่ายรูปสด
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => document.getElementById('gallery-input')?.click()}
                          className="w-full py-3 px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-blue-500" /> อัปโหลดรูปภาพ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">ข้อมูลเพิ่มเติม (ถ้ามี)</label>
                <textarea 
                  className={`w-full bg-white dark:bg-gray-900 px-4 py-3 outline-none transition-all placeholder:text-gray-400 resize-none h-24 ${inputClass}`}
                  placeholder="ระบุจุดสังเกต หรือสิ่งที่ต้องการด่วน เช่น ยาประจำตัว, แพ้อาหาร..." 
                  value={formData.details}
                  onChange={(e) => setFormData({...formData, details: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                <Button type="button" variant="ghost" className="flex-1 px-4 py-3.5 text-xs sm:text-sm font-bold rounded-xl text-center leading-tight" onClick={() => router.back()}>ยกเลิก</Button>
                <Button 
                  type="button" 
                  variant="primary" 
                  className={`flex-1 px-4 py-3.5 text-xs sm:text-sm font-bold rounded-xl text-center leading-tight ${cooldownRemaining > 0 && !isProxyReport ? 'opacity-50 cursor-not-allowed bg-gray-400 border-gray-400 shadow-none text-white' : 'shadow-lg shadow-orange-500/30'}`} 
                  onClick={handleNext}
                  disabled={cooldownRemaining > 0 && !isProxyReport}
                >
                  ถัดไป (วิเคราะห์ความเสี่ยง)
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* Custom CSS for Toggle */}
      <style dangerouslySetInnerHTML={{__html: `
        .toggle-checkbox:checked {
          right: 0;
          border-color: #ff6600;
        }
        .toggle-checkbox:checked + .toggle-label {
          background-color: #ff6600;
        }
      `}} />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0b1325] rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl border border-orange-100 dark:border-orange-900/30 scale-100 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1 tracking-tight">รับเรื่องเรียบร้อยแล้ว</h3>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4">เจ้าหน้าที่กำลังดำเนินการ</p>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 mb-4 border border-orange-100 dark:border-orange-800/30">
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">หมายเลขเคสของคุณคือ</p>
              <p className="text-3xl font-black text-[#ff6600] mt-1">#{submittedCaseId}</p>
            </div>
            <p className="text-sm leading-relaxed break-words text-balance text-gray-600 dark:text-gray-400 mb-6">
              ระบบได้รับข้อมูลของคุณแล้ว เจ้าหน้าที่จะประเมินและรีบดำเนินการให้ความช่วยเหลือโดยเร็วที่สุด
            </p>
            
            <div className="space-y-2.5">
              {isLiff && (
                <Button 
                  type="button"
                  variant="primary" 
                  className="w-full py-3.5 text-sm font-bold rounded-xl bg-[#00B900] hover:bg-[#009900] text-white shadow-lg shadow-green-500/30 border border-green-600 flex items-center justify-center gap-2"
                  onClick={handleCloseLiff}
                >
                  💬 ปิดหน้าต่าง LINE (Close LINE)
                </Button>
              )}
              <Button 
                type="button"
                variant={isLiff ? "outline" : "primary"} 
                className={`w-full py-3 text-sm font-semibold rounded-xl ${!isLiff ? 'shadow-lg shadow-[#ff6600]/30' : ''}`}
                onClick={() => router.push(`/tracking/${submittedCaseId}`)}
              >
                ดูรายการขอความช่วยเหลือ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Triage Modal */}
      {showTriageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0b1325] rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl border border-orange-100 dark:border-orange-900/30 scale-100 animate-in zoom-in-95 duration-300">
            
            {triagePhase === 1 ? (
              <div className="flex flex-col items-center py-8">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 border-4 border-orange-200 dark:border-orange-900/50 rounded-full animate-ping opacity-75"></div>
                  <div className="absolute inset-0 border-4 border-[#ff6600] rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">🤖</div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">กำลังประเมินสถานการณ์...</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI Triage กำลังวิเคราะห์ข้อมูลและรูปภาพ</p>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">วิเคราะห์เสร็จสิ้น</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">ระบบจัดให้คุณอยู่ใน</p>
                
                <div className={`px-4 py-2 rounded-full font-bold text-white mb-2 ${getSeveritySolidColor(calculatedSeverity)} shadow-lg`}>
                  {getSeverityText(calculatedSeverity)}
                </div>
                
                {visionFeedback && (
                  <p className="text-sm text-gray-500 mb-2 text-center px-4 leading-relaxed bg-gray-50 dark:bg-gray-800/50 py-2 rounded-xl w-full border border-gray-100 dark:border-gray-800">
                    {visionFeedback}
                  </p>
                )}

                <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl p-3 mb-6 text-left text-sm space-y-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 mb-2">สรุปข้อมูลที่จะส่ง:</p>
                  
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 dark:text-slate-400 min-w-[70px]">ชื่อ:</span>
                    <span className="text-slate-900 dark:text-slate-100 text-right">{formData.name || '-'}</span>
                  </div>
                  
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 dark:text-slate-400 min-w-[70px]">เบอร์โทร:</span>
                    <span className="text-slate-900 dark:text-slate-100 text-right">{formData.phone || '-'}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 dark:text-slate-400 min-w-[70px]">จำนวนคน:</span>
                    <span className="text-slate-900 dark:text-slate-100 text-right">{formData.peopleCount || 1} คน</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 dark:text-slate-400 min-w-[70px]">รายละเอียด:</span>
                    <span className="text-slate-900 dark:text-slate-100 text-right break-words max-w-[180px] line-clamp-2">
                      {formData.details || '-'}
                    </span>
                  </div>
                </div>

                <Button 
                  type="button"
                  variant="primary" 
                  className="flex-1 min-w-fit px-4 py-3 text-[13px] sm:text-sm font-semibold rounded-xl text-center leading-tight break-words w-full shadow-lg shadow-red-500/30 bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  onClick={() => {
                    setShowTriageModal(false);
                    handleSubmit();
                  }}
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  🚨 ยืนยันการแจ้งเหตุ
                </Button>
                
                <button 
                  type="button" 
                  className="mt-4 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setShowTriageModal(false)}
                  disabled={isSubmitting}
                >
                  ยกเลิก / แก้ไขข้อมูล
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
};
