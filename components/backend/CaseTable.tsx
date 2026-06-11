'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CaseDetailModal } from './CaseDetailModal';
import { FileSearch, CheckCircle2 } from 'lucide-react';

export const CaseTable = ({ 
  statusFilter = 'all', 
  severityFilter = 'all', 
  searchQuery = '' 
}: { 
  statusFilter?: string, 
  severityFilter?: string, 
  searchQuery?: string 
}) => {
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await fetch('/api/cases');
        if (res.ok) {
          const data = await res.json();
          setCases(data);
        }
      } catch (error) {
        console.error('Error fetching cases:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  const filteredCases = cases.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter || (statusFilter === 'รอการช่วยเหลือ' && c.status === 'wait');
    const matchSeverity = severityFilter === 'all' || c.severity.toString() === severityFilter;
    const matchSearch = searchQuery === '' || 
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchStatus && matchSeverity && matchSearch;
  });

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-center">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr className="text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700 text-sm">
                <th className="p-3 font-medium border-r border-gray-300 dark:border-gray-700 w-16">จัดการ</th>
                <th className="p-3 font-medium border-r border-gray-300 dark:border-gray-700">ระดับ</th>
                <th className="p-3 font-medium border-r border-gray-300 dark:border-gray-700">ประเภท</th>
                <th className="p-3 font-medium border-r border-gray-300 dark:border-gray-700">จำนวนคน</th>
                <th className="p-3 font-medium border-r border-gray-300 dark:border-gray-700">ผู้ป่วยติดเตียง</th>
                <th className="p-3 font-medium border-r border-gray-300 dark:border-gray-700">เด็ก/ผู้สูงอายุ</th>
                <th className="p-3 font-medium border-r border-gray-300 dark:border-gray-700">สถานะ</th>
                <th className="p-3 font-medium border-r border-gray-300 dark:border-gray-700">เวลา</th>
                <th className="p-3 font-medium">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">ไม่พบข้อมูล</td>
                </tr>
              ) : filteredCases.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-2 border-r border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-center">
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-orange-500 hover:text-orange-600 hover:bg-orange-50" onClick={() => setSelectedCase(row)}>
                        <FileSearch className="w-5 h-5" />
                      </Button>
                    </div>
                  </td>
                  <td className="p-2 border-r border-gray-200 dark:border-gray-800">
                    <Badge variant={row.severity >= 4 ? 'danger' : row.severity === 3 ? 'warning' : 'success'}>
                      ระดับ {row.severity}
                    </Badge>
                  </td>
                  <td className="p-2 border-r border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">{row.type}</td>
                  <td className="p-2 border-r border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">{row.peopleCount}</td>
                  <td className="p-2 border-r border-gray-200 dark:border-gray-800">
                    <div className="flex justify-center">
                      <div className={`w-10 h-5 rounded-full relative flex items-center p-1 ${row.bedridden ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${row.bedridden ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 border-r border-gray-200 dark:border-gray-800">
                    <div className="flex justify-center">
                      <div className={`w-10 h-5 rounded-full relative flex items-center p-1 ${row.elderly ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${row.elderly ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 border-r border-gray-200 dark:border-gray-800">
                    <span className={
                      row.status === 'รอการช่วยเหลือ' || row.status === 'wait' ? 'text-yellow-500 font-medium' :
                      row.status === 'กำลังช่วยเหลือ' ? 'text-blue-500 font-medium' :
                      row.status === 'เสร็จสิ้น' ? 'text-green-500 font-medium' : 'text-gray-500 font-medium'
                    }>
                      {row.status === 'wait' ? 'wait' : row.status}
                    </span>
                  </td>
                  <td className="p-2 border-r border-gray-200 dark:border-gray-800 text-gray-500">{row.time}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-400 text-xs truncate max-w-[150px]">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      <CaseDetailModal 
        isOpen={!!selectedCase} 
        onClose={() => setSelectedCase(null)} 
        caseData={selectedCase} 
      />
    </>
  );
};
