'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Save } from 'lucide-react';

interface User {
  id: number;
  userId: number;
  username: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSave: (user: User) => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  user,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user) {
      setFormData(user);
      setNewPassword('');
      setError('');
    }
  }, [user, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.userId) return;

    setLoading(true);
    setError('');

    try {
      const updateData = {
        userId: formData.userId,
        name: formData.username,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        status: formData.status,
        ...(newPassword && { password: newPassword }),
      };

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user');
      }

      onSave(formData as User);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            แก้ไขข้อมูลผู้ใช้งาน
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* User ID (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ไอดี (ไม่สามารถแก้ไข)
            </label>
            <Input
              type="text"
              value={formData.userId || ''}
              disabled
              className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ชื่อผู้ใช้งาน
            </label>
            <Input
              type="text"
              name="username"
              value={formData.username || ''}
              onChange={handleChange}
              placeholder="ชื่อผู้ใช้งาน"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              อีเมล
            </label>
            <Input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              placeholder="อีเมล"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              เบอร์โทรศัพท์
            </label>
            <Input
              type="tel"
              name="phone"
              value={formData.phone || ''}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormData((prev) => ({ ...prev, phone: val }));
              }}
              maxLength={10}
              placeholder="เบอร์โทรศัพท์ (10 หลัก)"
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              รหัสผ่านใหม่ (ถ้าต้องการเปลี่ยน)
            </label>
            <div className="flex gap-2">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="ปล่อยว่างเพื่อไม่เปลี่ยนแปลง"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {showPassword ? 'ซ่อน' : 'แสดง'}
              </button>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              สิทธิ์การใช้งาน
            </label>
            <select
              name="role"
              value={formData.role || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="admin">ผู้ดูแลระบบ (Admin)</option>
              <option value="rescue">ทีมช่วยเหลือ (Rescue)</option>
              <option value="victim">ผู้ใช้ทั่วไป (Victim)</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              สถานะ
            </label>
            <select
              name="status"
              value={formData.status || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="active">ใช้งาน</option>
              <option value="inactive">ไม่ใช้งาน</option>
              <option value="suspended">ระงับ</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
