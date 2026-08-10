'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CaseDetailModal } from './CaseDetailModal';
import { FileSearch, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const getDistanceKm = (lat1: any, lon1: any, lat2: any, lon2: any) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};
export const CaseTable = ({
  statusFilter = 'all',
  severityFilter = 'all',
  searchQuery = '',
  destinationFilter = 'all',
  searchCaseId = '',
  searchVolunteerName = ''
}: {
  statusFilter?: string,
  severityFilter?: string,
  searchQuery?: string,
  destinationFilter?: string,
  searchCaseId?: string,
  searchVolunteerName?: string
}) => {
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSeverity, setEditingSeverity] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const itemsPerPage = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, severityFilter, searchQuery, destinationFilter, searchCaseId, searchVolunteerName]);

  const handleUpdateSeverity = async (caseId: string | number, newSeverity: number) => {
    try {
      await supabase.from('cases').update({
        severity: newSeverity,
        updated_at: new Date().toISOString()
      }).eq('id', Number(caseId));
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
    const fetchCases = async () => {
      try {
        const [casesRes, volRes] = await Promise.all([
          supabase.from('cases').select('*').order('created_at', { ascending: false }),
          supabase.from('volunteers').select('id, name, phone, agency')
        ]);
        
        if (casesRes.error) throw casesRes.error;

        const volMap = new Map();
        if (volRes.data) {
          volRes.data.forEach((v: any) => volMap.set(v.id, v));
        }

        if (casesRes.data) {
          const fetchedCases: any[] = [];
          casesRes.data.forEach((d: any) => {
            const vol = d.volunteer_id ? volMap.get(d.volunteer_id) : null;
            fetchedCases.push({
              id: d.case_number ? `CAS-${String(d.case_number).padStart(3, '0')}` : `CAS-${String(d.id).substring(0, 5)}`,
              originalId: d.id,
              name: d.name || d.contactName || 'ไม่ระบุ',
              severity: Number(d.severity) || 1,
              type: d.type || 'ไม่ระบุ',
              people_count: d.people_count || 1,
              bedridden: d.bedridden || 0,
              elderly: d.elderly || 0,
              status: d.status || 'pending',
              time: d.created_at ? new Date(d.created_at).toLocaleString('th-TH') : '-',
              note: d.details || '-',
              timestamp: d.created_at ? new Date(d.created_at).getTime() : 0,
              latitude: d.latitude,
              longitude: d.longitude,
              volunteer_name: vol ? vol.name : d.assigned_volunteer_name,
              volunteer_phone: vol?.phone,
              volunteer_agency: vol?.agency,
              ...d
            });
          });

          fetchedCases.sort((a, b) => b.timestamp - a.timestamp);
          fetchedCases.sort((a, b) => {
            if (a.status === 'กำลังเข้าช่วยเหลือ' && b.status !== 'กำลังเข้าช่วยเหลือ') return -1;
            if (b.status === 'กำลังเข้าช่วยเหลือ' && a.status !== 'กำลังเข้าช่วยเหลือ') return 1;
            return 0;
          });
          setCases(fetchedCases);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching cases:', error);
        setLoading(false);
      }
    };

    // 1. ดึงข้อมูลครั้งแรกเมื่อโหลดหน้าเว็บ
    fetchCases();

    console.log('🔌 พยายามเชื่อมต่อ Supabase Realtime...');

    // 2. สร้างตัวดักฟัง (Channel)
    const channel = supabase
      .channel('dashboard-cases-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        (payload) => {
          console.log('🚨 สัญญาณ REALTIME เด้งแล้ว! ข้อมูลที่เปลี่ยน:', payload);
          // เมื่อมีข้อมูลเปลี่ยน ให้ดึงข้อมูลใหม่ทั้งหมดทันที
          fetchCases(); 
        }
      )
      .subscribe((status) => {
        console.log('📡 สถานะ Realtime:', status);
      });

    // 3. ทำลายตัวดักฟังเมื่อเปลี่ยนหน้า
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredCases = cases.filter(c => {
    const status = c.status || '';
    const isWait = status === 'pending';
    const isInProgress = status === 'in_progress';
    const isCompleted = status === 'resolved';

    let matchStatus = false;
    if (statusFilter === 'all') {
      matchStatus = true;
    } else if (statusFilter === 'รอการช่วยเหลือ' || statusFilter === 'pending') {
      matchStatus = isWait;
    } else if (statusFilter === 'กำลังช่วยเหลือ' || statusFilter === 'กำลังดำเนินการ' || statusFilter === 'in_progress') {
      matchStatus = isInProgress;
    } else if (statusFilter === 'เสร็จสิ้น' || statusFilter === 'completed' || statusFilter === 'resolved') {
      matchStatus = isCompleted;
    } else if (statusFilter === 'ยกเลิก' || statusFilter === 'cancelled') {
      matchStatus = status === 'cancelled';
    } else {
      matchStatus = status === statusFilter;
    }
    const matchSeverity = severityFilter === 'all' || c.severity.toString() === severityFilter;
    
    let matchDestination = true;
    let matchCaseId = true;
    let matchVolunteer = true;
    
    if (statusFilter === 'completed' || statusFilter === 'resolved') {
      if (destinationFilter !== 'all') {
        matchDestination = c.destination === destinationFilter;
      }
      if (searchCaseId) {
        matchCaseId = c.id && c.id.toLowerCase().includes(searchCaseId.toLowerCase());
      }
      if (searchVolunteerName) {
        const vName = c.volunteer_name || c.assigned_volunteer_name || '';
        matchVolunteer = vName.toLowerCase().includes(searchVolunteerName.toLowerCase());
      }
    }

    const searchLower = searchQuery.toLowerCase();
    const matchSearch = searchQuery === '' ||
      (c.id && c.id.toLowerCase().includes(searchLower)) ||
      (c.name && c.name.toLowerCase().includes(searchLower)) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.type && c.type.toLowerCase().includes(searchLower)) ||
      (c.location && c.location.toLowerCase().includes(searchLower)) ||
      (c.address && c.address.toLowerCase().includes(searchLower));

    return matchStatus && matchSeverity && matchDestination && matchSearch && matchCaseId && matchVolunteer;
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
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-[#151b2c] p-2 pl-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-sm text-gray-500 font-medium">พบ {filteredCases.length} รายการ</span>
            <div className="inline-flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button onClick={() => setViewMode('grid')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all duration-200 flex items-center gap-2 ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                การ์ด
              </button>
              <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all duration-200 flex items-center gap-2 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                ตาราง
              </button>
            </div>
          </div>
          <div className="w-full">
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
              {filteredCases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, i) => {
            const nearbyCases = cases.filter(other => {
              if (other.originalId === row.originalId || !row.latitude || !row.longitude || !other.latitude || !other.longitude) return false;
              const isCompleted = ['resolved', 'completed', 'cancelled'].includes(other.status);
              if (isCompleted) return false;
              return getDistanceKm(row.latitude, row.longitude, other.latitude, other.longitude) <= 0.5;
            });

            if (viewMode === 'list') {
              return (
                <Card key={i} className="bg-white dark:bg-[#151b2c] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-3 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50 transition-all flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 group">
                  <div className="flex-shrink-0 sm:w-28 flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-2 sm:gap-1">
                     <div className="font-bold text-gray-900 dark:text-white text-base group-hover:text-blue-600 transition-colors">{row.id}</div>
                     <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full inline-block ${getSeverityColor(row.severity)}`}>{getSeverityText(row.severity || 1)}</span>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                     <div className="font-semibold text-gray-900 dark:text-white truncate text-sm">{row.type}</div>
                     <div className="text-xs text-gray-500 flex flex-wrap items-center gap-3">
                       <span className="flex items-center gap-1"><span className="text-gray-400">🕒</span> {row.time}</span>
                       <span className="flex items-center gap-1"><span className="text-gray-400">👤</span> {row.people_count || 1} คน</span>
                       {nearbyCases.length > 0 && <span className="text-amber-600 font-bold animate-pulse flex items-center gap-1">⚠️ ใกล้เคียง {nearbyCases.length} เคส</span>}
                     </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-gray-800">
                    <span className={`text-xs px-2.5 py-1 rounded-lg ${row.status === 'pending' ? 'bg-yellow-50 text-yellow-700 font-bold' : row.status === 'in_progress' ? 'bg-blue-50 text-blue-700 font-bold' : 'bg-gray-50 text-gray-600 font-bold'}`}>
                      {row.status === 'pending' ? 'รอช่วยเหลือ' : row.status === 'in_progress' ? 'กำลังช่วยเหลือ' : 'เสร็จสิ้น'}
                    </span>
                    <div className="flex items-center gap-2">
                      {row.phone && (
                        <a href={`tel:${row.phone}`} title="โทรหาผู้แจ้ง" className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                          📞
                        </a>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 px-3 text-orange-500 bg-orange-50 hover:bg-orange-100 rounded-lg text-xs font-bold" onClick={() => setSelectedCase(row)}>
                        ดูรายละเอียด
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            }

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
                          {[5, 4, 3, 2, 1].map(lvl => (
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

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-gray-700 dark:text-gray-300 font-semibold text-base line-clamp-1">{row.type}</div>
                  <button 
                    onClick={() => setSelectedCase(row)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                    title="ดูคำแนะนำการกู้ภัยจาก AI"
                  >
                    ⚡ คำแนะนำ AI
                  </button>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className={
                    row.status === 'pending' ? 'text-yellow-600 font-bold' :
                      row.status === 'in_progress' ? 'text-blue-600 font-bold' :
                        row.status === 'resolved' ? 'text-green-600 font-bold' : 'text-gray-500 font-bold'
                  }>
                    {row.status === 'pending' ? 'รอการช่วยเหลือ' : row.status === 'in_progress' ? 'กำลังช่วยเหลือ' : row.status === 'resolved' ? 'เสร็จสิ้น' : row.status === 'cancelled' ? 'ยกเลิก' : row.status}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500 font-medium">{row.time}</span>
                </div>

                <div className="flex gap-2 pt-1">
                  {row.phone ? (
                    <a href={`tel:${row.phone}`} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-green-200 dark:border-green-800/50">
                      📞 โทรผู้แจ้ง
                    </a>
                  ) : (
                    <div className="flex-1 bg-gray-50 text-gray-400 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border border-gray-100">
                      📞 ไม่มีเบอร์
                    </div>
                  )}
                  {row.latitude && row.longitude ? (
                    <a href={`https://maps.google.com/?q=${row.latitude},${row.longitude}`} target="_blank" className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-blue-200 dark:border-blue-800/50">
                      🗺️ นำทาง
                    </a>
                  ) : (
                    <div className="flex-1 bg-gray-50 text-gray-400 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border border-gray-100">
                      🗺️ ไม่มีพิกัด
                    </div>
                  )}
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

                {row.status === 'in_progress' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50 text-sm space-y-1">
                    <div className="font-bold text-blue-800 dark:text-blue-300 mb-1 border-b border-blue-200 dark:border-blue-800/50 pb-1">🚑 ข้อมูลทีมช่วยเหลือ</div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">ทีม/อาสา:</span>
                      <span className="font-medium text-gray-900 dark:text-white text-right">{row.volunteer_name || '-'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">เบอร์ติดต่อ:</span>
                      {row.volunteer_phone ? (
                        <a href={`tel:${row.volunteer_phone}`} className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-right underline decoration-blue-300 underline-offset-2 flex items-center gap-1">
                          📞 {row.volunteer_phone}
                        </a>
                      ) : (
                        <span className="font-medium text-gray-400 text-right">-</span>
                      )}
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">หน่วยงาน:</span>
                      <span className="font-medium text-gray-900 dark:text-white text-right">{row.volunteer_agency || '-'}</span>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">จำนวนผู้ประสบภัย:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{row.people_count || 1} คน</span>
                  </div>
                  {(row.bedridden > 0 || row.elderly > 0) && (
                    <div className="flex gap-2 flex-wrap pt-1">
                      {row.bedridden > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-bold">ผู้ป่วยติดเตียง</span>}
                      {row.elderly > 0 && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-bold">เด็ก/ผู้สูงอายุ</span>}
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
          </div>
          
          {Math.ceil(filteredCases.length / itemsPerPage) > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 pb-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-[#151b2c] text-slate-700 dark:text-slate-300 shadow-sm"
              >
                ก่อนหน้า
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.ceil(filteredCases.length / itemsPerPage) }).map((_, i) => {
                  const page = i + 1;
                  const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors shadow-sm ${
                          currentPage === page 
                            ? 'bg-blue-600 text-white border border-blue-600' 
                            : 'bg-white dark:bg-[#151b2c] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2 text-slate-400 flex items-center">...</span>;
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredCases.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(filteredCases.length / itemsPerPage)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-[#151b2c] text-slate-700 dark:text-slate-300 shadow-sm"
              >
                ถัดไป
              </button>
            </div>
          )}
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
