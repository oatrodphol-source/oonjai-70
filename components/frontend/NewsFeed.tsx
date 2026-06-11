'use client';

import React, { useState, useEffect } from 'react';
import { NewsCard } from '@/components/frontend/NewsCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface News {
  id: number;
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
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async (page: number = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '6',
        offset: (page * 6).toString(),
        published: 'true',
      });

      const res = await fetch(`/api/news?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (page === 0) {
          setNews(data.news);
        } else {
          setNews((prev) => [...prev, ...data.news]);
        }
        setHasMore(data.news.length === 6);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchNews(nextPage);
  };

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
        <>
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

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'กำลังโหลด...' : 'โหลดข่าวเพิ่มเติม'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-[#151b2c] rounded-xl border border-gray-100 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            ไม่พบข่าวสารในขณะนี้
          </p>
        </div>
      )}
    </div>
  );
};
