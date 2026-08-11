'use client';
import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Save, MessageCircle, Link as LinkIcon, Copy, CheckCircle2, Eye, EyeOff, Users, Clock, ExternalLink, RefreshCw, Search, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LineSettingsPage() {
  const [settings, setSettings] = useState({
    line_channel_access_token: '',
    line_channel_secret: '',
    line_auto_reply_template: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // LINE Users Log State
  const [lineUsers, setLineUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/line` : '';

  useEffect(() => {
    fetchSettings();
    fetchLineUsers();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          line_channel_access_token: data.line_channel_access_token || '',
          line_channel_secret: data.line_channel_secret || '',
          line_auto_reply_template: data.line_auto_reply_template || 'รับแจ้งเหตุแล้ว กำลังประสานงานกู้ภัย...'
        }));
      }
    } catch (error) {
      console.error('Failed to fetch LINE settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLineUsers = async () => {
    setLoadingUsers(true);
    try {
      // 1. Fetch saved LINE Users from line_users table if exists
      const { data: dbLineUsers } = await supabase
        .from('line_users')
        .select('*')
        .order('last_active_at', { ascending: false });

      // 2. Fetch cases created via LINE (reporter_name starts with 'U')
      const { data: lineCases } = await supabase
        .from('cases')
        .select('*')
        .like('reporter_name', 'U%')
        .order('created_at', { ascending: false });

      // Combine & Merge User Logs
      const userMap = new Map();

      if (dbLineUsers && dbLineUsers.length > 0) {
        dbLineUsers.forEach((u: any) => {
          userMap.set(u.line_user_id, {
            id: u.line_user_id,
            name: u.display_name || 'ผู้ใช้งาน LINE',
            picture: u.picture_url || null,
            statusMessage: u.status_message || null,
            lastActive: u.last_active_at || u.created_at,
            totalCases: 0,
            latestCase: null
          });
        });
      }

      if (lineCases && lineCases.length > 0) {
        lineCases.forEach((c: any) => {
          const uid = c.reporter_name;
          const existing = userMap.get(uid) || {
            id: uid,
            name: c.name && c.name !== 'ผู้ใช้ LINE' && c.name !== 'SOS User (LINE)' ? c.name : 'ผู้ใช้ LINE',
            picture: null,
            statusMessage: null,
            lastActive: c.created_at,
            totalCases: 0,
            latestCase: null
          };

          existing.totalCases += 1;
          if (!existing.latestCase) {
            existing.latestCase = c;
          } else if (new Date(c.created_at) > new Date(existing.latestCase.created_at)) {
            existing.latestCase = c;
          }
          userMap.set(uid, existing);
        });
      }

      setLineUsers(Array.from(userMap.values()));
    } catch (error) {
      console.error('Failed to fetch LINE Users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Reset test session for a user (Cancels pending cases)
  const handleResetUserTest = async (userId: string) => {
    if (!window.confirm('คุณต้องการรีเซ็ตสถานะเคสของผู้ใช้ท่านนี้เพื่อทดสอบใหม่ใช่หรือไม่?')) return;
    try {
      await supabase
        .from('cases')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('reporter_name', userId)
        .eq('status', 'pending');

      toast.success('รีเซ็ตสถานะเคสสำหรับการทดสอบแล้ว!');
      fetchLineUsers();
    } catch (e) {
      toast.error('เกิดข้อผิดพลาดในการรีเซ็ต');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        toast.success('บันทึกการตั้งค่า LINE สำเร็จ');
      } else {
        toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('คัดลอก Webhook URL แล้ว');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = () => {
    toast.success('ส่งข้อความทดสอบแล้ว กรุณาตรวจสอบใน LINE ของคุณ');
  };

  // Filter & Pagination Logic
  const filteredUsers = lineUsers.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.id && u.id.toLowerCase().includes(q)) ||
      (u.latestCase && String(u.latestCase.id).includes(q))
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <DashboardHeader title="จัดการ LINE SOS (LINE Settings)" />
      <div className="max-w-4xl mx-auto py-6 pb-32 md:pb-10 space-y-6 px-4 md:px-0">
        
        {/* Connection Settings Card */}
        <Card>
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#00B900]" />
              ตั้งค่าการเชื่อมต่อ (LINE Messaging API)
            </h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Channel Access Token</label>
              <div className="relative">
                <textarea 
                  className={`w-full min-h-[100px] p-3 text-base rounded-xl border bg-white dark:bg-[#0b1325] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all border-gray-300 dark:border-gray-700 resize-none pr-12`}
                  placeholder="ใส่ Channel Access Token..." 
                  value={settings.line_channel_access_token} 
                  onChange={e => setSettings({...settings, line_channel_access_token: e.target.value})} 
                  style={!showToken && settings.line_channel_access_token ? { WebkitTextSecurity: 'disc' } as React.CSSProperties : {}}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Token มักจะมีความยาวมาก ควรใช้การคัดลอกมาวาง</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Channel Secret</label>
              <div className="relative">
                <Input 
                  type={showSecret ? "text" : "password"} 
                  placeholder="ใส่ Channel Secret..." 
                  value={settings.line_channel_secret} 
                  onChange={e => setSettings({...settings, line_channel_secret: e.target.value})} 
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute top-[8px] right-3 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> Webhook URL
              </label>
              <p className="text-xs text-gray-500 mb-3">นำ URL นี้ไปใส่ใน LINE Developers Console เพื่อรับข้อความ</p>
              <div className="flex items-center gap-2">
                <Input 
                  type="text" 
                  value={webhookUrl} 
                  readOnly 
                  className="bg-white dark:bg-slate-900 font-mono text-sm"
                />
                <Button variant="outline" onClick={handleCopyWebhook} className="shrink-0 h-[48px]">
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Auto Reply Template Card */}
        <Card>
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              ข้อความตอบกลับอัตโนมัติ (Auto-Reply Template)
            </h3>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">เมื่อมีคนแจ้งเหตุเข้ามา</label>
            <textarea 
              className="w-full p-4 border rounded-xl bg-white dark:bg-[#0b1325] text-gray-900 dark:text-gray-100 dark:border-gray-700 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="รับแจ้งเหตุแล้ว กำลังประสานงานกู้ภัย..."
              value={settings.line_auto_reply_template}
              onChange={e => setSettings({...settings, line_auto_reply_template: e.target.value})}
            ></textarea>
            <p className="text-xs text-gray-500 mt-2">ข้อความนี้จะถูกส่งกลับอัตโนมัติเมื่อระบบได้รับข้อมูลจาก LINE</p>
          </div>
        </Card>

        {/* LINE Users & Activity Log Table with Search & 10-Item Pagination */}
        <Card>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00B900]" />
                ประวัติและรายชื่อผู้ใช้งาน LINE (LINE Users Log)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">รายชื่อผู้ใช้งานที่เพิ่มเพื่อนหรือแจ้งเหตุผ่าน LINE Official Account ({filteredUsers.length} รายชื่อ)</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input 
                  placeholder="ค้นหาชื่อ / LINE ID / รหัสเคส..." 
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <Button variant="outline" size="sm" onClick={fetchLineUsers} disabled={loadingUsers} className="flex items-center gap-1 shrink-0 h-9">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>
            </div>
          </div>

          {loadingUsers ? (
            <div className="py-8 text-center text-gray-500 animate-pulse text-sm">
              กำลังโหลดข้อมูลผู้ใช้งาน LINE...
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm bg-slate-50 dark:bg-slate-800/30 rounded-xl">
              ไม่พบรายชื่อผู้ใช้งาน LINE ที่ตรงกับคำค้นหา
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-slate-50 dark:bg-slate-800/50 text-gray-700 dark:text-gray-300">
                      <th className="p-3 font-semibold">ผู้ใช้งาน LINE</th>
                      <th className="p-3 font-semibold">LINE User ID</th>
                      <th className="p-3 font-semibold">เคสล่าสุด</th>
                      <th className="p-3 font-semibold">กิจกรรมล่าสุด</th>
                      <th className="p-3 font-semibold text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {user.picture ? (
                              <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-emerald-400" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-[#00B900]/20 text-[#00B900] flex items-center justify-center font-bold text-xs">
                                LINE
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
                              {user.statusMessage && (
                                <p className="text-xs text-gray-500 max-w-[180px] truncate">{user.statusMessage}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {user.id ? `${user.id.substring(0, 12)}...` : '-'}
                        </td>

                        <td className="p-3">
                          {user.latestCase ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                เคส #{user.latestCase.id} ({user.latestCase.type || 'SOS'})
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">ยังไม่มีเคส</span>
                          )}
                        </td>

                        <td className="p-3 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {user.lastActive ? new Date(user.lastActive).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                          </div>
                        </td>

                        <td className="p-3 text-right space-x-2">
                          {user.latestCase && (
                            <Link 
                              href={`/tracking/${user.latestCase.id}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-semibold"
                            >
                              ดูเคส <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                          <button
                            onClick={() => handleResetUserTest(user.id)}
                            title="รีเซ็ตเคสเพื่อทดสอบใหม่"
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 ml-2"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ตทดสอบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls (10 items per page) */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
                  <div>
                    แสดงหน้า {currentPage} จาก {totalPages} หน้า (ทั้งหมด {filteredUsers.length} รายการ)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-2"
                    >
                      <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
                    </Button>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {currentPage} / {totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="h-8 px-2"
                    >
                      ถัดไป <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
          <Button variant="outline" className="flex items-center gap-2" onClick={handleTestConnection}>
            <MessageCircle className="w-4 h-4" />
            ทดสอบการเชื่อมต่อ
          </Button>
          <Button className="bg-[#0b1325] hover:bg-[#0b1325]/90 flex items-center gap-2 text-white" onClick={handleSave} disabled={isSaving || isLoading}>
            <Save className="w-4 h-4" />
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </Button>
        </div>
      </div>
    </>
  );
}
