'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Save } from 'lucide-react';

interface News {
  id: number;
  title: string;
  content: string;
  imageUrl?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

interface NewsFormModalProps {
  isOpen: boolean;
  news: News | null;
  onClose: () => void;
  onSave: (news: News) => void;
}

export const NewsFormModal: React.FC<NewsFormModalProps> = ({
  isOpen,
  news,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    published: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (news) {
      setFormData({
        title: news.title,
        content: news.content,
        imageUrl: news.imageUrl || '',
        published: news.published,
      });
    } else {
      setFormData({
        title: '',
        content: '',
        imageUrl: '',
        published: true,
      });
    }
    setError('');
  }, [news, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          imageUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('กรุณากรอกหัวข้อและเนื้อหาข่าว');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const method = news ? 'PUT' : 'POST';
      const url = news ? `/api/news/${news.id}` : '/api/news';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save news');
      }

      onSave(formData as News);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {news ? 'แก้ไขข่าวสาร' : 'สร้างข่าวสารใหม่'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              หัวข้อข่าว
            </label>
            <Input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="หัวข้อข่าวสาร"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              เนื้อหาข่าว
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="เนื้อหาข่าวสาร"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              อัปโหลดรูปภาพ (ตัวเลือก)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            />
            {formData.imageUrl && (
              <div className="mt-2">
                <img src={formData.imageUrl} alt="Preview" className="max-h-32 rounded object-contain border border-gray-200 dark:border-gray-700" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published"
              name="published"
              checked={formData.published}
              onChange={handleChange}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label
              htmlFor="published"
              className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              เผยแพร่ข่าว
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
