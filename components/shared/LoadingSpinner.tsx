import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-800"></div>
        <div className="absolute inset-0 rounded-full border-4 border-[#ff6600] border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-[#ff6600] animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};
