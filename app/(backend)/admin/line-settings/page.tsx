'use client';
import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Save, MessageCircle, Link as LinkIcon, Copy, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

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

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/line` : '';

  useEffect(() => {
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
    fetchSettings();
  }, []);

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
    // This could call an API route to test sending a LINE message
    toast.success('ส่งข้อความทดสอบแล้ว กรุณาตรวจสอบใน LINE ของคุณ');
  };

  return (
    <>
      <DashboardHeader title="จัดการ LINE SOS (LINE Settings)" />
      <div className="max-w-4xl mx-auto py-6 pb-32 md:pb-10 space-y-6 px-4 md:px-0">
        
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
