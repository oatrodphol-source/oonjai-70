import React from 'react';
import { NewsFeed } from '@/components/frontend/NewsFeed';

export default function FeedPage() {
  return (
    <div className="p-4 sm:p-6 pb-24 max-w-6xl mx-auto">
      <NewsFeed />
    </div>
  );
}
