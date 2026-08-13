'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { UserTable } from '@/components/backend/UserTable';
import { EditUserModal } from '@/components/backend/EditUserModal';
import { UserActivityLog } from '@/components/backend/UserActivityLog';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Plus, X } from 'lucide-react';
import UnifiedUserForm from '@/components/backend/UnifiedUserForm';
import { supabase } from '@/lib/supabase';

interface User {
  id: number;
  userId: number;
  username: string;
  name?: string;
  phone: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    password: '',
    phone: '',
    role: 'volunteer',
  });

  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm('ยืนยันการลบผู้ใช้งานนี้?')) return;
    try {
      const res = await fetch(`/api/backend/users?id=${user.id}&role=${user.role}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        console.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return (
    <>
      <DashboardHeader title="จัดการผู้ใช้งาน (Admin)" />
      <div className="w-full px-4 lg:px-8 pb-32 md:pb-10 mx-auto py-6 space-y-6 max-w-7xl">
        {/* Users Table */}
        <UserTable
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          onCreate={() => { setEditingUser(null); setShowAddUser(true); }}
          refreshTrigger={refreshTrigger}
          onAction={() => setRefreshTrigger((prev) => prev + 1)}
        />

        {/* User Activity Log */}
        <UserActivityLog refreshTrigger={refreshTrigger} />

        {/* Security Note */}
        <Card className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800">
          <div className="p-4 text-sm text-blue-800 dark:text-blue-200">
            🔒 <strong>Secured by OonJai System</strong> - การดำเนินการทั้งหมดถูกบันทึกและตรวจสอบ
          </div>
        </Card>
      </div>

      {showAddUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[3000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 w-full max-w-xl relative max-h-[90vh] overflow-y-auto shadow-2xl my-auto border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowAddUser(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
            <h3 className="text-base sm:text-lg font-extrabold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
              ➕ สร้างผู้ใช้งานใหม่
            </h3>
            <UnifiedUserForm 
              isEditing={false}
              isAdminAccess={true}
              onSuccess={() => {
                setShowAddUser(false);
                setRefreshTrigger((prev) => prev + 1);
              }}
            />
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[3000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 w-full max-w-xl relative max-h-[90vh] overflow-y-auto shadow-2xl my-auto border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
            <h3 className="text-base sm:text-lg font-extrabold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
              ✏️ แก้ไขข้อมูลผู้ใช้งาน
            </h3>
            <UnifiedUserForm 
              initialData={editingUser}
              isEditing={true}
              isAdminAccess={true}
              onSuccess={() => {
                setEditingUser(null);
                setRefreshTrigger((prev) => prev + 1);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
