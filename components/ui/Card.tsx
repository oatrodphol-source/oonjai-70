import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  glass = false, 
  className = '', 
  ...props 
}) => {
  const baseStyle = 'rounded-2xl p-6';
  const styleClass = glass 
    ? 'glass-card' 
    : 'bg-white dark:bg-[#151b2c] shadow-md border border-gray-100 dark:border-gray-800';

  return (
    <div className={`${baseStyle} ${styleClass} ${className}`} {...props}>
      {children}
    </div>
  );
};
