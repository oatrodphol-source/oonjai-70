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
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';

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
  const [showAddUser, setShowAddUser] = useState(false);
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
      <div className="w-full max-w-[100vw] overflow-x-hidden pb-32 md:pb-10 mx-auto py-6 space-y-6">
        {/* Create User Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => setShowAddUser(true)}
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

      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4 dark:text-white">สร้างผู้ใช้งานใหม่</h3>
            <input type="text" id="addUserName" placeholder="ชื่อผู้ใช้งาน (Name)" className="w-full border p-3 rounded-lg mb-3 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            <input type="email" id="addUserEmail" placeholder="อีเมล (Email)" className="w-full border p-3 rounded-lg mb-3 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            <input type="password" id="addUserPassword" placeholder="รหัสผ่าน (Password)" className="w-full border p-3 rounded-lg mb-3 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            <input type="text" id="addUserPhone" placeholder="เบอร์โทรศัพท์ (Phone)" className="w-full border p-3 rounded-lg mb-3 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            
            <select id="addUserRole" className="w-full border p-3 rounded-lg mb-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <option value="volunteer">ทีมช่วยเหลือ (Volunteer)</option>
              <option value="admin">ผู้ดูแลระบบ (Admin)</option>
            </select>
            
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddUser(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">ยกเลิก</button>
              <button onClick={async () => {
                const name = (document.getElementById('addUserName') as HTMLInputElement).value;
                const email = (document.getElementById('addUserEmail') as HTMLInputElement).value;
                const password = (document.getElementById('addUserPassword') as HTMLInputElement).value;
                const phone = (document.getElementById('addUserPhone') as HTMLInputElement).value;
                const role = (document.getElementById('addUserRole') as HTMLSelectElement).value;
                
                if (name && email && password) {
                  const collectionName = role === 'admin' ? 'admins' : 'volunteers';
                  await addDoc(collection(db, collectionName), {
                    name,
                    email,
                    password,
                    phone,
                    role,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });
                  setRefreshTrigger((prev) => prev + 1);
                  setShowAddUser(false);
                }
              }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">สร้างผู้ใช้งาน</button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4 dark:text-white">แก้ไขข้อมูลผู้ใช้งาน</h3>
            <label className="block text-sm text-slate-500 mb-1">ชื่อ-นามสกุล</label>
            <input type="text" value={(editingUser as any).name || editingUser.username || ''} onChange={(e) => setEditingUser({...editingUser, name: e.target.value} as any)} className="w-full border p-3 rounded-lg mb-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            <label className="block text-sm text-slate-500 mb-1">เบอร์โทรศัพท์</label>
            <input type="text" value={editingUser.phone || ''} onChange={(e) => setEditingUser({...editingUser, phone: e.target.value} as any)} className="w-full border p-3 rounded-lg mb-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg mb-4 text-sm text-slate-500 flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">สิทธิ์ปัจจุบัน:</span> 
              {editingUser.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'อาสาสมัคร (Volunteer)'} 
              <span className="text-xs ml-auto">(ไม่สามารถเปลี่ยนสิทธิ์ผ่านหน้านี้ได้)</span>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">ยกเลิก</button>
              <button onClick={async () => {
                const collectionName = editingUser.role === 'admin' ? 'admins' : 'volunteers';
                await updateDoc(doc(db, collectionName, editingUser.id.toString()), {
                  name: (editingUser as any).name || editingUser.username, phone: editingUser.phone, updated_at: new Date().toISOString()
                });
                setEditingUser(null);
              }} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">บันทึกการแก้ไข</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
