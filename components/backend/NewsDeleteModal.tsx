'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface NewsDeleteModalProps {
  isOpen: boolean;
  newsTitle: string;
  newsId: number;
  onClose: () => void;
  onConfirm: (id: number) => void;
}

export const NewsDeleteModal: React.FC<NewsDeleteModalProps> = ({
  isOpen,
  newsTitle,
  newsId,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/news/${newsId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onConfirm(newsId);
        onClose();
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={32} />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              ลบข่าวสาร?
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              คุณต้องการลบข่าว "<strong>{newsTitle}</strong>" หรือไม่?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              การกระทำนี้ไม่สามารถยกเลิกได้
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg disabled:opacity-50"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg disabled:opacity-50"
            >
              {loading ? 'กำลังลบ...' : 'ลบข่าว'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
