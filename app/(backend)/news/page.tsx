'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { NewsManagement } from '@/components/backend/NewsManagement';
import { NewsFormModal } from '@/components/backend/NewsFormModal';
import { NewsDeleteModal } from '@/components/backend/NewsDeleteModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

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
    setIsFormModalOpen(true);
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
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        {/* Create Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleCreateNews}
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

      {/* Form Modal */}
      <NewsFormModal
        isOpen={isFormModalOpen}
        news={editingNews}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveNews}
      />

      {/* Delete Modal */}
      <NewsDeleteModal
        isOpen={isDeleteModalOpen}
        newsTitle={deleteNewsTitle}
        newsId={deleteNewsId}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
