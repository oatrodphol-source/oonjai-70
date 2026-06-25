'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { NewsManagement } from '@/components/backend/NewsManagement';
import { NewsFormModal } from '@/components/backend/NewsFormModal';
import { NewsDeleteModal } from '@/components/backend/NewsDeleteModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';

interface News {
  id: number;
  title: string;
  content: string;
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

  const handleCreateNews = () => {
    setEditingNews(null);
    setIsFormModalOpen(true);
  };

  const handleEditNews = (news: News) => {
    setEditingNews(news);
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
      <div className="w-full max-w-[100vw] overflow-x-hidden pb-32 md:pb-10 mx-auto py-6 space-y-6">
        {/* Create Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-600 text-white hover:bg-orange-700 px-6 py-3 rounded-lg flex items-center gap-2 font-semibold text-lg"
          >
            <Plus size={20} />
            สร้างประกาศใหม่
          </Button>
        </div>

        {/* News Management Table */}
        <NewsManagement
          onEdit={handleEditNews}
          onDelete={handleDeleteNews}
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
        <div className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4 dark:text-white">แก้ไขข่าวสาร/ประกาศ</h3>
            <input type="text" value={editingNews.title || ''} onChange={(e) => setEditingNews({...editingNews, title: e.target.value})} className="w-full border p-3 rounded-lg mb-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            <textarea value={editingNews.content || ''} onChange={(e) => setEditingNews({...editingNews, content: e.target.value})} rows={4} className="w-full border p-3 rounded-lg mb-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white"></textarea>
            <select value={editingNews.type || 'news'} onChange={(e) => setEditingNews({...editingNews, type: e.target.value})} className="w-full border p-3 rounded-lg mb-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <option value="news">ข่าวสารทั่วไป</option>
              <option value="announcement">🚨 ประกาศด่วน (แจ้งเตือน)</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingNews(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">ยกเลิก</button>
              <button onClick={async () => {
                if(editingNews.id) {
                  await updateDoc(doc(db, 'news', editingNews.id.toString()), {
                    title: editingNews.title, content: editingNews.content, type: editingNews.type, updated_at: new Date().toISOString()
                  });
                }
                setEditingNews(null);
              }} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">บันทึกการแก้ไข</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4 dark:text-white">สร้างข่าวสาร/ประกาศใหม่</h3>
            <input type="text" id="newsTitle" placeholder="หัวข้อข่าว" className="w-full border p-3 rounded-lg mb-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            <textarea id="newsContent" placeholder="เนื้อหาข่าว..." rows={4} className="w-full border p-3 rounded-lg mb-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white"></textarea>
            <select id="newsType" className="w-full border p-3 rounded-lg mb-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <option value="news">ข่าวสารทั่วไป</option>
              <option value="announcement">🚨 ประกาศด่วน (แจ้งเตือน)</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">ยกเลิก</button>
              <button onClick={async () => {
                const title = (document.getElementById('newsTitle') as HTMLInputElement).value;
                const content = (document.getElementById('newsContent') as HTMLTextAreaElement).value;
                const type = (document.getElementById('newsType') as HTMLSelectElement).value;
                if(title) {
                  await addDoc(collection(db, 'news'), { title, content, type, status: 'เผยแพร่', created_at: new Date().toISOString() });
                  setShowAddModal(false);
                }
              }} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">บันทึกและเผยแพร่</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
