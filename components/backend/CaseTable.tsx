'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CaseDetailModal } from './CaseDetailModal';
import { FileSearch, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
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
    const casesRef = collection(db, 'cases');
    const q = query(casesRef); // Fetch all to fix 'ไม่พบข้อมูล' bug
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCases: any[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        fetchedCases.push({
          id: data.case_number ? `CAS-${String(data.case_number).padStart(3, '0')}` : `CAS-${docSnap.id.substring(0, 5)}`,
          originalId: docSnap.id,
          name: data.name || data.contactName || 'ไม่ระบุ',
          severity: Number(data.severity) || 1,
          type: data.type || 'ไม่ระบุ',
          peopleCount: data.peopleCount || 1,
          bedridden: !!data.bedridden,
          elderly: !!data.elderly,
          status: data.status || 'รอการช่วยเหลือ',
          time: data.createdAt ? new Date(data.createdAt).toLocaleString('th-TH') : (data.created_at ? new Date(data.created_at).toLocaleString('th-TH') : '-'),
          note: data.details || '-',
          timestamp: data.createdAt ? new Date(data.createdAt).getTime() : (data.created_at ? new Date(data.created_at).getTime() : 0),
          // for CaseDetailModal
          ...data
        });
      });
      
      // Sort by newest first
      fetchedCases.sort((a, b) => b.timestamp - a.timestamp);
      setCases(fetchedCases);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching cases:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredCases = cases.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter || (statusFilter === 'รอการช่วยเหลือ' && c.status === 'wait');
    const matchSeverity = severityFilter === 'all' || c.severity.toString() === severityFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = searchQuery === '' || 
      (c.id && c.id.toLowerCase().includes(searchLower)) || 
      (c.name && c.name.toLowerCase().includes(searchLower)) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.type && c.type.toLowerCase().includes(searchLower)) ||
      (c.location && c.location.toLowerCase().includes(searchLower)) ||
      (c.address && c.address.toLowerCase().includes(searchLower));
      
    return matchStatus && matchSeverity && matchSearch;
  });

  return (
    <>
      {loading ? (
        <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
      ) : cases.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-white dark:bg-[#151b2c] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">ไม่พบข้อมูล</div>
      ) : filteredCases.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-white dark:bg-[#151b2c] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          ไม่มีเคสที่ตรงกับเงื่อนไขการค้นหา
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((row, i) => (
            <Card key={i} className="bg-white dark:bg-[#151b2c] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant={row.severity >= 4 ? 'danger' : row.severity === 3 ? 'warning' : 'success'} className="mb-2">
                    ระดับ {row.severity}
                  </Badge>
                  <div className="font-bold text-lg text-gray-900 dark:text-white">{row.id}</div>
                </div>
                <Button variant="ghost" size="sm" className="w-10 h-10 p-0 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-full" onClick={() => setSelectedCase(row)}>
                  <FileSearch className="w-6 h-6" />
                </Button>
              </div>

              <div className="text-gray-700 dark:text-gray-300 font-semibold text-base line-clamp-1">{row.type}</div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className={
                  row.status === 'รอการช่วยเหลือ' || row.status === 'wait' ? 'text-yellow-600 font-bold' :
                  row.status === 'กำลังช่วยเหลือ' ? 'text-blue-600 font-bold' :
                  row.status === 'เสร็จสิ้น' ? 'text-green-600 font-bold' : 'text-gray-500 font-bold'
                }>
                  {row.status === 'wait' ? 'wait' : row.status}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500 font-medium">{row.time}</span>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">จำนวนผู้ประสบภัย:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{row.peopleCount} คน</span>
                </div>
                {(row.bedridden || row.elderly) && (
                  <div className="flex gap-2 flex-wrap pt-1">
                    {row.bedridden && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-bold">ผู้ป่วยติดเตียง</span>}
                    {row.elderly && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-bold">เด็ก/ผู้สูงอายุ</span>}
                  </div>
                )}
                {row.note && row.note !== '-' && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2 text-gray-600 dark:text-gray-400 line-clamp-2">
                    {row.note}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      
      <CaseDetailModal 
        isOpen={!!selectedCase} 
        onClose={() => setSelectedCase(null)} 
        caseData={selectedCase} 
      />
    </>
  );
};
