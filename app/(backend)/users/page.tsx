'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { UserTable } from '@/components/backend/UserTable';
import { EditUserModal } from '@/components/backend/EditUserModal';
import { RoleManagement } from '@/components/backend/RoleManagement';
import { UserActivityLog } from '@/components/backend/UserActivityLog';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Plus, X } from 'lucide-react';

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

export default function UsersPage() {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'victim',
  });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleSaveUser = () => {
    setRefreshTrigger((prev) => prev + 1);
    setIsEditModalOpen(false);
  };

  const handleCreateUser = async () => {
    if (!createFormData.name || !createFormData.email || !createFormData.password) {
      setCreateError('กรุณากรอกข้อมูลที่จำเป็นทั้งหมด');
      return;
    }

    setCreateLoading(true);
    setCreateError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createFormData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }

      setRefreshTrigger((prev) => prev + 1);
      setIsCreateModalOpen(false);
      setCreateFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'victim',
      });
    } catch (err: any) {
      setCreateError(err.message || 'An error occurred');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <>
      <DashboardHeader title="จัดการผู้ใช้งาน (Admin)" />
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        {/* Create User Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={18} />
            สร้างผู้ใช้งานใหม่
          </Button>
        </div>

        {/* Users Table */}
        <UserTable
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          refreshTrigger={refreshTrigger}
        />

        {/* Role Management */}
        <RoleManagement refreshTrigger={refreshTrigger} />

        {/* User Activity Log */}
        <UserActivityLog refreshTrigger={refreshTrigger} />

        {/* Security Note */}
        <Card className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800">
          <div className="p-4 text-sm text-blue-800 dark:text-blue-200">
            🔒 <strong>Secured by OonJai System</strong> - การดำเนินการทั้งหมดถูกบันทึกและตรวจสอบ
          </div>
        </Card>
      </div>

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditModalOpen}
        user={editingUser}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveUser}
      />

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateError('');
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              สร้างผู้ใช้งานใหม่
            </h2>
            <button
              onClick={() => {
                setIsCreateModalOpen(false);
                setCreateError('');
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {createError && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {createError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ชื่อผู้ใช้งาน
              </label>
              <Input
                type="text"
                value={createFormData.name}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, name: e.target.value })
                }
                placeholder="ชื่อผู้ใช้งาน"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                อีเมล
              </label>
              <Input
                type="email"
                value={createFormData.email}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, email: e.target.value })
                }
                placeholder="อีเมล"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                เบอร์โทรศัพท์
              </label>
              <Input
                type="tel"
                value={createFormData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setCreateFormData({ ...createFormData, phone: val });
                }}
                maxLength={10}
                autoComplete="off"
                placeholder="เบอร์โทรศัพท์ (10 หลัก)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                รหัสผ่าน
              </label>
              <Input
                type="password"
                value={createFormData.password}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, password: e.target.value })
                }
                autoComplete="new-password"
                placeholder="รหัสผ่าน"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                สิทธิ์การใช้งาน
              </label>
              <select
                value={createFormData.role}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, role: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="victim">ผู้ใช้ทั่วไป (Victim)</option>
                <option value="rescue">ทีมช่วยเหลือ (Rescue)</option>
                <option value="admin">ผู้ดูแลระบบ (Admin)</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={() => {
                setIsCreateModalOpen(false);
                setCreateError('');
              }}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createLoading}
              className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Plus size={18} />
              {createLoading ? 'กำลังสร้าง...' : 'สร้างผู้ใช้งาน'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
