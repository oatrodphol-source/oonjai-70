import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full flex flex-col gap-1">
      {label && <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>}
      <input
        className={`w-full min-h-[48px] px-4 text-base rounded-xl border bg-white dark:bg-[#0b1325] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff6600] focus:border-transparent transition-all ${
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
};
