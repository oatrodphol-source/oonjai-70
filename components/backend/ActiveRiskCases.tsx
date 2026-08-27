'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Users } from 'lucide-react';
import { getSeverityBadgeStyle } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

export function ActiveRiskCases() {
  const [activeCases, setActiveCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveCases = async () => {
      try {
        const { data, error } = await supabase
          .from('cases')
          .select('*')
          .in('status', ['pending', 'in_progress'])
          .order('severity', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        if (data) setActiveCases(data);
      } catch (err) {
        console.error("Error fetching active cases:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveCases();

    const channel = supabase
      .channel('water-data-cases')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => {
        fetchActiveCases();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="p-6 border-l-4 border-l-red-500 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full -z-10"></div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-red-500 w-6 h-6 animate-pulse" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">เคสเร่งด่วนรอดำเนินการ</h2>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
        </div>
      ) : activeCases.length > 0 ? (
        <div className="space-y-3 z-10 relative">
          {activeCases.map((c, idx) => (
            <div key={idx} className="flex justify-between items-start p-3 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">CAS-{String(c.id).substring(0, 5)}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getSeverityBadgeStyle(c.severity || 1)}`}>
                    ระดับ {c.severity || 1}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{c.type}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                    <Users className="w-3 h-3" /> {c.people_count || 1} คน
                  </span>
                </div>
              </div>
              <a href="/cases" className="text-xs font-bold text-red-600 hover:text-red-700 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-red-100 dark:border-red-800 transition-colors">
                จัดการ ➔
              </a>
            </div>
          ))}
          <a href="/cases" className="block text-center text-sm font-bold text-slate-500 hover:text-red-600 mt-2 transition-colors">
            ดูเคสทั้งหมด
          </a>
        </div>
      ) : (
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/50">
          <span className="text-2xl mb-2 block">✅</span>
          <p className="text-sm font-bold text-green-700 dark:text-green-400">ไม่มีเคสด่วนที่รอดำเนินการ</p>
        </div>
      )}
    </Card>
  );
}
