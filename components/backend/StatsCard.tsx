import React from 'react';
import { Card } from '@/components/ui/Card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  colorClass?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  colorClass = 'text-blue-500 bg-blue-100 dark:bg-blue-900/30'
}) => {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-500 dark:text-gray-400">{title}</h3>
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div className="flex items-end gap-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{value}</h2>
        {trend && (
          <span className="text-sm font-medium text-emerald-500 mb-1">{trend}</span>
        )}
      </div>
    </Card>
  );
};
