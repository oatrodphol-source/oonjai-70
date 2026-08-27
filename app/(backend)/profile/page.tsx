'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Phone, Building, CheckCircle2, Star, Trophy, MessageSquareHeart, ChevronLeft, ChevronRight, FileEdit, Settings } from 'lucide-react';
import UnifiedUserForm from '@/components/backend/UnifiedUserForm';
import { DashboardHeader } from '@/components/backend/DashboardHeader';

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
  const feedbacksPerPage = 3;

  const [profileUserData, setProfileUserData] = useState<any>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const stored = localStorage.getItem('oonjai_user');
        if (stored) {
          const user = JSON.parse(stored);
          const uid = user.uid || user.id;
          const uRole = user.role || 'volunteer';
          setUserId(uid);
          setRole(uRole);

          const collectionName = uRole === 'admin' ? 'admins' : 'volunteers';
          const { data: dbUser } = await supabase
            .from(collectionName)
            .select('*')
            .eq('id', uid)
            .single();

          if (dbUser) {
            setProfileUserData({
              id: dbUser.id,
              role: uRole,
              name: dbUser.name || user.name || '',
              phone: dbUser.phone || user.phone || '',
              agency: dbUser.agency || user.rescueUnit || '',
              province: dbUser.province || 'ปทุมธานี',
              address: dbUser.address || '',
              skills_equipment: dbUser.skills_equipment || '',
              username: dbUser.username || user.username || '',
            });
          } else {
            setProfileUserData({
              id: uid,
              role: uRole,
              name: user.name || '',
              phone: user.phone || '',
              agency: user.rescueUnit || '',
              province: 'ปทุมธานี',
              address: '',
              skills_equipment: '',
              username: user.username || '',
            });
          }

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
    };

    fetchProfileData();
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
    <>
      <DashboardHeader title="ตั้งค่าบัญชี" />
      <div className="w-full max-w-4xl mx-auto py-4 sm:py-6 pb-32 md:pb-10 space-y-6 px-3 sm:px-6 max-w-[100vw] overflow-x-hidden animate-in fade-in duration-300">
        
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-6 h-6 text-orange-500 shrink-0" />
            <span>โปรไฟล์และผลงาน</span>
          </h1>
        </div>

        {/* PROFILE INCOMPLETE REMINDER BANNER FOR VOLUNTEERS */}
        {role === 'volunteer' && profileUserData && (!profileUserData.address || !profileUserData.skills_equipment) && (
          <div className="bg-amber-500/15 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm font-bold text-lg">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-amber-800 dark:text-amber-300">
                กรุณากรอกข้อมูลโปรไฟล์เพิ่มเติมให้ครบถ้วน
              </p>
              <p className="text-xs opacity-90 leading-relaxed">
                โปรดระบุ <strong>"ที่อยู่/พื้นที่ประจำการ"</strong> และ <strong>"ความเชี่ยวชาญ/อุปกรณ์ประจำทีม"</strong> ในแบบฟอร์มด้านล่าง เพื่อช่วยให้แอดมินส่งเคสช่วยเหลือได้อย่างแม่นยำครับ
              </p>
            </div>
          </div>
        )}

        {/* Hero Section: Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Trophy className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <p className="text-orange-100 font-medium mb-1 text-sm">ช่วยเหลือสำเร็จ</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black">{statsLoading ? '-' : stats.totalResolved}</span>
                <span className="text-orange-100 font-medium text-lg">เคส</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#151b2c] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-1 text-sm">คะแนนความพึงพอใจเฉลี่ย</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
                  {statsLoading ? '-' : stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                </span>
                <div className="flex flex-col">
                  <div className="flex text-yellow-400">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${star <= Math.round(stats.averageRating) ? 'fill-yellow-400' : 'text-gray-200 dark:text-gray-700'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400 mt-0.5">จากผู้ประสบภัย</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        {!statsLoading && feedbacks.length > 0 && (
          <div className="bg-white dark:bg-[#151b2c] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MessageSquareHeart className="w-5 h-5 text-pink-500 shrink-0" />
              <span>เสียงตอบรับจากผู้ประสบภัย</span>
            </h3>
            
            <div className="space-y-3 sm:space-y-4">
              {currentFeedbacks.map((fb, idx) => (
                <div key={idx} className="p-3.5 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex text-yellow-400">
                      {[...Array(fb.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-yellow-400" />
                      ))}
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {new Date(fb.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm italic">"{fb.feedback}"</p>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 font-bold rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
                </button>
                
                <span className="font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-3 py-1 rounded-full">
                  {currentPage} / {totalPages}
                </span>
                
                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 font-bold rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  ถัดไป <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Profile Settings Form */}
        <div className="bg-white dark:bg-[#151b2c] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-8">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-500 shrink-0" />
            <span>แก้ไขข้อมูลส่วนตัว</span>
          </h3>

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm sm:text-base">บันทึกข้อมูลเรียบร้อยแล้ว</p>
            </div>
          )}

          {userId && profileUserData ? (
            <UnifiedUserForm 
              initialData={profileUserData}
              isEditing={true}
              isAdminAccess={true}
              isProfile={true}
              onSuccess={() => {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
              }}
            />
          ) : (
            <p className="text-gray-500 text-center py-4 text-xs sm:text-sm">กำลังโหลดข้อมูล...</p>
          )}
        </div>
      </div>
    </>
  );
}