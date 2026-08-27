import React from 'react';
import { getSeveritySolidColor } from '@/lib/utils';

export const SeverityBar = ({ data: inputData }: { data?: { level: string, count: number }[] }) => {
  const defaultData = [
    { level: 5, label: 'วิกฤต', count: 0, color: getSeveritySolidColor(5) },
    { level: 4, label: 'รุนแรง', count: 0, color: getSeveritySolidColor(4) },
    { level: 3, label: 'ปานกลาง', count: 0, color: getSeveritySolidColor(3) },
    { level: 2, label: 'เฝ้าระวัง', count: 0, color: getSeveritySolidColor(2) },
    { level: 1, label: 'ทั่วไป', count: 0, color: getSeveritySolidColor(1) },
  ];

  const data = defaultData.map(item => {
    const found = inputData?.find(d => d.level === `ระดับ ${item.level}`);
    return {
      ...item,
      count: found ? found.count : item.count
    };
  });

  const total = data.reduce((acc, curr) => acc + curr.count, 0) || 1; // Prevent div by 0

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const percentage = Math.round((item.count / total) * 100);
        
        return (
          <div key={item.level} className="flex items-center gap-4">
            <div className="w-16 text-sm font-medium text-gray-600 dark:text-gray-300">
              ระดับ {item.level}
            </div>
            
            <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
              <div 
                className={`h-full ${item.color} rounded-full transition-all duration-1000`} 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            
            <div className="w-12 text-right text-sm font-bold text-gray-900 dark:text-white">
              {item.count}
            </div>
          </div>
        );
      })}
    </div>
  );
};
