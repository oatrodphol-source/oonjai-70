'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string;
}

interface Permission {
  [key: string]: boolean;
}

const availablePermissions = [
  { key: 'view_data', label: 'ดูข้อมูล' },
  { key: 'edit_user', label: 'แก้ไขผู้ใช้' },
  { key: 'manage_cases', label: 'จัดการเคส' },
  { key: 'view_logs', label: 'ดูบันทึก' },
  { key: 'manage_roles', label: 'จัดการสิทธิ์' },
  { key: 'delete_user', label: 'ลบผู้ใช้' },
];

interface RoleManagementProps {
  refreshTrigger?: number;
}

export const RoleManagement: React.FC<RoleManagementProps> = ({ refreshTrigger }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {} as Permission,
  });

  useEffect(() => {
    fetchRoles();
  }, [refreshTrigger]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewRole = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: availablePermissions.reduce(
        (acc, perm) => ({ ...acc, [perm.key]: false }),
        {}
      ),
    });
    setIsModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    const permissions = typeof role.permissions === 'string'
      ? JSON.parse(role.permissions)
      : role.permissions;

    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permissions: permissions || availablePermissions.reduce(
        (acc, perm) => ({ ...acc, [perm.key]: false }),
        {}
      ),
    });
    setIsModalOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      const method = editingRole ? 'PUT' : 'POST';
      const body = {
        ...(editingRole && { id: editingRole.id }),
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
      };

      const res = await fetch('/api/users/roles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchRoles();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (confirm('คุณแน่ใจหรือว่าต้องการลบสิทธิ์นี้?')) {
      try {
        const res = await fetch(`/api/users/roles?id=${roleId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          await fetchRoles();
        }
      } catch (error) {
        console.error('Error deleting role:', error);
      }
    }
  };

  const togglePermission = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              จัดการสิทธิ์และบทบาท
            </h3>
            <Button
              onClick={handleNewRole}
              className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={18} />
              สร้างสิทธิ์ใหม่
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
          ) : roles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">ไม่มีสิทธิ์ที่กำหนด</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => {
                const permissions = typeof role.permissions === 'string'
                  ? JSON.parse(role.permissions)
                  : role.permissions;

                return (
                  <div
                    key={role.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {role.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {role.description}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {Object.values(permissions || {}).filter((v) => v).length} สิทธิ์
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      {availablePermissions.map((perm) => (
                        <div
                          key={perm.key}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={permissions?.[perm.key] || false}
                            disabled
                            className="rounded border-gray-300"
                          />
                          <span className="text-gray-700 dark:text-gray-300">
                            {perm.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEditRole(role)}
                        className="flex-1 px-3 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200 rounded text-sm flex items-center justify-center gap-2"
                      >
                        <Edit2 size={14} />
                        แก้ไข
                      </Button>
                      {role.name !== 'admin' && role.name !== 'rescue' && role.name !== 'victim' && (
                        <Button
                          onClick={() => handleDeleteRole(role.id)}
                          className="flex-1 px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 rounded text-sm flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} />
                          ลบ
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Modal for creating/editing role */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-96 overflow-y-auto">
          <div className="p-6 space-y-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {editingRole ? 'แก้ไขสิทธิ์' : 'สร้างสิทธิ์ใหม่'}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ชื่อสิทธิ์
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ชื่อสิทธิ์"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                รายละเอียด
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="รายละเอียด"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                สิทธิ์ที่อนุญาต
              </label>
              <div className="grid grid-cols-2 gap-3">
                {availablePermissions.map((perm) => (
                  <div key={perm.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={perm.key}
                      checked={formData.permissions[perm.key] || false}
                      onChange={() => togglePermission(perm.key)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <label
                      htmlFor={perm.key}
                      className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      {perm.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 rounded"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSaveRole}
                className="flex-1 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded"
              >
                บันทึก
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
