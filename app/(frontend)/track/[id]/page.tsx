'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TrackPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rating Form State
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    
    fetchCaseData();

    // Set up Realtime subscription
    const channel = supabase
      .channel('cases_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cases',
          filter: `id=eq.${caseId}`,
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          setData(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId]);

  const fetchCaseData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (error) throw error;
      setData(data);
      if (data?.rating) {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถดึงข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      alert('กรุณาเลือกคะแนน (1-5 ดาว)');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('cases')
        .update({
          rating: rating,
          feedback: feedback,
        })
        .eq('id', caseId);

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">ไม่พบข้อมูล</h2>
          <p className="text-gray-600 text-sm">{error || 'ไม่พบเคสที่คุณกำลังค้นหา'}</p>
        </div>
      </div>
    );
  }

  // Determine active status step
  let stepIndex = 0;
  if (data.status === 'รอดำเนินการ') stepIndex = 0;
  else if (data.status === 'กำลังช่วยเหลือ') stepIndex = 1;
  else if (data.status === 'เสร็จสิ้นแล้ว') stepIndex = 2;
  else stepIndex = 0; // Default or other statuses

  return (
    <div className="min-h-screen bg-gray-50 pb-12 pt-6 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ติดตามสถานะการช่วยเหลือ</h1>
          <p className="text-gray-500 text-sm">รหัสอ้างอิง: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{caseId}</span></p>
        </div>

        {/* Case Details Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-50 px-5 py-4 border-b border-blue-100 flex justify-between items-center">
            <span className="font-semibold text-blue-900">รายละเอียดเคส</span>
            <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium">
              {data.type || 'ไม่ระบุประเภท'}
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">สถานที่ / รายละเอียด</p>
              <p className="text-gray-800 text-sm leading-relaxed">{data.details || '-'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">จำนวนผู้ประสบภัย</p>
                <p className="text-gray-800 font-semibold">{data.people_count || 1} คน</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">ระดับความรุนแรง</p>
                <div className="flex space-x-1 mt-0.5">
                  {[1,2,3,4,5].map((level) => (
                    <div 
                      key={level} 
                      className={`h-2 w-full rounded-full ${level <= (data.severity || 1) ? (data.severity >= 4 ? 'bg-red-500' : 'bg-orange-400') : 'bg-gray-200'}`}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-6">สถานะปัจจุบัน</h3>
          
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-200"></div>

            <div className="space-y-6">
              {/* Step 1: รอดำเนินการ */}
              <div className="relative flex items-start">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center relative z-10 
                  ${stepIndex >= 0 ? 'bg-red-100 border-2 border-red-500 text-red-500' : 'bg-gray-100 border-2 border-gray-200 text-gray-400'}
                  ${stepIndex === 0 ? 'ring-4 ring-red-50' : ''}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className={`font-semibold text-sm ${stepIndex >= 0 ? 'text-gray-900' : 'text-gray-500'}`}>รอดำเนินการ</h4>
                  {stepIndex === 0 && <p className="text-xs text-red-500 mt-1 font-medium animate-pulse">กำลังรออาสาสมัครรับเคส...</p>}
                </div>
              </div>

              {/* Step 2: กำลังช่วยเหลือ */}
              <div className="relative flex items-start">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center relative z-10 
                  ${stepIndex >= 1 ? 'bg-yellow-100 border-2 border-yellow-500 text-yellow-600' : 'bg-gray-100 border-2 border-gray-200 text-gray-400'}
                  ${stepIndex === 1 ? 'ring-4 ring-yellow-50' : ''}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className={`font-semibold text-sm ${stepIndex >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>กำลังช่วยเหลือ</h4>
                  {stepIndex === 1 && (
                    <div className="mt-2 bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                      <p className="text-xs text-yellow-800 mb-1">เจ้าหน้าที่กำลังเดินทางไปยังจุดเกิดเหตุ</p>
                      {data.assigned_volunteer_name && (
                        <p className="text-xs font-semibold text-yellow-900">ผู้รับผิดชอบ: {data.assigned_volunteer_name}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: เสร็จสิ้นแล้ว */}
              <div className="relative flex items-start">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center relative z-10 
                  ${stepIndex >= 2 ? 'bg-green-100 border-2 border-green-500 text-green-600' : 'bg-gray-100 border-2 border-gray-200 text-gray-400'}
                  ${stepIndex === 2 ? 'ring-4 ring-green-50' : ''}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className={`font-semibold text-sm ${stepIndex >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>เสร็จสิ้นแล้ว</h4>
                  {stepIndex === 2 && <p className="text-xs text-green-600 mt-1 font-medium">ภารกิจช่วยเหลือสำเร็จลุล่วง</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rating Form Card */}
        {data.status === 'เสร็จสิ้นแล้ว' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden transition-all duration-500 opacity-100 transform translate-y-0">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">ขอบคุณที่ประเมินการช่วยเหลือ</h3>
                <p className="text-sm text-gray-500">ทุกคะแนนของคุณคือกำลังใจให้ทีมอาสาสมัคร</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">ให้คะแนนอาสาสมัคร</h3>
                  <p className="text-sm text-gray-500 mt-1">ความพึงพอใจต่อการช่วยเหลือครั้งนี้</p>
                </div>
                
                {/* Stars */}
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <svg 
                        className={`w-10 h-10 transition-colors ${star <= (hoverRating || rating) ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-200'}`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>

                {/* Comment Box */}
                <div>
                  <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">ข้อเสนอแนะเพิ่มเติม (ถ้ามี)</label>
                  <textarea
                    id="feedback"
                    rows={3}
                    className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border outline-none transition-shadow"
                    placeholder="เล่าประสบการณ์หรือคำติชมของคุณ..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  ></textarea>
                </div>

                <button
                  onClick={handleRatingSubmit}
                  disabled={isSubmitting || rating === 0}
                  className={`w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white 
                    ${(isSubmitting || rating === 0) ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all'}`}
                >
                  {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งผลการประเมิน'}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
