'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { NewsManagement } from '@/components/backend/NewsManagement';
import { NewsFormModal } from '@/components/backend/NewsFormModal';
import { NewsDeleteModal } from '@/components/backend/NewsDeleteModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface News {
  id: number;
  title: string;
  content: string;
  type?: string;
  status?: string;
  imageUrl?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export default function NewsPage() {
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteNewsTitle, setDeleteNewsTitle] = useState('');
  const [deleteNewsId, setDeleteNewsId] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const resetImageState = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `news/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleCreateNews = () => {
    setEditingNews(null);
    setIsFormModalOpen(true);
  };

  const handleEditNews = (news: News) => {
    setEditingNews(news);
    setImagePreview(news.imageUrl || null);
    setImageFile(null);
  };

  const handleDeleteNews = (newsId: number, title: string) => {
    setDeleteNewsId(newsId);
    setDeleteNewsTitle(title);
    setIsDeleteModalOpen(true);
  };

  const handleSaveNews = () => {
    setRefreshTrigger((prev) => prev + 1);
    setIsFormModalOpen(false);
  };

  const handleConfirmDelete = (id: number) => {
    setRefreshTrigger((prev) => prev + 1);
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      <DashboardHeader title="จัดการข่าวสาร" />
      <div className="w-full px-4 lg:px-8 pb-32 md:pb-10 mx-auto py-6 space-y-6 max-w-7xl">
        {/* News Management Table */}
        <NewsManagement
          onEdit={handleEditNews}
          onDelete={handleDeleteNews}
          onCreate={() => { setShowAddModal(true); resetImageState(); }}
          refreshTrigger={refreshTrigger}
        />

        {/* Security Note */}
        <Card className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800">
          <div className="p-4 text-sm text-blue-800 dark:text-blue-200">
            🔒 <strong>Secured by OonJai System</strong> - เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการข่าวสารได้
          </div>
        </Card>
      </div>

      {editingNews && (
        <div className="fixed inset-0 bg-black/60 z-[3000] flex items-end md:items-center justify-center p-0 md:p-4 transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
            <h3 className="text-xl font-bold mb-5 text-slate-800 dark:text-white">แก้ไขข่าวสาร/ประกาศ</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">หัวข้อข่าว</label>
                <input type="text" value={editingNews.title || ''} onChange={(e) => setEditingNews({...editingNews, title: e.target.value})} className="w-full border border-slate-300 dark:border-slate-700 p-3.5 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-shadow" placeholder="พิมพ์หัวข้อ..." />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ประเภท</label>
                <select value={editingNews.type || 'news'} onChange={(e) => setEditingNews({...editingNews, type: e.target.value})} className="w-full border border-slate-300 dark:border-slate-700 p-3.5 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="news">📰 ข่าวสารทั่วไป</option>
                  <option value="announcement">🚨 ประกาศด่วน (แจ้งเตือน)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">รายละเอียดเนื้อหา</label>
                <textarea value={editingNews.content || ''} onChange={(e) => setEditingNews({...editingNews, content: e.target.value})} rows={5} className="w-full border border-slate-300 dark:border-slate-700 p-3.5 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-shadow" placeholder="พิมพ์เนื้อหาข่าวสารที่นี่..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">รูปภาพประกอบ (ถ้ามี)</label>
                <div className="flex flex-col gap-3">
                  {imagePreview && (
                    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => { setImageFile(null); setImagePreview(null); setEditingNews({...editingNews, imageUrl: undefined}); }}
                        className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-lg backdrop-blur-sm transition-colors shadow-sm"
                      >
                         <X size={16} strokeWidth={3} />
                      </button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="w-full text-sm text-slate-500 dark:text-slate-400
                      file:mr-4 file:py-3 file:px-4
                      file:rounded-xl file:border-0
                      file:text-sm file:font-semibold
                      file:bg-orange-50 file:text-orange-700
                      dark:file:bg-orange-900/30 dark:file:text-orange-400
                      hover:file:bg-orange-100 dark:hover:file:bg-orange-900/50
                      border border-slate-300 dark:border-slate-700 rounded-xl p-1.5
                      transition-colors cursor-pointer bg-white dark:bg-slate-800" 
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-8">
              <button disabled={isUploading} onClick={() => { setEditingNews(null); resetImageState(); }} className="w-full sm:w-auto px-6 py-3.5 text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors disabled:opacity-50">
                ยกเลิก
              </button>
              <button disabled={isUploading} onClick={async () => {
                if(editingNews.id) {
                  setIsUploading(true);
                  let finalImageUrl = editingNews.imageUrl;
                  if (imageFile) {
                    const uploadedUrl = await uploadImage(imageFile);
                    if (uploadedUrl) finalImageUrl = uploadedUrl;
                  } else if (imagePreview === null) {
                    finalImageUrl = null as any; // user deleted the image
                  }
                  
                  await supabase.from('news').update({
                    title: editingNews.title, content: editingNews.content, type: editingNews.type, image_url: finalImageUrl, updated_at: new Date().toISOString()
                  }).eq('id', editingNews.id);
                  
                  setIsUploading(false);
                  setEditingNews(null);
                  resetImageState();
                  setRefreshTrigger(prev => prev + 1);
                }
              }} className="w-full sm:w-auto px-6 py-3.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-bold shadow-md transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
                {isUploading ? <span className="animate-pulse">กำลังบันทึก...</span> : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[3000] flex items-end md:items-center justify-center p-0 md:p-4 transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
            <h3 className="text-xl font-bold mb-5 text-slate-800 dark:text-white">สร้างข่าวสาร/ประกาศใหม่</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">หัวข้อข่าว</label>
                <input type="text" id="newsTitle" className="w-full border border-slate-300 dark:border-slate-700 p-3.5 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-shadow" placeholder="พิมพ์หัวข้อข่าว..." />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ประเภท</label>
                <select id="newsType" className="w-full border border-slate-300 dark:border-slate-700 p-3.5 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="news">📰 ข่าวสารทั่วไป</option>
                  <option value="announcement">🚨 ประกาศด่วน (แจ้งเตือน)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">รายละเอียดเนื้อหา</label>
                <textarea id="newsContent" rows={5} className="w-full border border-slate-300 dark:border-slate-700 p-3.5 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-shadow" placeholder="พิมพ์เนื้อหาข่าวสารที่นี่..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">รูปภาพประกอบ (ถ้ามี)</label>
                <div className="flex flex-col gap-3">
                  {imagePreview && (
                    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-lg backdrop-blur-sm transition-colors shadow-sm"
                      >
                         <X size={16} strokeWidth={3} />
                      </button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="w-full text-sm text-slate-500 dark:text-slate-400
                      file:mr-4 file:py-3 file:px-4
                      file:rounded-xl file:border-0
                      file:text-sm file:font-semibold
                      file:bg-orange-50 file:text-orange-700
                      dark:file:bg-orange-900/30 dark:file:text-orange-400
                      hover:file:bg-orange-100 dark:hover:file:bg-orange-900/50
                      border border-slate-300 dark:border-slate-700 rounded-xl p-1.5
                      transition-colors cursor-pointer bg-white dark:bg-slate-800" 
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-8">
              <button disabled={isUploading} onClick={() => { setShowAddModal(false); resetImageState(); }} className="w-full sm:w-auto px-6 py-3.5 text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors disabled:opacity-50">
                ยกเลิก
              </button>
              <button disabled={isUploading} onClick={async () => {
                const title = (document.getElementById('newsTitle') as HTMLInputElement).value;
                const content = (document.getElementById('newsContent') as HTMLTextAreaElement).value;
                const type = (document.getElementById('newsType') as HTMLSelectElement).value;
                if(title) {
                  setIsUploading(true);
                  let finalImageUrl = null;
                  if (imageFile) {
                    finalImageUrl = await uploadImage(imageFile);
                  }
                  await supabase.from('news').insert({ title, content, type, image_url: finalImageUrl, status: 'เผยแพร่', published: true, created_at: new Date().toISOString() });
                  
                  setIsUploading(false);
                  setShowAddModal(false);
                  resetImageState();
                  setRefreshTrigger(prev => prev + 1);
                }
              }} className="w-full sm:w-auto px-6 py-3.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-bold shadow-md transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
                {isUploading ? <span className="animate-pulse">กำลังบันทึก...</span> : 'บันทึกและเผยแพร่'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
