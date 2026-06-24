'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CaseDetailModal } from './CaseDetailModal';
import { FileSearch, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';

const getDistanceKm = (lat1: any, lon1: any, lat2: any, lon2: any) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};
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
  const [editingSeverity, setEditingSeverity] = useState<string | null>(null);

  const handleUpdateSeverity = async (caseId: string, newSeverity: number) => {
    try {
      const caseRef = doc(db, 'cases', caseId);
      await updateDoc(caseRef, {
        severity: newSeverity,
        updated_at: new Date().toISOString()
      });
      setEditingSeverity(null);
    } catch (e) {
      console.error("Error updating severity:", e);
      alert('เกิดข้อผิดพลาดในการอัปเดตระดับความรุนแรง');
    }
  };

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 5: return 'bg-red-500 text-white';
      case 4: return 'bg-orange-600 text-white';
      case 3: return 'bg-orange-500 text-white';
      case 2: return 'bg-yellow-500 text-white';
      case 1: return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 5: return 'วิกฤต (ระดับ 5)';
      case 4: return 'รุนแรง (ระดับ 4)';
      case 3: return 'ปานกลาง (ระดับ 3)';
      case 2: return 'เฝ้าระวัง (ระดับ 2)';
      case 1: return 'ทั่วไป (ระดับ 1)';
      default: return `ระดับ ${severity}`;
    }
  };

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
      // Sort 'กำลังเข้าช่วยเหลือ' to the very top
      fetchedCases.sort((a, b) => {
        if (a.status === 'กำลังเข้าช่วยเหลือ' && b.status !== 'กำลังเข้าช่วยเหลือ') return -1;
        if (b.status === 'กำลังเข้าช่วยเหลือ' && a.status !== 'กำลังเข้าช่วยเหลือ') return 1;
        return 0;
      });
      setCases(fetchedCases);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching cases:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredCases = cases.filter(c => {
    const status = c.status || '';
    const isWait = ['wait', 'pending', 'รอการช่วยเหลือ', 'รอดำเนินการ'].includes(status);
    const isInProgress = ['in_progress', 'กำลังช่วยเหลือ', 'กำลังเข้าช่วยเหลือ', 'กำลังดำเนินการ', 'accepted'].includes(status);
    const isCompleted = ['เสร็จสิ้น', 'ส่งเข้าศูนย์พักพิงสำเร็จ', 'มอบถุงยังชีพเสร็จสิ้น', 'นำส่งโรงพยาบาลแล้ว', 'completed', 'ปลอดภัยแล้ว'].includes(status);

    let matchStatus = false;
    if (statusFilter === 'all') {
      matchStatus = true;
    } else if (statusFilter === 'รอการช่วยเหลือ') {
      matchStatus = isWait;
    } else if (statusFilter === 'กำลังช่วยเหลือ' || statusFilter === 'กำลังดำเนินการ') {
      matchStatus = isInProgress;
    } else if (statusFilter === 'เสร็จสิ้น') {
      matchStatus = isCompleted;
    } else {
      matchStatus = status === statusFilter;
    }
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
          {filteredCases.map((row, i) => {
            const nearbyCases = cases.filter(other => {
              if (other.originalId === row.originalId || !row.latitude || !row.longitude || !other.latitude || !other.longitude) return false;
              const isCompleted = ['เสร็จสิ้น', 'สำเร็จ', 'completed', 'ปลอดภัยแล้ว', 'ส่งเข้าศูนย์พักพิงสำเร็จ', 'มอบถุงยังชีพเสร็จสิ้น', 'นำส่งโรงพยาบาลแล้ว'].includes(other.status);
              if (isCompleted) return false;
              return getDistanceKm(row.latitude, row.longitude, other.latitude, other.longitude) <= 0.5;
            });
            
            return (
            <Card key={i} className="bg-white dark:bg-[#151b2c] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2 relative">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full inline-block ${getSeverityColor(row.severity)}`}>
                      {getSeverityText(row.severity || 1)}
                    </span>
                    <button 
                      onClick={() => setEditingSeverity(editingSeverity === row.originalId ? null : row.originalId)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                      title="แก้ไขระดับความรุนแรง"
                    >
                      ✏️
                    </button>
                    {editingSeverity === row.originalId && (
                      <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#151b2c] shadow-2xl border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden whitespace-nowrap min-w-[240px] animate-in zoom-in-95 duration-200">
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500">
                          ปรับระดับความรุนแรง (Admin Override)
                        </div>
                        {[5,4,3,2,1].map(lvl => (
                          <button 
                            key={lvl} 
                            className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center gap-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0 transition-colors"
                            onClick={() => handleUpdateSeverity(row.originalId, lvl)}
                          >
                            <span className={`w-3 h-3 rounded-full ${getSeverityColor(lvl).split(' ')[0]}`}></span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">{getSeverityText(lvl)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
              
              {nearbyCases.length > 0 && (
                <div className="mt-3 bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-200 text-sm flex items-start gap-2">
                  <span className="text-lg">📍</span>
                  <div>
                    <span className="font-semibold">เคสใกล้เคียงรัศมี 500m ({nearbyCases.length} เคส)</span>
                    <p className="text-xs opacity-80 mt-0.5">รวมรหัส: {nearbyCases.map(n => n.id || 'ไม่ระบุ').join(', ')}</p>
                  </div>
                </div>
              )}

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
            );
          })}
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
