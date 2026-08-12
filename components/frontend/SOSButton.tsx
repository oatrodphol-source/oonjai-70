'use client';
import React, { useState, useEffect } from 'react';
import { Radio, AlertCircle, CheckCircle2, Navigation, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};

export const SOSButton = () => {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'locating' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize LIFF profile if available
  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) return;
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });
      } catch (e) {}
    };
    initLiff();
  }, []);

  const handleSOSClick = async () => {
    let liffUserId = '';
    let liffDisplayName = 'SOS User (Auto)';
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (liffId) {
        const liff = (await import('@line/liff')).default;
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          if (profile?.userId) {
            liffUserId = profile.userId;
            liffDisplayName = profile.displayName || liffDisplayName;
          }
        }
      }
    } catch (e) {}

    setIsLoading(true);
    // Check Geolocation support
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('เบราว์เซอร์หรืออุปกรณ์ของคุณไม่รองรับการดึงพิกัด GPS');
      setIsLoading(false);
      return;
    }

    // Trigger vibration feedback
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(200);
    }

    setStatus('locating');

    // Get Geolocation & POST to API
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Check 10-minute location geofencing: if same area <= 500m, silently redirect to tracking page
        const lastReportDataStr = typeof window !== 'undefined' ? localStorage.getItem('oonjai_last_report_data') : null;
        if (lastReportDataStr) {
          try {
            const lastReport = JSON.parse(lastReportDataStr);
            const elapsed = Date.now() - lastReport.timestamp;
            if (elapsed < 10 * 60 * 1000 && lastReport.lat && lastReport.lng) {
              const dist = getDistanceKm(latitude, longitude, lastReport.lat, lastReport.lng);
              if (dist <= 0.5) { // Same area <= 500m
                const targetCaseId = lastReport.caseId || localStorage.getItem('oonjai_active_case_id');
                if (targetCaseId) {
                  setIsLoading(false);
                  router.push(`/tracking/${targetCaseId}`);
                  return;
                }
              }
            }
          } catch (e) {}
        }

        setStatus('sending');

        try {
          const sosPayload = {
            name: liffDisplayName,
            reporter_name: liffUserId || undefined,
            phone: '-',
            type: 'SOS ด่วน',
            severity: 5,
            peopleCount: 1,
            waterLevel: '-',
            bedridden: 0,
            elderly: 0,
            latitude: latitude,
            longitude: longitude,
            details: "กดปุ่ม SOS ฉุกเฉิน ดึงพิกัด GPS: " + latitude + ", " + longitude
          };

          const res = await fetch('/api/cases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sosPayload)
          });

          if (!res.ok) {
            throw new Error('Failed to send SOS');
          }

          const data = await res.json();

          if (data) {
            setStatus('success');
            
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate([100, 100, 100]); // Success pattern
            }

            const caseId = data.case_number ? String(data.case_number).padStart(3, '0') : String(data.id).padStart(3, '0');
            if (caseId) {
              localStorage.setItem('oonjai_last_sos', JSON.stringify({ caseId: caseId, timestamp: Date.now() }));
              if (data.phone) {
                localStorage.setItem('oonjai_user_phone', data.phone);
              }
              localStorage.setItem('oonjai_last_report_data', JSON.stringify({
                timestamp: Date.now(),
                caseId: caseId,
                lat: latitude,
                lng: longitude,
                type: 'sos'
              }));
              localStorage.setItem('oonjai_active_case_id', String(caseId));
              
              try {
                const newCaseId = caseId;
                const existingCases = JSON.parse(localStorage.getItem('oonjai_my_cases') || '[]');
                if (!existingCases.includes(newCaseId)) {
                  existingCases.push(newCaseId);
                  localStorage.setItem('oonjai_my_cases', JSON.stringify(existingCases));
                }
                
                // Dispatch a custom event so the History page can listen and refresh immediately
                window.dispatchEvent(new Event('localCasesUpdated'));
              } catch (error) {
                console.error("🔥 FAILED TO SAVE LOCAL STORAGE:", error);
              }
            }

            // Show toast and redirect directly to tracking page
            setIsLoading(false);
            toast.success(`ส่งข้อมูลสำเร็จ! ระบบได้รับเคสหมายเลข #${caseId} ของคุณแล้ว`, {
              duration: 5000,
            });
            router.push(`/tracking/${caseId}`);
          } else {
            setIsLoading(false);
            throw new Error('ไม่สามารถบันทึกข้อมูลได้');
          }
        } catch (error: any) {
          setIsLoading(false);
          setStatus('error');
          setErrorMessage(error.message || 'ไม่สามารถเชื่อมต่อหลังบ้านได้');
        }
      },
      (error) => {
        setIsLoading(false);
        setStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage('กรุณาเปิดสิทธิ์ให้เข้าถึงพิกัดตำแหน่ง (GPS) เพื่อแจ้งเหตุ SOS');
        } else {
          setErrorMessage('ไม่สามารถค้นหาตำแหน่งพิกัดของคุณได้');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-6 font-sans w-full">
      
      {/* Title */}
      <div className="text-center mb-6 md:mb-12">
        <h1 className="text-xl sm:text-2xl font-bold tracking-wider text-[#ff6600] flex items-center justify-center gap-2 transition-all duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff6600] animate-ping"></span>
          EMERGENCY SOS
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">กดหนึ่งครั้งเพื่อส่งสัญญาณขอความช่วยเหลือด่วน ระบบจะส่งพิกัดของคุณอัตโนมัติ</p>
      </div>

      {/* SOS Button Container */}
      <div className="relative flex items-center justify-center my-4 sm:my-8">
        
        {/* Background Ripple Animation */}
        {status === 'idle' && (
          <div className="absolute w-72 h-72 rounded-full bg-red-500/10 dark:bg-red-500/20 animate-ping" style={{ animationDuration: '2s' }}></div>
        )}
        {(status === 'locating' || status === 'sending') && (
          <div className="absolute w-72 h-72 rounded-full bg-orange-500/20 dark:bg-orange-500/30 animate-pulse"></div>
        )}

        {/* Main Button */}
        <button
          disabled={isLoading || status === 'success'}
          onClick={handleSOSClick}
          className={`relative z-10 w-64 h-64 md:w-80 md:h-80 rounded-full flex flex-col items-center justify-center border-[12px] shadow-[0_20px_50px_rgba(255,102,0,0.3)] transition-all duration-300 transform active:scale-95 ${
            status === 'success' 
              ? 'bg-emerald-500 border-emerald-400 shadow-[0_20px_50px_rgba(16,185,129,0.4)] text-white' 
              : status === 'error'
              ? 'bg-red-600 border-red-500 shadow-[0_20px_50px_rgba(220,38,38,0.4)] text-white'
              : isLoading
              ? 'bg-orange-500 border-orange-400 shadow-[0_20px_50px_rgba(249,115,22,0.4)] text-white cursor-wait'
              : 'bg-red-600 border-[#0b1325] shadow-[0_20px_50px_rgba(220,38,38,0.5)] hover:bg-red-500 text-white'
          }`}
        >
          {isLoading && status !== 'success' && (
            <>
              <Navigation className="w-16 h-16 animate-pulse mb-2" />
              <span className="text-xl font-bold tracking-wide">กำลังดำเนินการ...</span>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 mb-2" />
              <span className="text-xl font-bold tracking-wide">ส่งข้อมูลสำเร็จ!</span>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-16 h-16 animate-bounce mb-2" />
              <span className="text-xl font-bold tracking-wide">เกิดข้อผิดพลาด</span>
            </>
          )}

          {status === 'idle' && (
            <>
              <Bell className="w-24 h-24 mb-2 drop-shadow-lg" fill="currentColor" />
              <span className="text-5xl font-black tracking-widest drop-shadow-lg">SOS</span>
              <span className="text-sm font-bold uppercase tracking-widest mt-2 opacity-90 drop-shadow-lg">Press for Help</span>
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {status === 'error' && errorMessage && (
        <div className="mt-4 px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium animate-in slide-in-from-bottom-2 text-center max-w-sm transition-all duration-200">
          {errorMessage}
        </div>
      )}

      {/* Success Message */}
      {status === 'success' && (
        <div className="mt-8 text-emerald-600 dark:text-emerald-400 font-bold animate-pulse text-sm text-center transition-all duration-200">
          ระบบได้บันทึกพิกัดของคุณและส่งไปยังหน่วยกู้ภัยแล้ว<br/>เจ้าหน้าที่กำลังดำเนินการ
        </div>
      )}

    </div>
  );
};
