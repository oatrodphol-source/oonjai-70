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
      const { data: dbLineUsers } = await supabase
        .from('line_users')
        .select('*')
        .order('last_active_at', { ascending: false });

      const { data: lineCases } = await supabase
        .from('cases')
        .select('*')
        .like('reporter_name', 'U%')
        .order('created_at', { ascending: false });

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
      <div className="w-full max-w-4xl mx-auto py-4 sm:py-6 pb-32 md:pb-10 space-y-6 px-3 sm:px-6 max-w-[100vw] overflow-x-hidden">
        
        {/* Connection Settings Card */}
        <Card className="p-4 sm:p-6 bg-white dark:bg-[#151b2c] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm w-full min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4 w-full min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 break-words">
              <MessageCircle className="w-5 h-5 text-[#00B900] shrink-0" />
              <span>ตั้งค่าการเชื่อมต่อ (LINE Messaging API)</span>
            </h3>
          </div>
          
          <div className="space-y-5 sm:space-y-6 w-full min-w-0">
            <div className="w-full min-w-0">
              <label className="block text-xs sm:text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Channel Access Token</label>
              <div className="relative w-full min-w-0">
                <textarea 
                  className="w-full min-h-[90px] sm:min-h-[100px] p-3 text-xs sm:text-sm rounded-xl border bg-slate-50 dark:bg-[#0b1325] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all border-gray-200 dark:border-gray-700 resize-none pr-12 font-mono break-all"
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
              <p className="text-[11px] sm:text-xs text-gray-500 mt-1">Token มักจะมีความยาวมาก ควรใช้การคัดลอกมาวาง</p>
            </div>
            
            <div className="w-full min-w-0">
              <label className="block text-xs sm:text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Channel Secret</label>
              <div className="relative w-full min-w-0">
                <Input 
                  type={showSecret ? "text" : "password"} 
                  placeholder="ใส่ Channel Secret..." 
                  value={settings.line_channel_secret} 
                  onChange={e => setSettings({...settings, line_channel_secret: e.target.value})} 
                  className="pr-12 text-xs sm:text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute top-[6px] right-3 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 w-full min-w-0 space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-orange-500 shrink-0" /> 
                <span>Webhook URL</span>
              </label>
              <p className="text-[11px] sm:text-xs text-gray-500">นำ URL นี้ไปใส่ใน LINE Developers Console เพื่อรับข้อความ</p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 w-full min-w-0">
                <Input 
                  type="text" 
                  value={webhookUrl} 
                  readOnly 
                  className="bg-white dark:bg-slate-900 font-mono text-xs sm:text-sm w-full min-w-0 truncate"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCopyWebhook} 
                  className="shrink-0 h-10 sm:h-[48px] px-4 font-bold text-xs flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก URL'}</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Auto Reply Template Card */}
        <Card className="p-4 sm:p-6 bg-white dark:bg-[#151b2c] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm w-full min-w-0">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4 w-full min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 break-words">
              <MessageCircle className="w-5 h-5 text-blue-500 shrink-0" />
              <span>ข้อความตอบกลับอัตโนมัติ (Auto-Reply Template)</span>
            </h3>
          </div>
          
          <div className="w-full min-w-0">
            <label className="block text-xs sm:text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">เมื่อมีคนแจ้งเหตุเข้ามา</label>
            <textarea 
              className="w-full p-3.5 text-xs sm:text-sm border rounded-xl bg-slate-50 dark:bg-[#0b1325] text-gray-900 dark:text-gray-100 dark:border-gray-700 min-h-[110px] sm:min-h-[120px] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
              placeholder="รับแจ้งเหตุแล้ว กำลังประสานงานกู้ภัย..."
              value={settings.line_auto_reply_template}
              onChange={e => setSettings({...settings, line_auto_reply_template: e.target.value})}
            ></textarea>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-2">ข้อความนี้จะถูกส่งกลับอัตโนมัติเมื่อระบบได้รับข้อมูลจาก LINE</p>
          </div>
        </Card>

        {/* LINE Users & Activity Log Table with Search & 10-Item Pagination */}
        <Card className="p-4 sm:p-6 bg-white dark:bg-[#151b2c] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm w-full min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4 w-full min-w-0">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 break-words">
                <Users className="w-5 h-5 text-[#00B900] shrink-0" />
                <span>ประวัติและรายชื่อผู้ใช้งาน LINE (LINE Users Log)</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">รายชื่อผู้ใช้งานที่เพิ่มเพื่อนหรือแจ้งเหตุผ่าน LINE Official Account ({filteredUsers.length} รายชื่อ)</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto min-w-0 shrink-0">
              <div className="relative flex-1 sm:w-60 min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <Input 
                  placeholder="ค้นหาชื่อ / LINE ID / รหัสเคส..." 
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9 text-xs h-9 w-full"
                />
              </div>

              <Button variant="outline" size="sm" onClick={fetchLineUsers} disabled={loadingUsers} className="flex items-center justify-center gap-1 shrink-0 h-9 text-xs font-bold">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                <span>รีเฟรช</span>
              </Button>
            </div>
          </div>

          {loadingUsers ? (
            <div className="py-8 text-center text-gray-500 animate-pulse text-xs sm:text-sm font-medium">
              กำลังโหลดข้อมูลผู้ใช้งาน LINE...
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/30 rounded-xl font-medium">
              ไม่พบรายชื่อผู้ใช้งาน LINE ที่ตรงกับคำค้นหา
            </div>
          ) : (
            <>
              {/* 1. Mobile Card List View (Zero Horizontal Scroll on Mobile Screens) */}
              <div className="space-y-3 block md:hidden w-full min-w-0">
                {paginatedUsers.map((user) => (
                  <div key={user.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5 w-full min-w-0">
                    <div className="flex items-center justify-between gap-2 w-full min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {user.picture ? (
                          <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#00B900]/20 text-[#00B900] flex items-center justify-center font-bold text-xs shrink-0">
                            LINE
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{user.name}</p>
                          <p className="font-mono text-[10px] text-slate-500 truncate">ID: {user.id ? `${user.id.substring(0, 14)}...` : '-'}</p>
                        </div>
                      </div>
                      
                      {user.latestCase ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 shrink-0">
                          เคส #{user.latestCase.id}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 shrink-0">ยังไม่มีเคส</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/40 text-[11px] w-full min-w-0">
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 min-w-0 truncate">
                        <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{user.lastActive ? new Date(user.lastActive).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {user.latestCase && (
                          <Link 
                            href={`/tracking/${user.latestCase.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-orange-600 font-bold hover:underline"
                          >
                            <span>ดูเคส</span> <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        <button
                          onClick={() => handleResetUserTest(user.id)}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium"
                        >
                          <RotateCcw className="w-3 h-3" /> <span>รีเซ็ต</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 2. Desktop Table View (For Tablet & Desktop Screens >= md) */}
              <div className="hidden md:block overflow-x-auto w-full custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-slate-50 dark:bg-slate-800/50 text-gray-700 dark:text-gray-300 font-bold">
                      <th className="p-3">ผู้ใช้งาน LINE</th>
                      <th className="p-3">LINE User ID</th>
                      <th className="p-3">เคสล่าสุด</th>
                      <th className="p-3">กิจกรรมล่าสุด</th>
                      <th className="p-3 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {user.picture ? (
                              <img src={user.picture} alt={user.name} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-emerald-400 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#00B900]/20 text-[#00B900] flex items-center justify-center font-bold text-[11px] shrink-0">
                                LINE
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                              {user.statusMessage && (
                                <p className="text-[11px] text-gray-500 max-w-[160px] truncate">{user.statusMessage}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                          {user.id ? `${user.id.substring(0, 12)}...` : '-'}
                        </td>

                        <td className="p-3">
                          {user.latestCase ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              เคส #{user.latestCase.id} ({user.latestCase.type || 'SOS'})
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">ยังไม่มีเคส</span>
                          )}
                        </td>

                        <td className="p-3 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{user.lastActive ? new Date(user.lastActive).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</span>
                          </div>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.latestCase && (
                              <Link 
                                href={`/tracking/${user.latestCase.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-bold shrink-0"
                              >
                                <span>ดูเคส</span> <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                            <button
                              onClick={() => handleResetUserTest(user.id)}
                              title="รีเซ็ตเคสเพื่อทดสอบใหม่"
                              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> <span>รีเซ็ต</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 w-full min-w-0">
                  <div className="text-center sm:text-left">
                    แสดงหน้า {currentPage} จาก {totalPages} หน้า (ทั้งหมด {filteredUsers.length} รายการ)
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-2.5 font-bold text-xs"
                    >
                      <ChevronLeft className="w-4 h-4 mr-0.5" /> ก่อนหน้า
                    </Button>
                    <span className="font-bold text-gray-700 dark:text-gray-300 px-1">
                      {currentPage} / {totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="h-8 px-2.5 font-bold text-xs"
                    >
                      ถัดไป <ChevronRight className="w-4 h-4 ml-0.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 sm:mt-8 w-full min-w-0">
          <Button variant="outline" className="w-full sm:w-auto flex items-center justify-center gap-2 font-bold text-xs sm:text-sm h-11" onClick={handleTestConnection}>
            <MessageCircle className="w-4 h-4 text-[#00B900]" />
            <span>ทดสอบการเชื่อมต่อ</span>
          </Button>
          <Button className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 active:scale-95 flex items-center justify-center gap-2 text-white font-extrabold text-xs sm:text-sm h-11 transition-all" onClick={handleSave} disabled={isSaving || isLoading}>
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
          </Button>
        </div>
      </div>
    </>
  );
}
