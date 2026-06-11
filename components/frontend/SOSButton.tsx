'use client';
import React, { useState, useEffect } from 'react';
import { Radio, AlertCircle, CheckCircle2, Navigation, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const SOSButton = () => {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'locating' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    // Check if user has an active SOS from the last 10 minutes to auto-redirect
    const lastSOS = localStorage.getItem('oonjai_last_sos');
    if (lastSOS) {
      try {
        const parsed = JSON.parse(lastSOS);
        const now = Date.now();
        if (now - parsed.timestamp < 10 * 60 * 1000 && parsed.caseId) {
          router.replace(`/tracking/${parsed.caseId}`);
        }
      } catch (e) {
        console.warn('Error parsing local storage:', e);
      }
    }
  }, [router]);

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

  const handleSOSClick = () => {
    setIsLoading(true);
    // 1. Check Geolocation support
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

    // 2. Get Geolocation
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        setStatus('sending');

        try {
          // 3. Send SOS data to API
          const response = await fetch('/api/sos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              lat: latitude,
              lng: longitude
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setStatus('success');
            
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate([100, 100, 100]); // Success pattern
            }

            const caseId = data.case_id || data.id;
            if (caseId) {
              localStorage.setItem('oonjai_last_sos', JSON.stringify({ caseId: caseId, timestamp: Date.now() }));
              if (data.phone) {
                localStorage.setItem('oonjai_user_phone', data.phone);
              }
              localStorage.setItem('oonjai_last_report_time', Date.now().toString());
            }

            // Redirect instantly to history
            setIsLoading(false);
            router.push('/history');
          } else {
            const errData = await response.json().catch(() => ({}));
            setIsLoading(false);
            throw new Error(errData.error || 'ไม่สามารถเชื่อมต่อหลังบ้านได้');
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
    <div className="flex flex-col items-center justify-center p-6 font-sans">
      
      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-2xl font-bold tracking-wider text-[#ff6600] flex items-center justify-center gap-2 transition-all duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff6600] animate-ping"></span>
          EMERGENCY SOS
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">กดหนึ่งครั้งเพื่อส่งสัญญาณขอความช่วยเหลือด่วน ระบบจะส่งพิกัดของคุณอัตโนมัติ</p>
      </div>

      {/* Cooldown Banner */}
      {cooldownRemaining > 0 && (
        <div className="text-center mb-6">
          <p className="text-sm text-red-500 font-bold animate-pulse px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-full inline-block shadow-sm">
            ⏳ กรุณารอ {formatTime(cooldownRemaining)} นาที
          </p>
        </div>
      )}

      {/* SOS Button Container */}
      <div className="relative flex items-center justify-center my-8">
        
        {/* Background Ripple Animation */}
        {status === 'idle' && cooldownRemaining === 0 && (
          <div className="absolute w-72 h-72 rounded-full bg-red-500/10 dark:bg-red-500/20 animate-ping" style={{ animationDuration: '2s' }}></div>
        )}
        {(status === 'locating' || status === 'sending') && (
          <div className="absolute w-72 h-72 rounded-full bg-orange-500/20 dark:bg-orange-500/30 animate-pulse"></div>
        )}

        {/* Main Button */}
        <button
          disabled={isLoading || status === 'success' || cooldownRemaining > 0}
          onClick={handleSOSClick}
          className={`relative z-10 w-64 h-64 rounded-full flex flex-col items-center justify-center border-[12px] shadow-2xl transition-all duration-300 transform active:scale-95 ${
            cooldownRemaining > 0
              ? 'bg-gray-400 border-gray-300 shadow-none text-white cursor-not-allowed opacity-80'
              : status === 'success' 
              ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/40 text-white' 
              : status === 'error'
              ? 'bg-red-600 border-red-500 shadow-red-600/40 text-white'
              : isLoading
              ? 'bg-orange-500 border-orange-400 shadow-orange-500/40 text-white cursor-wait'
              : 'bg-red-600 border-[#0b1325] shadow-red-600/50 hover:bg-red-500 text-white'
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
