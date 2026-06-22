'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, Phone, Building, CheckCircle2 } from 'lucide-react';

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    rescueUnit: ''
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string>('volunteer');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oonjai_user');
      if (stored) {
        const user = JSON.parse(stored);
        setUserId(user.uid || user.id);
        setRole(user.role || 'volunteer');
        setFormData({
          fullName: user.name || '',
          phone: user.phone || '',
          rescueUnit: user.rescueUnit || user.agency || ''
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

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
      // Determine collection based on role. Defaults to volunteers if unknown.
      const collectionName = role === 'admin' ? 'admins' : 'volunteers';
      const userRef = doc(db, collectionName, userId);
      
      // Update Firestore. Match typical schema fields (name, phone, agency)
      await updateDoc(userRef, {
        name: formData.fullName,
        phone: formData.phone,
        agency: formData.rescueUnit,
        updated_at: new Date().toISOString()
      });
      
      // Update LocalStorage immediately
      const stored = localStorage.getItem('oonjai_user');
      if (stored) {
        const user = JSON.parse(stored);
        user.name = formData.fullName;
        user.phone = formData.phone;
        user.rescueUnit = formData.rescueUnit;
        localStorage.setItem('oonjai_user', JSON.stringify(user));
        
        // Dispatch event just in case components are listening
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

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 animate-in fade-in duration-300">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <span>⚙️</span> ตั้งค่าบัญชี
      </h1>
      
      <div className="bg-white dark:bg-[#151b2c] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-8">
        
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            <p className="text-emerald-700 dark:text-emerald-400 font-bold text-base">บันทึกข้อมูลเรียบร้อยแล้ว ✅</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full pl-11 pr-4 h-12 sm:h-14 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#ff6600] focus:border-transparent bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white text-base sm:text-lg transition-all"
                placeholder="ชื่อ-นามสกุล"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full pl-11 pr-4 h-12 sm:h-14 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#ff6600] focus:border-transparent bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white text-base sm:text-lg transition-all"
                placeholder="08X-XXX-XXXX"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">สังกัดหน่วยกู้ภัย/มูลนิธิ</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Building className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="rescueUnit"
                value={formData.rescueUnit}
                onChange={handleChange}
                className="w-full pl-11 pr-4 h-12 sm:h-14 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#ff6600] focus:border-transparent bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white text-base sm:text-lg transition-all"
                placeholder="เช่น มูลนิธิร่วมกตัญญู (จุดหัวหมาก)"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">ระบุเพื่อสร้างความน่าเชื่อถือให้กับผู้ประสบภัยขณะเข้าช่วยเหลือ</p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !userId}
              className="w-full h-14 bg-[#ff6600] hover:bg-[#e65c00] active:bg-[#cc5200] text-white font-bold rounded-xl text-lg transition-all transform active:scale-[0.98] shadow-md shadow-orange-500/20 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
