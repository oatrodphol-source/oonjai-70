'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Phone, Building, CheckCircle2, Star, Trophy, MessageSquareHeart, ChevronLeft, ChevronRight } from 'lucide-react';
import UnifiedUserForm from '@/components/backend/UnifiedUserForm';

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    rescueUnit: '',
    username: ''
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string>('volunteer');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // --- State สำหรับสถิติและรีวิว ---
  const [stats, setStats] = useState({ totalResolved: 0, averageRating: 0 });
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // 🌟 State สำหรับระบบแบ่งหน้า (Pagination)
  const [currentPage, setCurrentPage] = useState(1);
  const feedbacksPerPage = 3; // กำหนดจำนวนรีวิวที่จะแสดงต่อ 1 หน้า

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oonjai_user');
      if (stored) {
        const user = JSON.parse(stored);
        const uid = user.uid || user.id;
        setUserId(uid);
        setRole(user.role || 'volunteer');
        setFormData({
          fullName: user.name || '',
          phone: user.phone || '',
          rescueUnit: user.rescueUnit || '',
          username: user.username || ''
        });
        
        if (uid) {
          fetchUserStats(uid);
        } else {
          setStatsLoading(false);
        }
      } else {
        setStatsLoading(false);
      }
    } catch (e) {
      console.error('Error loading profile:', e);
      setStatsLoading(false);
    }
  }, []);

  const fetchUserStats = async (uid: string) => {
      setStatsLoading(true);
      try {
          const { data, error } = await supabase
              .from('cases')
              .select('rating, feedback, created_at')
              .eq('volunteer_id', uid)
              .eq('status', 'resolved')
              .order('created_at', { ascending: false });

          if (error) throw error;

          if (data && data.length > 0) {
              const totalResolved = data.length;
              
              const ratedCases = data.filter(c => c.rating && c.rating > 0);
              let averageRating = 0;
              if (ratedCases.length > 0) {
                  const sum = ratedCases.reduce((acc, curr) => acc + (curr.rating || 0), 0);
                  averageRating = sum / ratedCases.length;
              }

              // 🌟 เก็บรีวิวทั้งหมดที่มีข้อความ (ไม่ต้องตัด slice แล้ว)
              const validFeedbacks = data.filter(c => c.feedback && c.feedback.trim() !== '');

              setStats({ totalResolved, averageRating });
              setFeedbacks(validFeedbacks);
          }
      } catch (err) {
          console.error("Error fetching stats:", err);
      } finally {
          setStatsLoading(false);
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const val = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: val }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      alert("ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");
      return;
    }
    
    setLoading(true);
    setSuccess(false);
    
    try {
      const collectionName = role === 'admin' ? 'admins' : 'volunteers';
      
      await supabase.from(collectionName).update({
        name: formData.fullName,
        phone: formData.phone,
        agency: formData.rescueUnit,
        updated_at: new Date().toISOString()
      }).eq('id', userId);
      
      const stored = localStorage.getItem('oonjai_user');
      if (stored) {
        const user = JSON.parse(stored);
        user.name = formData.fullName;
        user.phone = formData.phone;
        user.rescueUnit = formData.rescueUnit;
        localStorage.setItem('oonjai_user', JSON.stringify(user));
        
        window.dispatchEvent(new Event('localCasesUpdated'));
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  // 🌟 คำนวณข้อมูลสำหรับระบบแบ่งหน้า (Pagination)
  const indexOfLastFeedback = currentPage * feedbacksPerPage;
  const indexOfFirstFeedback = indexOfLastFeedback - feedbacksPerPage;
  const currentFeedbacks = feedbacks.slice(indexOfFirstFeedback, indexOfLastFeedback);
  const totalPages = Math.ceil(feedbacks.length / feedbacksPerPage);

  const handleNextPage = () => {
      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
      if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-24 animate-in fade-in duration-300 space-y-6">
      
      <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>👤</span> โปรไฟล์และผลงาน
          </h1>
      </div>

      {/* ส่วนหัว: สรุปสถิติ (Hero Section) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                  <Trophy className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                  <p className="text-orange-100 font-medium mb-1">ช่วยเหลือสำเร็จ</p>
                  <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black">{statsLoading ? '-' : stats.totalResolved}</span>
                      <span className="text-orange-100 font-medium text-lg">เคส</span>
                  </div>
              </div>
          </div>

          <div className="bg-white dark:bg-[#151b2c] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
              <div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium mb-1 text-sm">คะแนนความพึงพอใจเฉลี่ย</p>
                  <div className="flex items-center gap-3">
                      <span className="text-4xl font-black text-gray-900 dark:text-white">
                          {statsLoading ? '-' : stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                      </span>
                      <div className="flex flex-col">
                          <div className="flex text-yellow-400">
                              {[1, 2, 3, 4, 5].map(star => (
                                  <Star 
                                      key={star} 
                                      className={`w-5 h-5 ${star <= Math.round(stats.averageRating) ? 'fill-yellow-400' : 'text-gray-200 dark:text-gray-700'}`} 
                                  />
                              ))}
                          </div>
                          <span className="text-xs text-gray-400 mt-0.5">จากผู้ประสบภัย</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* 🌟 ส่วนรีวิว (Feedback Section พร้อมระบบแบ่งหน้า) */}
      {!statsLoading && feedbacks.length > 0 && (
          <div className="bg-white dark:bg-[#151b2c] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <MessageSquareHeart className="w-5 h-5 text-pink-500" />
                  เสียงตอบรับจากผู้ประสบภัย
              </h3>
              
              <div className="space-y-4 min-h-[250px]">
                  {currentFeedbacks.map((fb, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 animate-in fade-in duration-500">
                          <div className="flex items-center justify-between mb-2">
                              <div className="flex text-yellow-400">
                                  {[...Array(fb.rating || 5)].map((_, i) => (
                                      <Star key={i} className="w-3.5 h-3.5 fill-yellow-400" />
                                  ))}
                              </div>
                              <span className="text-xs text-gray-400 font-medium">
                                  {new Date(fb.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 text-sm italic">"{fb.feedback}"</p>
                      </div>
                  ))}
              </div>

              {/* 🌟 ปุ่มควบคุมการแบ่งหน้า (Pagination Controls) */}
              {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <button 
                          onClick={handlePrevPage} 
                          disabled={currentPage === 1}
                          className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                      >
                          <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
                      </button>
                      
                      <span className="text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-3 py-1.5 rounded-full">
                          {currentPage} / {totalPages}
                      </span>
                      
                      <button 
                          onClick={handleNextPage} 
                          disabled={currentPage === totalPages}
                          className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                      >
                          ถัดไป <ChevronRight className="w-4 h-4" />
                      </button>
                  </div>
              )}
          </div>
      )}

      {/* ส่วนฟอร์ม: ตั้งค่าบัญชี (อันเดิม) */}
      <div className="bg-white dark:bg-[#151b2c] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 sm:p-8">
        
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span>⚙️</span> แก้ไขข้อมูลส่วนตัว
        </h3>

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            <p className="text-emerald-700 dark:text-emerald-400 font-bold text-base">บันทึกข้อมูลเรียบร้อยแล้ว ✅</p>
          </div>
        )}

        {userId ? (
          <UnifiedUserForm 
            initialData={{ 
              id: userId as any, 
              role: role, 
              name: formData.fullName, 
              phone: formData.phone, 
              agency: formData.rescueUnit, 
              username: formData.username 
            }}
            isEditing={true}
            isAdminAccess={true}
            isProfile={true}
            onSuccess={() => {
              setSuccess(true);
              setTimeout(() => setSuccess(false), 3000);
            }}
          />
        ) : (
          <p className="text-gray-500 text-center py-4">กำลังโหลดข้อมูล...</p>
        )}
      </div>
    </div>
  );
}