'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Edit2, Trash2 } from 'lucide-react';

interface News {
  id: number;
  title: string;
  content: string;
  imageUrl?: string;
  author_id?: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

interface NewsManagementProps {
  onEdit: (news: News) => void;
  onDelete: (newsId: number, title: string) => void;
  refreshTrigger?: number;
}

export const NewsManagement: React.FC<NewsManagementProps> = ({
  onEdit,
  onDelete,
  refreshTrigger,
}) => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchNews();
  }, [search, rowsPerPage, currentPage, refreshTrigger]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: rowsPerPage.toString(),
        offset: (currentPage * rowsPerPage).toString(),
      });

      const res = await fetch(`/api/news?${params}`);
      if (res.ok) {
        const data = await res.json();
        let filteredNews = data.news;

        if (search) {
          filteredNews = filteredNews.filter(
            (item: News) =>
              item.title.toLowerCase().includes(search.toLowerCase()) ||
              item.content.toLowerCase().includes(search.toLowerCase())
          );
        }

        setNews(filteredNews);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const truncateContent = (content: string, length: number = 100) => {
    return content.length > length ? content.substring(0, length) + '...' : content;
  };

  const totalPages = Math.ceil((total || news.length) / rowsPerPage);

  return (
    <Card>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            จัดการข่าวสาร
          </h2>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Input
            type="text"
            placeholder="ค้นหาหัวข้อหรือเนื้อหาข่าว..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(0);
            }}
            className="flex-1"
          />

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              แสดง:
            </span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-gray-900"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  ไอดี
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  หัวข้อข่าว
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  เนื้อหา
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">
                  สถานะ
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                  วันที่สร้าง
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">
                  การกระทำ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : news.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    ไม่พบข่าวสาร
                  </td>
                </tr>
              ) : (
                news.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                      {item.id}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium max-w-xs truncate">
                      {item.title}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-md">
                      {truncateContent(item.content)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        className={
                          item.published
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }
                      >
                        {item.published ? 'เผยแพร่' : 'ร่าง'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3 flex items-center justify-center gap-2">
                      <Button
                        onClick={() => onEdit(item)}
                        className="p-2 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900 rounded"
                        title="แก้ไข"
                      >
                        <Edit2 size={18} />
                      </Button>
                      <Button
                        onClick={() => onDelete(item.id, item.title)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                        title="ลบ"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            แสดง {news.length === 0 ? 0 : currentPage * rowsPerPage + 1} ถึง{' '}
            {Math.min((currentPage + 1) * rowsPerPage, total)} จาก {total} รายการ
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 dark:text-white"
            >
              ก่อนหน้า
            </Button>

            {/* Page numbers */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i).map((page) => (
                <Button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white'
                  }`}
                >
                  {page + 1}
                </Button>
              ))}
            </div>

            <Button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 dark:text-white"
            >
              ถัดไป
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
