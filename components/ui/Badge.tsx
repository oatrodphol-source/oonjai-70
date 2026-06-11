import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'wait' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'danger' | 'warning' | 'success' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info', className = '' }) => {
  const variants = {
    wait: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    info: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
