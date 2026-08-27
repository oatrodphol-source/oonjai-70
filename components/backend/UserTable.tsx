'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Edit2, Trash2, Eye, EyeOff, Plus, Shield, UserCheck, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
interface User {
  id: number;
  userId: number;
  username: string;
  name?: string;
  phone: string;
  agency?: string;
  address?: string;
  province?: string;
  skills_equipment?: string;
  id_card_number?: string;
  role: string;
  status: string;
  is_online?: boolean;
  created_at: string;
  updated_at: string;
}

interface UserTableProps {
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onCreate?: () => void;
  refreshTrigger?: number;
  onAction?: () => void;
}

export const UserTable: React.FC<UserTableProps> = ({ 
  onEdit, 
  onDelete, 
  onCreate,
  refreshTrigger,
  onAction 
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let adminsList: any[] = [];
    let volunteersList: any[] = [];

    const mergeAndSetUsers = () => {
      let combined = [...adminsList, ...volunteersList];

      if (search) {
        const s = search.toLowerCase();
        combined = combined.filter(
          (u) =>
            u.username?.toLowerCase().includes(s) ||
            u.name?.toLowerCase().includes(s) ||
            u.agency?.toLowerCase().includes(s) ||
            u.province?.toLowerCase().includes(s) ||
            u.address?.toLowerCase().includes(s) ||
            u.skills_equipment?.toLowerCase().includes(s) ||
            u.phone?.includes(search)
        );
      }

      if (role) {
        combined = combined.filter((u) => u.role === role);
      }

      if (statusFilter) {
        combined = combined.filter((u) => (u.status || 'active') === statusFilter);
      }

      // Format for the table
      const formatted = combined.map((u, i) => ({
        id: u.id,
        userId: i + 1,
        username: u.username || '',
        name: u.name || '',
        phone: u.phone || '-',
        agency: u.agency || '',
        address: u.address || '',
        province: u.province || '',
        skills_equipment: u.skills_equipment || '',
        id_card_number: u.id_card_number || '',
        role: u.role,
        status: u.status || 'active',
        is_online: Boolean(u.is_online),
        created_at: u.created_at || new Date().toISOString(),
        updated_at: u.updated_at || new Date().toISOString(),
      }));

      // Sort by created_at desc
      formatted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTotal(formatted.length);
      setUsers(formatted); // For now ignoring pagination limit to show all or we can slice
      setLoading(false);
    };

    const fetchData = async () => {
      setLoading(true);
      
      const [adminsRes, volunteersRes] = await Promise.all([
        supabase.from('admins').select('*'),
        supabase.from('volunteers').select('*')
      ]);

      if (!adminsRes.error && adminsRes.data) {
        adminsList = adminsRes.data.map((doc: any) => ({ role: 'admin', ...doc }));
      }
      
      if (!volunteersRes.error && volunteersRes.data) {
        volunteersList = volunteersRes.data.map((doc: any) => ({ role: 'volunteer', ...doc }));
      }
      
      mergeAndSetUsers();
    };

    fetchData();

    const channelAdmins = supabase
      .channel('custom-admins-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admins' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const channelVolunteers = supabase
      .channel('custom-volunteers-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'volunteers' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelAdmins);
      supabase.removeChannel(channelVolunteers);
    };
  }, [search, role, statusFilter, refreshTrigger]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'rescue':
      case 'volunteer':
        return 'bg-blue-100 text-blue-800';
      case 'victim':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const maskPassword = () => '*'.repeat(9);

  const toggleOnlineStatus = async (user: User) => {
    try {
      const newStatus = !user.is_online;
      const { error } = await supabase
        .from('volunteers')
        .update({ is_online: newStatus })
        .eq('id', user.id);
        
      if (error) throw error;

      toast.success(`อัปเดตสถานะ Live ของคุณ ${user.username} เรียบร้อยแล้ว`);
      if (onAction) onAction();
    } catch (error) {
      console.error('Error toggling live status:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ (Live)');
    }
  };

  const toggleAccountStatus = async (user: User) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      const res = await fetch(`/api/backend/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, role: user.role, name: user.name || user.username, status: newStatus }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error details:', errorText);
        throw new Error('Failed to update status');
      }

      toast.success(`เปลี่ยนสถานะบัญชีสำเร็จ`);
      if (onAction) onAction();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
    }
  };

  const restoreAccount = async (user: User) => {
    try {
      const res = await fetch(`/api/backend/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, role: user.role, name: user.name || user.username, status: 'active' }),
      });
      if (!res.ok) throw new Error('Failed to restore account');

      toast.success(`กู้คืนบัญชีสำเร็จ`);
      if (onAction) onAction();
    } catch (error) {
      console.error('Error restoring account:', error);
      toast.error('เกิดข้อผิดพลาดในการกู้คืนบัญชี');
    }
  };

  const totalPages = Math.ceil(total / rowsPerPage);

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-[#0f172a]">
      <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header with Title and Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                รายชื่อผู้ใช้งานในระบบ
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-extrabold bg-orange-100 text-orange-700 dark:bg-orange-950/80 dark:text-orange-300 rounded-full">
                {total} รายการ
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              จัดการข้อมูลผู้ดูแลระบบ อาสาสมัคร และสิทธิ์การเข้าถึงระบบ
            </p>
          </div>
          {onCreate && (
            <Button
              onClick={onCreate}
              className="bg-[#e65c00] hover:bg-[#cc5200] text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm w-full sm:w-auto shadow-md active:scale-95 transition-all"
            >
              <Plus size={18} />
              เพิ่มผู้ใช้งานใหม่
            </Button>
          )}
        </div>

        {/* Controls Section */}
        <div className="space-y-3">
          {/* Search Box */}
          <div className="w-full">
            <Input
              type="text"
              placeholder="ค้นหาชื่อผู้ใช้, ชื่อ-นามสกุล, สังกัด หรือเบอร์โทร..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full text-xs sm:text-sm rounded-xl py-2.5 bg-gray-50 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700"
            />
          </div>

          {/* Role Filter Tabs & Status Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Role Filter Tabs */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800/90 p-1 rounded-xl gap-1 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => { setRole(''); setCurrentPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap flex-1 sm:flex-none text-center ${
                  role === '' 
                    ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => { setRole('admin'); setCurrentPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap flex-1 sm:flex-none text-center flex items-center justify-center gap-1 ${
                  role === 'admin' 
                    ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Shield size={13} /> Admin
              </button>
              <button
                onClick={() => { setRole('volunteer'); setCurrentPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap flex-1 sm:flex-none text-center flex items-center justify-center gap-1 ${
                  role === 'volunteer' 
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <UserCheck size={13} /> อาสาสมัคร
              </button>
            </div>

            {/* Status Filter & Rows per page */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full sm:w-auto px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white text-gray-900 bg-white font-medium outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">ทุกสถานะบัญชี</option>
                <option value="active">เปิดใช้งาน (Active)</option>
                <option value="inactive">ปิดใช้งาน (Inactive)</option>
                <option value="deleted">ถูกลบ (Deleted)</option>
              </select>

              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                <span className="hidden sm:inline">แสดง:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(0);
                  }}
                  className="px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white font-bold"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>ทั้งหมด</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Cards View (< lg breakpoint) */}
        <div className="block lg:hidden space-y-3">
          {loading ? (
            <div className="p-8 text-center text-gray-500 animate-pulse text-sm">กำลังโหลดข้อมูลผู้ใช้งาน...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-gray-200 dark:border-slate-800 text-sm">
              ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไขที่ค้นหา
            </div>
          ) : (
            (users || [])
              .slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
              .map((user) => (
              <div 
                key={user.userId} 
                className="bg-gray-50/50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-gray-200/80 dark:border-slate-700/60 shadow-sm hover:shadow transition-all space-y-3"
              >
                {/* Header Row */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      user.role === 'admin' 
                        ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300' 
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                    }`}>
                      {user.role === 'admin' ? <Shield size={17} /> : <UserCheck size={17} />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate leading-tight">
                        {user.name || user.username}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                        @{user.username}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold shrink-0 ${getRoleColor(user.role)}`}>
                    {user.role === 'admin' ? 'ผู้ดูแลระบบ' : (user.role === 'volunteer' || user.role === 'rescue') ? 'อาสาสมัคร' : 'ผู้ใช้ทั่วไป'}
                  </span>
                </div>
                
                {/* Details Section */}
                <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl space-y-1.5 text-xs border border-gray-200/60 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">เบอร์โทรศัพท์:</span>
                    {user.phone ? (
                      <a href={`tel:${user.phone}`} className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                        <Phone size={12} /> {user.phone}
                      </a>
                    ) : (
                      <span className="text-gray-400 font-medium">-</span>
                    )}
                  </div>

                  {(user.role === 'volunteer' || user.role === 'rescue') && (
                    <>
                      {user.agency && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-gray-400">สังกัด/หน่วย:</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[170px]">{user.agency}</span>
                        </div>
                      )}
                      {user.province && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-gray-400">จังหวัดประจำการ:</span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400">จ.{user.province}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-slate-800">
                        <span className="text-gray-500 dark:text-gray-400">สถานะปฏิบัติงาน (Live):</span>
                        <button
                          onClick={() => toggleOnlineStatus(user)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition-all ${
                            user.is_online 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                          {user.is_online ? 'พร้อมปฏิบัติงาน (Live)' : 'ออฟไลน์'}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {user.status === 'deleted' ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg">ถูกลบ (Soft Delete)</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAccountStatus(user)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            (user.status || 'active') === 'active' ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            (user.status || 'active') === 'active' ? 'translate-x-5' : 'translate-x-1'
                          }`} />
                        </button>
                        <span className={`text-xs font-bold ${(user.status || 'active') === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                          {(user.status || 'active') === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {user.status === 'deleted' ? (
                      <Button onClick={() => restoreAccount(user)} className="px-3 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl">
                        กู้คืนบัญชี
                      </Button>
                    ) : (
                      <>
                        <button 
                          onClick={() => onEdit(user)} 
                          className="px-3 py-1.5 text-xs font-bold bg-orange-50 hover:bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400 rounded-xl flex items-center gap-1 border border-orange-200 dark:border-orange-800 transition-colors"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button 
                          onClick={() => onDelete(user)} 
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-xl transition-colors"
                          title="ลบผู้ใช้งาน"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View Table (>= lg breakpoint) */}
        <div className="hidden lg:block w-full overflow-x-hidden overflow-y-auto max-h-[60vh] custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-700 relative">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/90 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th className="px-2.5 py-3 text-left font-bold text-gray-900 dark:text-white w-[6%]">
                  ไอดี
                </th>
                <th className="px-3 py-3 text-left font-bold text-gray-900 dark:text-white w-[14%]">
                  ชื่อผู้ใช้
                </th>
                <th className="px-3 py-3 text-left font-bold text-gray-900 dark:text-white w-[16%]">
                  ชื่อ-นามสกุล
                </th>
                <th className="px-3 py-3 text-left font-bold text-gray-900 dark:text-white w-[13%]">
                  เบอร์โทร
                </th>
                <th className="px-3 py-3 text-left font-bold text-gray-900 dark:text-white w-[12%]">
                  สิทธิ์
                </th>
                <th className="px-3 py-3 text-left font-bold text-gray-900 dark:text-white w-[13%]">
                  สถานะบัญชี
                </th>
                <th className="px-2 py-3 text-center font-bold text-gray-900 dark:text-white w-[8%]">
                  Live
                </th>
                <th className="px-2.5 py-3 text-left font-bold text-gray-900 dark:text-white w-[9%]">
                  สร้างเมื่อ
                </th>
                <th className="px-2.5 py-3 text-center font-bold text-gray-900 dark:text-white w-[9%]">
                  การกระทำ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500 animate-pulse">
                    กำลังโหลดข้อมูลผู้ใช้งาน...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                (users || [])
                  .slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
                  .map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-2.5 py-2.5 text-gray-900 dark:text-gray-100 font-mono font-semibold text-xs">
                      #{user.userId}
                    </td>
                    <td className="px-3 py-2.5 text-gray-900 dark:text-gray-100 font-mono font-bold text-xs truncate max-w-[130px]">
                      @{user.username}
                    </td>
                    <td className="px-3 py-2.5 text-gray-900 dark:text-gray-100 font-medium truncate max-w-[150px]">
                      {user.name || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 font-medium text-xs">
                      {user.phone || '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className={getRoleColor(user.role)}>
                        {user.role === 'admin'
                          ? 'ผู้ดูแลระบบ'
                          : (user.role === 'volunteer' || user.role === 'rescue')
                          ? 'อาสาสมัคร'
                          : 'ผู้ใช้ทั่วไป'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {user.status === 'deleted' ? (
                        <Badge className="bg-red-100 text-red-800">ถูกลบ (Soft Delete)</Badge>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleAccountStatus(user)}
                            className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors focus:outline-none ${
                              (user.status || 'active') === 'active' ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                            title={(user.status || 'active') === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                (user.status || 'active') === 'active' ? 'translate-x-4' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-xs font-bold ${(user.status || 'active') === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                            {(user.status || 'active') === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {(user.role === 'volunteer' || user.role === 'rescue') ? (
                        <button
                          onClick={() => toggleOnlineStatus(user)}
                          className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors focus:outline-none ${
                            user.is_online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                          title={user.is_online ? 'พร้อมปฏิบัติงาน' : 'ออฟไลน์'}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              user.is_online ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600 font-medium text-xs">-</span>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5 text-gray-600 dark:text-gray-400 text-xs font-mono">
                      {new Date(user.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-2.5 py-2.5 flex items-center justify-center gap-1">
                      {user.status === 'deleted' ? (
                        <Button
                          onClick={() => restoreAccount(user)}
                          className="px-2 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg transition-colors"
                        >
                          กู้คืน
                        </Button>
                      ) : (
                        <>
                          <button
                            onClick={() => onEdit(user)}
                            className="p-1 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-950/60 rounded-lg transition-colors"
                            title="แก้ไข"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => onDelete(user)}
                            className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-xl transition-colors"
                            title="ลบ"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-600 dark:text-gray-400">
          <div>
            แสดง {users.length === 0 ? 0 : currentPage * rowsPerPage + 1} ถึง{' '}
            {Math.min((currentPage + 1) * rowsPerPage, total)} จากทั้งหมด {total} รายการ
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
            <Button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1.5 text-xs font-bold border border-gray-300 dark:border-slate-700 rounded-xl disabled:opacity-40 dark:text-white"
            >
              ก่อนหน้า
            </Button>

            {/* Compact page indicator for mobile / full list for desktop */}
            <div className="flex items-center gap-1">
              <span className="sm:hidden font-mono font-bold text-gray-800 dark:text-gray-200">
                {currentPage + 1} / {totalPages || 1}
              </span>
              <div className="hidden sm:flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i).slice(0, 7).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      currentPage === page
                        ? 'bg-[#e65c00] text-white shadow-sm'
                        : 'border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {page + 1}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1.5 text-xs font-bold border border-gray-300 dark:border-slate-700 rounded-xl disabled:opacity-40 dark:text-white"
            >
              ถัดไป
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
