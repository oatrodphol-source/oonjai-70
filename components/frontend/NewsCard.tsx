'use client';

import React, { useState } from 'react';
import { Share2, Check, ExternalLink, X, ZoomIn, ShieldCheck, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface NewsCardProps {
  id: string | number;
  title: string;
  content: string;
  imageUrl?: string;
  authorName?: string;
  created_at: string;
  published?: boolean;
  type?: string;
}

export const NewsCard: React.FC<NewsCardProps> = ({
  id,
  title,
  content,
  imageUrl,
  authorName,
  created_at,
  published = true,
  type,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isLongContent = content.length > 150;

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: content,
          url: shareUrl,
        });
        return;
      } catch (error) {}
    }
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('คัดลอกลิงก์ข่าวสารเรียบร้อยแล้ว!', { duration: 3000 });
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {}
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleLineShare = () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const text = `ประกาศจากศูนย์กู้ภัยอุ่นใจ: ${title}\nอ่านต่อที่: ${shareUrl}`;
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white dark:bg-[#0b1325] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/80 overflow-hidden transition-all hover:border-gray-200 dark:hover:border-gray-700">
      
      {/* Header Profile Section */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-gray-50 dark:border-gray-800/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0b1325] border border-[#ff6600]/40 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            <img src="/icon01.ico" alt="Author Mascot" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm">
                ศูนย์ช่วยเหลืออุ่นใจ
              </h4>
              <ShieldCheck className="w-4 h-4 text-[#ff6600]" />
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
              <Clock className="w-3 h-3 text-gray-400" />
              <span>{formatDate(created_at)}</span>
              <span>•</span>
              <span className="font-semibold text-gray-500 dark:text-gray-400">
                {type === 'announcement' ? 'ประกาศทางการ' : 'ข่าวสารกู้ภัย'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Category Badge */}
        {type === 'announcement' ? (
          <span className="bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800 shrink-0">
            📢 ประกาศด่วน
          </span>
        ) : (
          <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
            📰 ข่าวสาร
          </span>
        )}
      </div>

      {/* Title & Body Content */}
      <div className="p-4 sm:p-5">
        <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mb-2 leading-snug">
          {title}
        </h3>

        <p className={`text-gray-700 dark:text-gray-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${!isExpanded && isLongContent ? 'line-clamp-3' : ''}`}>
          {content}
        </p>

        {isLongContent && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#ff6600] hover:underline text-xs font-extrabold mt-2 cursor-pointer transition-colors"
          >
            {isExpanded ? 'ย่อเนื้อหา ▴' : 'อ่านเพิ่มเติม ▾'}
          </button>
        )}
      </div>

      {/* Image Preview Container */}
      {imageUrl && (
        <div 
          className="w-full h-56 sm:h-72 bg-gray-100 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800 overflow-hidden cursor-pointer relative group"
          onClick={() => setSelectedImage(imageUrl)}
        >
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-bold text-xs">
            <ZoomIn className="w-5 h-5" />
            <span>แตะเพื่อดูภาพขยาย HD</span>
          </div>
        </div>
      )}

      {/* Footer Share Action Buttons */}
      <div className="p-3 sm:p-4 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-[#0b1325]/50">
        <button 
          onClick={handleShare}
          className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-[#ff6600] dark:hover:text-[#ff6600] transition-colors text-xs font-bold px-3 py-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/30 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
          {copied ? 'คัดลอกลิงก์แล้ว' : 'แชร์ข่าว'}
        </button>

        <button 
          onClick={handleLineShare}
          className="flex items-center gap-1.5 text-white bg-[#00B900] hover:bg-[#009900] active:scale-95 transition-all text-xs font-extrabold px-3.5 py-2 rounded-xl shadow-sm shadow-green-500/20 cursor-pointer"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.938 8.878 9.4 9.613.367.081.871.251.996.584.113.3.072.766.035 1.055l-.161 1.002c-.05.312-.243 1.189 1.042.647 1.284-.542 6.924-4.083 9.444-7.551 2.148-2.955 3.244-5.305 3.244-5.35zM7.556 12.981h-2.31c-.135 0-.244-.11-.244-.244v-5.289c0-.135.11-.244.244-.244.134 0 .244.109.244.244v5.045h2.066c.135 0 .244.11.244.244 0 .135-.11.244-.244.244zm2.147-.244c0 .135-.11.244-.244.244-.135 0-.244-.11-.244-.244v-5.289c0-.135.11-.244.244-.244.135 0 .244.109.244.244v5.289zm4.27 0h-2.31c-.135 0-.244-.11-.244-.244v-5.289c0-.135.11-.244.244-.244.134 0 .244.109.244.244v2.428l1.713-2.502c.038-.057.101-.091.169-.091h.239c.17 0 .25.211.123.324l-1.854 2.13 1.93 2.585c.099.132.004.32-.162.32h-.249c-.075 0-.146-.035-.189-.095l-1.637-2.31v2.18c0 .135-.11.244-.244.244zm5.029-4.015c0 .135-.11.244-.244.244h-1.613v1.272h1.613c.135 0 .244.11.244.244 0 .135-.11.244-.244.244h-1.857c-.135 0-.244-.11-.244-.244v-5.289c0-.135.11-.244.244-.244h1.857c.135 0 .244.109.244.244 0 .135-.11.244-.244.244h-1.613v1.171h1.613c.135 0 .244.109.244.244z"/></svg>
          แชร์ผ่าน LINE
        </button>
      </div>

      {/* Full-screen HD Image Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2.5 bg-black/60 rounded-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
          >
            <X className="w-6 h-6" />
          </button>

          <img 
            src={selectedImage} 
            alt="Full size HD preview" 
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200"
          />
        </div>
      )}
    </div>
  );
};
