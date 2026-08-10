'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Edit2, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface News {
  id: number;
  title: string;
  content: string;
  imageUrl?: string;
  author_id?: number;
  published: boolean;
  type?: string;
  created_at: string;
  updated_at: string;
}

interface NewsManagementProps {
  onEdit: (news: News) => void;
  onDelete: (newsId: number, title: string) => void;
  onCreate?: () => void;
  refreshTrigger?: number;
}

export const NewsManagement: React.FC<NewsManagementProps> = ({
  onEdit,
  onDelete,
  onCreate,
  refreshTrigger,
}) => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase
          .from('news')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching news:', error);
          setLoading(false);
          return;
        }

        const newsData = data as News[];
        
        let filteredNews = newsData;
        if (search) {
          filteredNews = filteredNews.filter(
            (item) =>
              item.title?.toLowerCase().includes(search.toLowerCase()) ||
              item.content?.toLowerCase().includes(search.toLowerCase())
          );
        }
        
        setNews(filteredNews);
        setTotal(newsData.length);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching news:', error);
        setLoading(false);
      }
    };

    fetchNews();

    const channel = supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'news' },
        () => {
          fetchNews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [search, refreshTrigger]);

  const truncateContent = (content: string, length: number = 100) => {
    return content.length > length ? content.substring(0, length) + '...' : content;
  };

  const togglePublishStatus = async (item: News) => {
    try {
      const newStatus = !item.published;
      const { error } = await supabase
        .from('news')
        .update({ published: newStatus })
        .eq('id', item.id);
        
      if (error) throw error;
      toast.success(`อัปเดตสถานะข่าว "${item.title}" เรียบร้อยแล้ว`);
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const totalPages = Math.ceil((total || news.length) / rowsPerPage);

  return (
    <Card>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              รายการข่าวสารและประกาศ
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              จัดการข้อมูลข่าวสารและการแจ้งเตือนทั้งหมดในระบบ
            </p>
          </div>
          {onCreate && (
            <Button
              onClick={onCreate}
              className="w-full sm:w-auto bg-orange-600 text-white hover:bg-orange-700 px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium shadow-sm transition-colors"
            >
              <Plus size={18} strokeWidth={2.5} />
              สร้างประกาศใหม่
            </Button>
          )}
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

        {/* Mobile View (Cards) */}
        <div className="block lg:hidden space-y-4">
          {loading ? (
            <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
          ) : news.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">ไม่พบข่าวสาร</div>
          ) : (
            (news || [])
              .slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
              .map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(item.created_at).toLocaleDateString('th-TH')}</p>
                  </div>
                  {item.type === 'announcement' ? (
                    <span className="bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shrink-0">
                      🚨 ประกาศด่วน
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-xs px-2.5 py-1 rounded-full font-medium shrink-0">
                      📰 ข่าวสารทั่วไป
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {item.content || '-'}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePublishStatus(item)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                        item.published !== false ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        item.published !== false ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </button>
                    <span className={`text-xs font-medium ${item.published !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {item.published !== false ? 'เผยแพร่' : 'ไม่เผยแพร่'}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={() => onEdit(item)} className="p-1.5 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900 rounded">
                      <Edit2 size={16} />
                    </Button>
                    <Button 
                      onClick={async () => { 
                        if(window.confirm('ยืนยันการลบข่าวสาร/ประกาศนี้?')) { 
                          const { error } = await supabase.from('news').delete().eq('id', item.id);
                          if (error) console.error('Error deleting news:', error);
                        } 
                      }} 
                      className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden lg:block w-full overflow-x-auto hide-scrollbar rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <table className="table-fixed w-full min-w-[900px] text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3.5 text-left font-semibold text-slate-700 dark:text-slate-300 w-[6%]">
                  ไอดี
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-slate-700 dark:text-slate-300 w-[24%]">
                  หัวข้อข่าว
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-slate-700 dark:text-slate-300 w-[15%]">
                  ประเภท
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-slate-700 dark:text-slate-300 w-[25%]">
                  เนื้อหา
                </th>
                <th className="px-4 py-3.5 text-center font-semibold text-slate-700 dark:text-slate-300 w-[10%]">
                  สถานะ
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-slate-700 dark:text-slate-300 w-[10%]">
                  วันที่สร้าง
                </th>
                <th className="px-4 py-3.5 text-center font-semibold text-slate-700 dark:text-slate-300 w-[10%]">
                  การกระทำ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : news.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    ไม่พบข่าวสาร
                  </td>
                </tr>
              ) : (
                (news || [])
                  .slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
                  .map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                      {item.id}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium truncate">
                      {item.title}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {item.type === 'announcement' ? (
                        <span className="bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1 w-max">
                          🚨 ประกาศด่วน
                        </span>
                      ) : (
                        <span className="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-xs px-3 py-1.5 rounded-full font-medium w-max">
                          📰 ข่าวสารทั่วไป
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <div className="truncate max-w-[200px] xl:max-w-xs">{truncateContent(item.content)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => togglePublishStatus(item)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                            item.published !== false ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                          title={item.published !== false ? 'เผยแพร่แล้ว' : 'ไม่เผยแพร่'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              item.published !== false ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`text-sm font-medium ${item.published !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {item.published !== false ? 'เผยแพร่' : 'ไม่เผยแพร่'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3 flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(item)}
                        className="p-2 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900 rounded transition-colors"
                        title="แก้ไข"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={async () => { 
                          if(window.confirm('ยืนยันการลบข่าวสาร/ประกาศนี้?')) { 
                            const { error } = await supabase.from('news').delete().eq('id', item.id);
                            if (error) console.error('Error deleting news:', error);
                          } 
                        }}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                        title="ลบ"
                      >
                        <Trash2 size={18} />
                      </button>
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
