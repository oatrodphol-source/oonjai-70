'use client';

import React, { useState, useEffect } from 'react';
import { NewsCard } from '@/components/frontend/NewsCard';
import { supabase } from '@/lib/supabase';
import { Newspaper, Search, Filter, Megaphone, Sparkles, RefreshCw } from 'lucide-react';

interface News {
  id: string | number;
  title: string;
  content: string;
  image_url?: string;
  author_id?: number;
  published: boolean;
  created_at: string;
  updated_at: string;
  type?: string;
}

export const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'announcement' | 'news'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.warn('⚠️ ข้ามการโหลดข่าว (ดึงข้อมูลไม่สำเร็จ):', error);
        setLoading(false);
        return;
      }

      const newsData: News[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        image_url: item.image_url,
        published: item.published,
        created_at: item.created_at,
        updated_at: item.updated_at,
        type: item.type || 'news'
      }));

      setNews(newsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching news:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();

    const channel = supabase
      .channel('custom-news-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'news' },
        (payload: any) => {
          setNews((prevNews) => {
            if (payload.eventType === 'INSERT') {
              const newNews = payload.new as any;
              if (newNews.published) {
                const newArr = [{
                  id: newNews.id,
                  title: newNews.title,
                  content: newNews.content,
                  image_url: newNews.image_url,
                  published: newNews.published,
                  created_at: newNews.created_at,
                  updated_at: newNews.updated_at,
                  type: newNews.type || 'news'
                }, ...prevNews];
                return newArr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              }
              return prevNews;
            } else if (payload.eventType === 'UPDATE') {
              const updatedNews = payload.new as any;
              if (!updatedNews.published) {
                return prevNews.filter((n: any) => n.id !== updatedNews.id);
              }
              const exists = prevNews.find(n => n.id === updatedNews.id);
              if (exists) {
                return prevNews.map(n => n.id === updatedNews.id ? {
                  id: updatedNews.id,
                  title: updatedNews.title,
                  content: updatedNews.content,
                  image_url: updatedNews.image_url,
                  published: updatedNews.published,
                  created_at: updatedNews.created_at,
                  updated_at: updatedNews.updated_at,
                  type: updatedNews.type || 'news'
                } : n);
              } else {
                const newArr = [{
                  id: updatedNews.id,
                  title: updatedNews.title,
                  content: updatedNews.content,
                  image_url: updatedNews.image_url,
                  published: updatedNews.published,
                  created_at: updatedNews.created_at,
                  updated_at: updatedNews.updated_at,
                  type: updatedNews.type || 'news'
                }, ...prevNews];
                return newArr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              }
            } else if (payload.eventType === 'DELETE') {
              return prevNews.filter(n => n.id !== payload.old.id);
            }
            return prevNews;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered News based on Tab & Search Query
  const filteredNews = news.filter((item) => {
    const matchesTab = 
      activeTab === 'all' ? true :
      activeTab === 'announcement' ? item.type === 'announcement' :
      item.type !== 'announcement';

    const matchesSearch = 
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="mb-6 px-1">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-[#ff6600]">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-wide">
                ฟีดข่าวสารฉุกเฉิน
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                อัปเดตสถานการณ์ภัยพิบัติและประกาศจากศูนย์กู้ภัยอุ่นใจ
              </p>
            </div>
          </div>

          <button
            onClick={fetchNews}
            className="p-2 text-gray-400 hover:text-[#ff6600] dark:hover:text-[#ff6600] rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="รีเฟรชข่าวสาร"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="mt-4 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาประกาศหรือคีย์เวิร์ด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0b1325] border border-gray-200 dark:border-gray-800 rounded-2xl text-xs sm:text-sm outline-none focus:border-[#ff6600] transition-colors placeholder:text-gray-400 shadow-sm"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#ff6600] text-white shadow-md shadow-orange-500/20'
                  : 'bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              ทั้งหมด ({news.length})
            </button>

            <button
              onClick={() => setActiveTab('announcement')}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'announcement'
                  ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                  : 'bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              📢 ประกาศด่วน ({news.filter(n => n.type === 'announcement').length})
            </button>

            <button
              onClick={() => setActiveTab('news')}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'news'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              📰 ข่าวสารทั่วไป ({news.filter(n => n.type !== 'announcement').length})
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton Cards */}
      {loading && news.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white dark:bg-[#0b1325] rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                </div>
              </div>
              <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
              <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
            </div>
          ))}
        </div>
      ) : filteredNews.length > 0 ? (
        <div className="space-y-4">
          {filteredNews.map((item) => (
            <NewsCard
              key={item.id}
              id={item.id}
              title={item.title}
              content={item.content}
              imageUrl={item.image_url}
              created_at={item.created_at}
              published={item.published}
              type={item.type}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-[#0b1325] rounded-3xl border border-gray-100 dark:border-gray-800/80 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-700">
            <Newspaper className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
            ไม่พบข่าวสารในหมวดหมู่นี้
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ลองเลือกหมวดหมู่อื่น หรือค้นหาด้วยคีย์เวิร์ดใหม่อีกครั้ง
          </p>
        </div>
      )}
    </div>
  );
};
