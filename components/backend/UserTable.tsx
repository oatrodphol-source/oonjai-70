'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

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

interface UserTableProps {
  onEdit: (user: User) => void;
  onDelete: (userId: number) => void;
  refreshTrigger?: number;
}

export const UserTable: React.FC<UserTableProps> = ({ onEdit, onDelete, refreshTrigger }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchUsers();
  }, [search, role, rowsPerPage, currentPage, refreshTrigger]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        role,
        limit: rowsPerPage.toString(),
        offset: (currentPage * rowsPerPage).toString(),
      });

      const res = await fetch(`/api/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'rescue':
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

  const totalPages = Math.ceil(total / rowsPerPage);

  return (
    <Card>
      <div className="p-6 space-y-6">
        {/* Header with title and actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            จัดการผู้ใช้งาน
          </h2>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 flex-col sm:flex-row flex-1">
            <Input
              type="text"
              placeholder="ค้นหาชื่อผู้ใช้, อีเมล, หรือเบอร์โทร..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(0);
              }}
              className="flex-1"
            />
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setCurrentPage(0);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-gray-900"
            >
              <option value="">ทั้งหมด</option>
              <option value="admin">Admin</option>
              <option value="rescue">Rescue</option>
              <option value="victim">Victim</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
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

        {/* Table */}
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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
                  อีเมล
                  <div className="text-xs text-gray-500">email</div>
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
                  สถานะ
                  <div className="text-xs text-gray-500">status</div>
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
                users.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                      {user.userId}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {user.username}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 break-all">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {user.phone || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getRoleColor(user.role)}>
                        {user.role === 'admin'
                          ? 'ผู้ดูแลระบบ'
                          : user.role === 'rescue'
                          ? 'ทีมช่วยเหลือ'
                          : 'ผู้ใช้ทั่วไป'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(user.status)}>
                        {user.status === 'active'
                          ? 'ใช้งาน'
                          : user.status === 'inactive'
                          ? 'ไม่ใช้งาน'
                          : 'ระงับ'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                      {new Date(user.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3 flex items-center justify-center gap-2">
                      <Button
                        onClick={() => onEdit(user)}
                        className="p-2 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900 rounded"
                        title="แก้ไข"
                      >
                        <Edit2 size={18} />
                      </Button>
                      <Button
                        onClick={() => {
                          if (
                            confirm(
                              `คุณแน่ใจหรือว่าต้องการลบ ${user.username}?`
                            )
                          ) {
                            onDelete(user.userId);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                        title="ลบ"
                      >
                        <Trash2 size={18} />
                      </Button>
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
