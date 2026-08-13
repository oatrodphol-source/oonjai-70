'use client';

import React, { useState } from 'react';
import { User, Phone, Briefcase, Lock, UserCog, Save, Loader2, AtSign, MapPin, Globe, Shield, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

interface UnifiedUserFormProps {
  initialData?: any;
  isEditing?: boolean;
  isAdminAccess?: boolean;
  isProfile?: boolean;
  onSuccess?: () => void;
}

export default function UnifiedUserForm({
  initialData = {},
  isEditing = false,
  isAdminAccess = false,
  isProfile = false,
  onSuccess,
}: UnifiedUserFormProps) {
  const [formData, setFormData] = useState({
    id: initialData?.id || '',
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    agency: initialData?.agency || '',
    address: initialData?.address || '',
    province: initialData?.province || '',
    skills_equipment: initialData?.skills_equipment || '',
    id_card_number: initialData?.id_card_number || '',
    username: initialData?.username || '',
    password: '',
    role: initialData?.role || 'volunteer',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = '/api/backend/users';
      const method = isEditing ? 'PUT' : 'POST';
      
      const payload = { ...formData };
      if (isEditing && !payload.password) {
        delete (payload as any).password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      toast.success(isEditing ? 'อัปเดตข้อมูลผู้ใช้สำเร็จ' : 'สร้างผู้ใช้ใหม่สำเร็จ');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <User size={16} /> ชื่อ-นามสกุล <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-gray-700 dark:text-white"
            placeholder="ระบุชื่อ-นามสกุล"
          />
        </div>

        {/* Username */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <AtSign size={16} /> Username <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="username"
            required
            autoComplete="off"
            disabled={isEditing && !isAdminAccess}
            value={formData.username}
            onChange={handleChange}
            className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white ${isEditing && !isAdminAccess ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-70' : 'bg-white dark:bg-gray-700'}`}
            placeholder="ระบุชื่อผู้ใช้งาน"
          />
          {isEditing && !isAdminAccess && <p className="text-xs text-gray-500 dark:text-gray-400">ไม่สามารถแก้ไข Username ได้</p>}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Phone size={16} /> เบอร์โทรศัพท์
          </label>
          <input
            type="tel"
            name="phone"
            maxLength={10}
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-gray-700 dark:text-white"
            placeholder="08X-XXX-XXXX"
          />
        </div>

        {/* Agency */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Briefcase size={16} /> สังกัด/หน่วยกู้ภัย
          </label>
          <input
            type="text"
            name="agency"
            value={formData.agency}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-gray-700 dark:text-white"
            placeholder="ระบุชื่อสังกัด (ถ้ามี)"
          />
        </div>

        {/* Province */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Globe size={16} /> จังหวัดปฏิบัติการ
          </label>
          <input
            type="text"
            name="province"
            value={formData.province}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-gray-700 dark:text-white"
            placeholder="เช่น ปทุมธานี, นนทบุรี, กรุงเทพฯ"
          />
        </div>

        {/* ID Card Number / Volunteer ID */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <CreditCard size={16} /> เลขบัตรประชาชน / รหัสอาสา
          </label>
          <input
            type="text"
            name="id_card_number"
            value={formData.id_card_number}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-gray-700 dark:text-white"
            placeholder="เช่น 1100XXXXXXXXXXXXXXXX"
          />
        </div>

        {/* Address */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <MapPin size={16} /> ที่อยู่ / พื้นที่ประจำการหลัก
          </label>
          <textarea
            name="address"
            rows={2}
            value={formData.address}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-gray-700 dark:text-white resize-none"
            placeholder="ระบุที่อยู่ / ศูนย์ประสานงาน / พื้นที่ประจำการ"
          />
        </div>

        {/* Skills & Equipment */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Shield size={16} /> ความเชี่ยวชาญ / อุปกรณ์ประจำทีม
          </label>
          <input
            type="text"
            name="skills_equipment"
            value={formData.skills_equipment}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-gray-700 dark:text-white"
            placeholder="เช่น เรือยางท้องแบน, ทีมดำน้ำฉุกเฉิน, รถพยาบาล ALS, ปฐมพยาบาลเบื้องต้น"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Lock size={16} /> รหัสผ่าน
          </label>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required={!isEditing}
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-gray-700 dark:text-white"
            placeholder={isEditing ? '•••••••• (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)' : 'กำหนดรหัสผ่าน'}
          />
        </div>

        {/* Role */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <UserCog size={16} /> ระดับสิทธิ์ <span className="text-red-500">*</span>
          </label>
          <select
            name="role"
            required
            disabled={!isAdminAccess || isProfile}
            value={formData.role}
            onChange={handleChange}
            className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white ${(!isAdminAccess || isProfile) ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-70' : 'bg-white dark:bg-gray-700'}`}
          >
            <option value="volunteer">Volunteer (อาสาสมัคร/กู้ภัย)</option>
            <option value="admin">Admin (ผู้ดูแลระบบ)</option>
          </select>
          {(!isAdminAccess || isProfile) && <p className="text-xs text-gray-500 dark:text-gray-400">คุณไม่สามารถเปลี่ยนระดับสิทธิ์ของตนเองได้</p>}
        </div>

      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างผู้ใช้งาน'}
        </button>
      </div>
    </form>
  );
}
