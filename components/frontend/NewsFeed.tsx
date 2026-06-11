'use client';

import React, { useState, useEffect } from 'react';
import { NewsCard } from '@/components/frontend/NewsCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
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
}

export const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'news'),
      where('published', '==', true),
      orderBy('created_at', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const newsData: News[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        newsData.push({
          id: doc.id,
          title: data.title,
          content: data.content,
          image_url: data.image_url,
          published: data.published,
          created_at: data.created_at,
          updated_at: data.updated_at
        });
      });
      setNews(newsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching news:', error);
      setLoading(false);
    });

    return () => unsub();
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
              createdAt={item.created_at}
              published={item.published}
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
