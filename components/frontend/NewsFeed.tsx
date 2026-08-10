'use client';

import React, { useState, useEffect } from 'react';
import { NewsCard } from '@/components/frontend/NewsCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { Newspaper } from 'lucide-react';

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

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase
          .from('news')
          .select('*')
          .eq('published', true)
          .eq('type', 'news')
          .order('created_at', { ascending: false })
          .limit(20);

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
          type: item.type
        }));

        setNews(newsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching news:', error);
        setLoading(false);
      }
    };

    fetchNews();

    const channel = supabase
      .channel('custom-news-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'news' },
        (payload: any) => {
          setNews((prevNews) => {
            const isNews = (payload.new as any)?.type === 'news';

            if (payload.eventType === 'INSERT') {
              const newNews = payload.new as any;
              if (newNews.published && isNews) {
                const newArr = [{
                  id: newNews.id,
                  title: newNews.title,
                  content: newNews.content,
                  image_url: newNews.image_url,
                  published: newNews.published,
                  created_at: newNews.created_at,
                  updated_at: newNews.updated_at,
                  type: newNews.type
                }, ...prevNews];
                return newArr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              }
              return prevNews;
            } else if (payload.eventType === 'UPDATE') {
              const updatedNews = payload.new as any;
              if (!updatedNews.published || !isNews) {
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
                  type: updatedNews.type
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
                  type: updatedNews.type
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

  if (loading && news.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-xl mx-auto pb-8">
      {/* Header */}
      <div className="mb-6 px-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          ฟีดข่าวสาร
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          อัพเดทสถานการณ์และประกาศจาก OonJai
        </p>
      </div>

      {/* News Stack */}
      {news.length > 0 ? (
        <div className="flex flex-col">
          {news.map((item) => (
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
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-[#151b2c] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-700">
            <Newspaper className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">ไม่มีข่าวสารในขณะนี้</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            ยังไม่มีประกาศหรือการอัปเดตสถานการณ์ใหม่
          </p>
        </div>
      )}
    </div>
  );
};
