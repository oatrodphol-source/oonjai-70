'use client';
import React, { useState, useEffect } from 'react';
import { Stepper } from '@/components/ui/Stepper';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Camera, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const ReportStepForm = () => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  
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
    locationReady: false,
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState('');

  useEffect(() => {
    const lastReport = localStorage.getItem('oonjai_last_report');
    if (lastReport) {
      try {
        const parsed = JSON.parse(lastReport);
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

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
  };

  const handleNext = () => {
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
    if (step === 1) setStep(2);
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
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
        setFormData({ ...formData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!validatePhone(formData.phone)) {
      setPhoneError('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักเท่านั้น');
      setStep(1);
      return;
    }
  
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          type: formData.type,
          peopleCount: formData.peopleCount,
          bedridden: formData.bedridden ? 1 : 0,
          elderly: formData.elderly ? 1 : 0,
          waterLevel: formData.waterLevel,
          details: formData.details.trim(),
          latitude: formData.latitude,
          longitude: formData.longitude,
          image_url: formData.image_url || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      const data = await response.json();
      const caseId = data.id || data.case_id || '456';
      setCreatedCaseId(caseId);
      
      localStorage.setItem('oonjai_last_report', JSON.stringify({ caseId: caseId, timestamp: Date.now() }));
      localStorage.setItem('oonjai_user_phone', formData.phone);
      localStorage.setItem('oonjai_last_report_time', Date.now().toString());
      
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Submission error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "text-base border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl";

  return (
    <div className="p-4 sm:p-6 w-full max-w-lg mx-auto pb-24 space-y-6">
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 shadow-sm border border-orange-200 dark:border-orange-800">
          <AlertTriangle className="w-8 h-8 text-[#ff6600]" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">แจ้งเหตุฉุกเฉิน</h2>
        <p className="text-base text-gray-500 dark:text-gray-400">กรอกข้อมูลเพื่อให้เจ้าหน้าที่ช่วยเหลือได้รวดเร็วและแม่นยำที่สุด</p>
      </div>

      <Stepper currentStep={step} totalSteps={2} labels={['ข้อมูลเบื้องต้น', 'ยืนยันข้อมูล']} />

      <Card className="mt-8 border border-gray-200 dark:border-[#ff6600]/20 shadow-xl shadow-orange-500/10 bg-white dark:bg-[#0b1325] relative z-10 overflow-hidden rounded-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff6600] to-orange-400"></div>
        <div className="p-6">
          
          {cooldownRemaining > 0 && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl animate-pulse text-center shadow-sm">
              <p className="text-red-600 dark:text-red-400 font-bold text-sm sm:text-base">
                ⏳ ระบบกำลังดำเนินการเคสของคุณ กรุณารอ {formatTime(cooldownRemaining)} นาทีก่อนแจ้งเหตุครั้งถัดไป
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Location Section */}
              <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">พิกัดสถานที่เกิดเหตุ (GPS)</label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant={formData.locationReady ? "primary" : "outline"} 
                    className={`w-full flex justify-center gap-2 py-6 text-base font-medium transition-all ${formData.locationReady ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20' : 'hover:border-[#ff6600] hover:text-[#ff6600]'}`}
                    onClick={getLocation}
                  >
                    <MapPin className={`w-5 h-5 ${formData.locationReady ? 'text-white' : ''}`} />
                    {formData.locationReady ? 'ดึงตำแหน่งสำเร็จ (พร้อมส่ง)' : 'กดเพื่อดึงพิกัด GPS ปัจจุบัน'}
                  </Button>
                </div>
                {!formData.locationReady && (
                  <p className="text-xs text-[#ff6600] flex items-center gap-1.5 mt-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> จำเป็นต้องระบุตำแหน่งเพื่อให้เจ้าหน้าที่ไปถูกที่
                  </p>
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

              {/* Incident Type */}
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
                <Input 
                  label="จำนวนผู้ประสบภัย (คน) *" 
                  type="number" 
                  min={1} 
                  value={formData.peopleCount}
                  onChange={(e) => setFormData({...formData, peopleCount: parseInt(e.target.value) || 1})}
                  className={inputClass}
                />
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
                
                <label className="flex items-center justify-between cursor-pointer group">
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

                <label className="flex items-center justify-between cursor-pointer group">
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

              {/* Photo Upload & Details */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">รูปภาพหน้างาน (ถ้ามี)</label>
                <label className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-gray-800 transition-all group overflow-hidden relative">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  {formData.image_url ? (
                    <div className="flex flex-col items-center">
                      <img src={formData.image_url} alt="Preview" className="h-32 object-contain mb-3 rounded-lg shadow-sm" />
                      <div className="flex items-center text-emerald-600 gap-1 text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" /> อัปโหลดแล้ว (คลิกเพื่อเปลี่ยน)
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mb-3 group-hover:bg-orange-100 dark:group-hover:bg-gray-700 transition-colors">
                        <Camera className="w-8 h-8 text-gray-400 group-hover:text-[#ff6600] transition-colors" />
                      </div>
                      <span className="text-sm font-medium group-hover:text-[#ff6600] transition-colors">ถ่ายรูป หรือ อัปโหลด</span>
                      <p className="text-xs text-gray-400 mt-1">ช่วยให้ประเมินสถานการณ์ได้แม่นยำขึ้น</p>
                    </>
                  )}
                </label>
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

              <div className="flex gap-4 pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                <Button type="button" variant="ghost" className="w-1/3 py-6 font-medium" onClick={() => router.back()}>ยกเลิก</Button>
                <Button 
                  type="button" 
                  variant="primary" 
                  className={`w-2/3 py-6 font-bold text-lg ${cooldownRemaining > 0 ? 'opacity-50 cursor-not-allowed bg-gray-400 border-gray-400 shadow-none text-white' : 'shadow-lg shadow-orange-500/30'}`} 
                  onClick={handleNext}
                  disabled={cooldownRemaining > 0}
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="bg-gray-50 dark:bg-[#0b1325] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-inner">
                <h3 className="font-bold text-xl mb-5 text-[#ff6600] border-b border-orange-200 dark:border-orange-900/50 pb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> ตรวจสอบข้อมูลก่อนส่ง
                </h3>
                
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-3 gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
                    <span className="text-gray-500 dark:text-gray-400">ชื่อ-นามสกุล</span>
                    <span className="col-span-2 font-semibold text-gray-900 dark:text-white">{formData.name || '-'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
                    <span className="text-gray-500 dark:text-gray-400">เบอร์โทรศัพท์</span>
                    <span className="col-span-2 font-semibold text-gray-900 dark:text-white">{formData.phone || '-'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
                    <span className="text-gray-500 dark:text-gray-400">ประเภท</span>
                    <span className="col-span-2 font-semibold text-[#ff6600]">{formData.type}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
                    <span className="text-gray-500 dark:text-gray-400">จำนวนคน</span>
                    <span className="col-span-2 font-semibold text-gray-900 dark:text-white">{formData.peopleCount} คน</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
                    <span className="text-gray-500 dark:text-gray-400">กลุ่มเปราะบาง</span>
                    <span className="col-span-2 font-semibold text-gray-900 dark:text-white flex flex-col gap-1">
                      {formData.bedridden && <span className="text-orange-600 bg-orange-100 px-2 py-0.5 rounded text-xs w-max">ผู้ป่วยติดเตียง</span>}
                      {formData.elderly && <span className="text-orange-600 bg-orange-100 px-2 py-0.5 rounded text-xs w-max">เด็กเล็ก/ผู้สูงอายุ</span>}
                      {!formData.bedridden && !formData.elderly && <span>ไม่มี</span>}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
                    <span className="text-gray-500 dark:text-gray-400">ระดับน้ำ</span>
                    <span className="col-span-2 font-semibold text-red-600">{formData.waterLevel}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
                    <span className="text-gray-500 dark:text-gray-400">พิกัด GPS</span>
                    <span className="col-span-2 font-semibold flex items-center gap-1">
                      {formData.locationReady ? (
                        <span className="text-emerald-600 flex items-center gap-1"><MapPin className="w-4 h-4"/> พร้อมส่ง</span>
                      ) : (
                        <span className="text-red-500">ยังไม่ระบุ</span>
                      )}
                    </span>
                  </div>
                  {formData.image_url && (
                    <div className="grid grid-cols-3 gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
                      <span className="text-gray-500 dark:text-gray-400">รูปถ่ายหน้างาน</span>
                      <span className="col-span-2 font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4"/> แนบไฟล์แล้ว
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" className="w-1/3 py-6 font-medium" onClick={handleBack} disabled={isSubmitting}>แก้ไข</Button>
                <div className="w-2/3 flex flex-col items-center justify-center">
                  <Button 
                    type="button"
                    variant="primary" 
                    className={`w-full py-6 font-bold text-lg shadow-lg ${cooldownRemaining > 0 ? 'opacity-50 cursor-not-allowed bg-gray-400 border-gray-400 shadow-none' : 'shadow-[#ff6600]/30'}`} 
                    onClick={handleSubmit} 
                    isLoading={isSubmitting}
                    disabled={isSubmitting || cooldownRemaining > 0}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        กำลังส่งข้อมูล...
                      </div>
                    ) : cooldownRemaining > 0 ? (
                      `รอ ${formatTime(cooldownRemaining)} นาที`
                    ) : 'ยืนยันการแจ้งเหตุ'}
                  </Button>
                </div>
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
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">แจ้งเหตุสำเร็จ!</h3>
            <p className="text-base text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              ระบบได้รับข้อมูลของคุณแล้ว เจ้าหน้าที่จะประเมินและรีบดำเนินการให้ความช่วยเหลือโดยเร็วที่สุด
            </p>
            <Button 
              type="button"
              variant="primary" 
              className="w-full py-4 text-lg font-bold shadow-lg shadow-[#ff6600]/30"
              onClick={() => router.push(`/history`)}
            >
              ดูรายการขอความช่วยเหลือ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
