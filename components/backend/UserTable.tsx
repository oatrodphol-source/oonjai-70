'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Edit2, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
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
    <Card>
      <div className="p-6 space-y-6">
        {/* Header with title and actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              รายชื่อผู้ใช้งานในระบบ
            </h2>
            <p className="text-sm text-gray-500 mt-1">จัดการข้อมูลผู้ดูแลระบบ อาสาสมัคร และผู้ใช้งานทั้งหมด</p>
          </div>
          {onCreate && (
            <Button
              onClick={onCreate}
              className="bg-[#e65c00] text-white hover:bg-[#cc5200] px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium w-full md:w-auto shadow-sm"
            >
              <Plus size={18} />
              เพิ่มผู้ใช้งานใหม่
            </Button>
          )}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <Input
              type="text"
              placeholder="ค้นหาชื่อผู้ใช้ หรือเบอร์โทร..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full"
            />
          </div>
          <div className="md:col-span-3">
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-gray-900 bg-white"
            >
              <option value="">ทุกสิทธิ์การใช้งาน</option>
              <option value="admin">Admin</option>
              <option value="volunteer">Volunteer (อาสาสมัคร)</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-gray-900 bg-white"
            >
              <option value="">ทุกสถานะบัญชี</option>
              <option value="active">เปิดใช้งาน (Active)</option>
              <option value="inactive">ปิดใช้งาน (Inactive)</option>
              <option value="deleted">ถูกลบ (Deleted)</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              แสดง:
            </span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-gray-900"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>ทั้งหมด</option>
            </select>
          </div>
        </div>

        {/* Mobile View (Cards) */}
        <div className="block lg:hidden space-y-4">
          {loading ? (
            <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">ไม่พบข้อมูลผู้ใช้งาน</div>
          ) : (
            (users || [])
              .slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
              .map((user) => (
              <div key={user.userId} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{user.username}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.name || '-'}</p>
                  </div>
                  <Badge className={getRoleColor(user.role)}>
                    {user.role === 'admin' ? 'ผู้ดูแลระบบ' : (user.role === 'volunteer' || user.role === 'rescue') ? 'อาสาสมัคร' : 'ผู้ใช้ทั่วไป'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">เบอร์โทรศัพท์</p>
                    <p className="text-gray-900 dark:text-white font-medium">{user.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">สถานะ (Live)</p>
                    <div className="mt-1">
                      {(user.role === 'volunteer' || user.role === 'rescue') ? (
                        <button
                          onClick={() => toggleOnlineStatus(user)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            user.is_online ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            user.is_online ? 'translate-x-5' : 'translate-x-1'
                          }`} />
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    {user.status === 'deleted' ? (
                      <Badge className="bg-red-100 text-red-800">ถูกลบ (Soft Delete)</Badge>
                    ) : (
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
                    )}
                    {user.status !== 'deleted' && (
                      <span className={`text-xs font-medium ${(user.status || 'active') === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {(user.status || 'active') === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {user.status === 'deleted' ? (
                      <Button onClick={() => restoreAccount(user)} className="px-3 py-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg">
                        กู้คืนบัญชี
                      </Button>
                    ) : (
                      <>
                        <Button onClick={() => onEdit(user)} className="p-1.5 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900 rounded">
                          <Edit2 size={16} />
                        </Button>
                        <Button onClick={() => onDelete(user)} className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded">
                          <Trash2 size={16} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden lg:block w-full overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar rounded-lg border border-slate-200 dark:border-slate-700 relative">
          <table className="w-full min-w-[800px] text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  ไอดี
                  <div className="text-xs text-gray-500">userId</div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  ชื่อผู้ใช้งาน
                  <div className="text-xs text-gray-500">username</div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  ชื่อ-นามสกุล
                  <div className="text-xs text-gray-500">name</div>
                </th>

                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  เบอร์โทรศัพท์
                  <div className="text-xs text-gray-500">phone</div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  สิทธิ์การใช้งาน
                  <div className="text-xs text-gray-500">role</div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  สถานะบัญชี
                  <div className="text-xs text-gray-500">status</div>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">
                  สถานะ (Live)
                  <div className="text-xs text-gray-500">is_online</div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  สร้างเมื่อ
                  <div className="text-xs text-gray-500">created_at</div>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">
                  การกระทำ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    ไม่พบข้อมูลผู้ใช้งาน
                  </td>
                </tr>
              ) : (
                (users || [])
                  .slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
                  .map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                      {user.userId}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {user.username}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {user.name || '-'}
                    </td>

                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {user.phone || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getRoleColor(user.role)}>
                        {user.role === 'admin'
                          ? 'ผู้ดูแลระบบ'
                          : (user.role === 'volunteer' || user.role === 'rescue')
                          ? 'อาสาสมัคร'
                          : 'ผู้ใช้ทั่วไป'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {user.status === 'deleted' ? (
                        <Badge className="bg-red-100 text-red-800">ถูกลบ (Soft Delete)</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleAccountStatus(user)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                              (user.status || 'active') === 'active' ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                            title={(user.status || 'active') === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                (user.status || 'active') === 'active' ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-sm font-medium ${(user.status || 'active') === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {(user.status || 'active') === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(user.role === 'volunteer' || user.role === 'rescue') ? (
                        <button
                          onClick={() => toggleOnlineStatus(user)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                            user.is_online ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                          title={user.is_online ? 'พร้อมปฏิบัติงาน' : 'ออฟไลน์'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              user.is_online ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                      {new Date(user.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3 flex items-center justify-center gap-2">
                      {user.status === 'deleted' ? (
                        <Button
                          onClick={() => restoreAccount(user)}
                          className="px-3 py-1.5 text-sm bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
                        >
                          กู้คืนบัญชี
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => onEdit(user)}
                            className="p-2 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900 rounded"
                            title="แก้ไข"
                          >
                            <Edit2 size={18} />
                          </Button>
                          <Button
                            onClick={() => onDelete(user)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                            title="ลบ"
                          >
                            <Trash2 size={18} />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            แสดง {users.length === 0 ? 0 : currentPage * rowsPerPage + 1} ถึง{' '}
            {Math.min((currentPage + 1) * rowsPerPage, total)} จาก {total} รายการ
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 dark:text-white"
            >
              ก่อนหน้า
            </Button>

            {/* Page numbers */}
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i).map((page) => (
                <Button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white'
                  }`}
                >
                  {page + 1}
                </Button>
              ))}
            </div>

            <Button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 dark:text-white"
            >
              ถัดไป
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
