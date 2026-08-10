'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('timestamp', { ascending: false });

        if (error) {
          console.error('Error fetching activity logs:', error);
          setActivityLogs([]);
          setLoading(false);
          return;
        }

        setActivityLogs(data || []);
      } catch (error) {
        console.error('Exception fetching activity logs:', error);
        setActivityLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();

    // Use a unique channel name to prevent Strict Mode issues
    const channelName = `activity-logs-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          console.log('Realtime activity log received:', payload);
          fetchLogs();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('error');
          console.error('Realtime subscription error:', err);
        } else if (status === 'CLOSED') {
          setRealtimeStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshTrigger]);

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

        {/* Mobile View (Cards) */}
        <div className="block lg:hidden space-y-4">
          {loading ? (
            <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
          ) : activityLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">ไม่พบบันทึกกิจกรรม</div>
          ) : (
            activityLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((log) => (
              <div key={log.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{log.action}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('th-TH') : '-'}
                    </p>
                  </div>
                  <Badge className={getStatusColor(log.status || 'success')}>
                    {(!log.status || log.status === 'success') ? 'สำเร็จ' : 'ล้มเหลว'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">ผู้ใช้ (User ID)</p>
                    <p className="text-gray-900 dark:text-white font-medium">{log.user || log.user_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">IP Address</p>
                    <p className="text-gray-900 dark:text-white font-mono text-xs mt-0.5">{log.ip_address || '-'}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden lg:block w-full overflow-x-auto hide-scrollbar rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[600px] text-left text-sm whitespace-nowrap">
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
              ) : activityLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    ไม่พบบันทึกกิจกรรม
                  </td>
                </tr>
              ) : (
                activityLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('th-TH') : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                      {log.user || log.user_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(log.status || 'success')}>
                        {(!log.status || log.status === 'success') ? 'สำเร็จ' : 'ล้มเหลว'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {activityLogs.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              แสดง {(currentPage - 1) * itemsPerPage + 1} ถึง {Math.min(currentPage * itemsPerPage, activityLogs.length)} จาก {activityLogs.length} รายการ
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-50 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-200"
              >
                ก่อนหน้า
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(activityLogs.length / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(activityLogs.length / itemsPerPage)}
                className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-50 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-200"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${
            realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' :
            realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-red-500'
          }`}></span>
          {realtimeStatus === 'connected' ? 'เชื่อมต่อเรียลไทม์แล้ว' : 
           realtimeStatus === 'connecting' ? 'กำลังเชื่อมต่อเรียลไทม์...' : 
           'ขาดการเชื่อมต่อเรียลไทม์ (กรุณารีเฟรช)'}
        </div>
      </div>
    </Card>
  );
};
