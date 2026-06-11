'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Calendar, User, X } from 'lucide-react';

interface NewsCardProps {
  id: string | number;
  title: string;
  content: string;
  imageUrl?: string;
  authorName?: string;
  createdAt: string;
  published?: boolean;
}

export const NewsCard: React.FC<NewsCardProps> = ({
  id,
  title,
  content,
  imageUrl,
  authorName,
  createdAt,
  published = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const isLongContent = content.length > 100;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: content,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('คัดลอกลิงก์เรียบร้อยแล้ว');
    }
  };

  const truncateContent = (text: string, length: number = 150) => {
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLineShare = () => {
    const text = `ประกาศจากอุ่นใจ: ${title} - อ่านต่อ: ${window.location.href}`;
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white dark:bg-[#151b2c] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden mb-6">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 flex items-center justify-center overflow-hidden flex-shrink-0">
             <img src="/icon01.ico" alt="Author" className="w-6 h-6 object-cover" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">ศูนย์ช่วยเหลืออุ่นใจ</h4>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{formatDate(createdAt)}</span>
              <span>•</span>
              <span>{published ? 'สาธารณะ' : 'ส่วนตัว'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
          {title}
        </h3>
        <p className={`text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap ${!isExpanded && isLongContent ? 'line-clamp-3' : ''}`}>
          {content}
        </p>
        {isLongContent && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium mt-1 transition-colors"
          >
            {isExpanded ? 'ย่อเนื้อหา' : 'อ่านเพิ่มเติม'}
          </button>
        )}
      </div>

      {/* Image */}
      {imageUrl && (
        <div 
          className="w-full max-h-72 bg-gray-100 dark:bg-gray-900 border-t border-b border-gray-100 dark:border-gray-800 overflow-hidden flex items-center justify-center cursor-pointer"
          onClick={() => setSelectedImage(imageUrl)}
        >
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full max-h-72 object-contain object-center"
          />
        </div>
      )}

      {/* Footer / Actions */}
      <div className="px-4 py-3 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#151b2c]">
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-500 transition-colors text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
          แชร์
        </button>
        <button 
          onClick={handleLineShare}
          className="flex items-center gap-2 text-white bg-[#00B900] hover:bg-[#009900] transition-colors text-sm font-bold px-3 py-1.5 rounded-lg shadow-sm shadow-green-500/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.938 8.878 9.4 9.613.367.081.871.251.996.584.113.3.072.766.035 1.055l-.161 1.002c-.05.312-.243 1.189 1.042.647 1.284-.542 6.924-4.083 9.444-7.551 2.148-2.955 3.244-5.305 3.244-5.35zM7.556 12.981h-2.31c-.135 0-.244-.11-.244-.244v-5.289c0-.135.11-.244.244-.244.134 0 .244.109.244.244v5.045h2.066c.135 0 .244.11.244.244 0 .135-.11.244-.244.244zm2.147-.244c0 .135-.11.244-.244.244-.135 0-.244-.11-.244-.244v-5.289c0-.135.11-.244.244-.244.135 0 .244.109.244.244v5.289zm4.27 0h-2.31c-.135 0-.244-.11-.244-.244v-5.289c0-.135.11-.244.244-.244.134 0 .244.109.244.244v2.428l1.713-2.502c.038-.057.101-.091.169-.091h.239c.17 0 .25.211.123.324l-1.854 2.13 1.93 2.585c.099.132.004.32-.162.32h-.249c-.075 0-.146-.035-.189-.095l-1.637-2.31v2.18c0 .135-.11.244-.244.244zm5.029-4.015c0 .135-.11.244-.244.244h-1.613v1.272h1.613c.135 0 .244.11.244.244 0 .135-.11.244-.244.244h-1.857c-.135 0-.244-.11-.244-.244v-5.289c0-.135.11-.244.244-.244h1.857c.135 0 .244.109.244.244 0 .135-.11.244-.244.244h-1.613v1.171h1.613c.135 0 .244.109.244.244z"/></svg>
          แชร์ผ่าน LINE
        </button>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2 bg-black/50 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={selectedImage} 
            alt="Full size preview" 
            className="w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
