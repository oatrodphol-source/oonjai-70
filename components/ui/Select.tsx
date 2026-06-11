import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className = '', ...props }) => {
  return (
    <div className="w-full flex flex-col gap-1">
      {label && <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>}
      <div className="relative">
        <select
          className={`w-full h-11 px-4 appearance-none rounded-xl border bg-white dark:bg-[#0b1325] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ff6600] focus:border-transparent transition-all ${
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
};
