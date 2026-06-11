'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Activity } from 'lucide-react';

interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  ip_address: string;
  status: 'success' | 'failure';
  timestamp: string;
}

interface UserActivityLogProps {
  refreshTrigger?: number;
}

export const UserActivityLog: React.FC<UserActivityLogProps> = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [refreshTrigger]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/activity?limit=20&offset=0');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failure':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <Card>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            บันทึกกิจกรรมผู้ใช้งาน
          </h3>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  เวลา
                  <div className="text-xs text-gray-500">Timestamp</div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  ผู้ใช้
                  <div className="text-xs text-gray-500">User ID</div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  การกระทำ
                  <div className="text-xs text-gray-500">Action</div>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  สถานะ
                  <div className="text-xs text-gray-500">Status</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    ไม่พบบันทึกกิจกรรม
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                      {log.user_id}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(log.status)}>
                        {log.status === 'success' ? 'สำเร็จ' : 'ล้มเหลว'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
          อัพเดทอัตโนมัติทุกนาที
        </div>
      </div>
    </Card>
  );
};
