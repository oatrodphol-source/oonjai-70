'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { 
  Activity, Clock, MapPin, CheckCircle2, 
  Search, Filter, ChevronLeft, ChevronRight, 
  AlertCircle, Home, HeartPulse
} from 'lucide-react';
import { Input } from '@/components/ui/Input';

interface CaseHistory {
  id: string;
  rawId: number;
  type: string;
  severity: string;
  status: string;
  timeCreated: string;
  timeCompleted: string;
  createdTimestamp: number;
  resolvedTimestamp: number;
  timestamp: number;
  latitude: string;
  longitude: string;
  description: string;
  destination: string;
}

export default function HistoryPage() {
  const [cases, setCases] = useState<CaseHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [volunteerName, setVolunteerName] = useState<string>('ฉัน');
  const [stats, setStats] = useState({ completedCount: 0, avgDisplay: '-' });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resolvedDateFrom, setResolvedDateFrom] = useState('');
  const [resolvedDateTo, setResolvedDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const userStr = localStorage.getItem('oonjai_user');
    if (!userStr) {
      setLoading(false);
      return;
    }

    let uid = '';
    try {
      const user = JSON.parse(userStr);
      uid = user.uid || user.id;
    } catch (e) {
      setLoading(false);
      return;
    }

    if (!uid) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);

        // Fetch Real Volunteer Name
        const { data: volData, error: volErr } = await supabase
          .from('volunteers')
          .select('name')
          .eq('id', uid)
          .maybeSingle();

        if (!volErr && volData?.name) {
          setVolunteerName(volData.name);
        }

        // Fetch Cases for this volunteer and specifically resolved status
        const { data: snapshotData, error } = await supabase
          .from('cases')
          .select('*')
          .eq('volunteer_id', uid)
          .eq('status', 'resolved');

        if (error) {
          console.error("Supabase Error:", error.message);
          setLoading(false);
          return;
        }

        const fetched: CaseHistory[] = [];
        let totalDiffMs = 0;
        let completedCount = 0;

        (snapshotData || []).forEach(data => {
          const created_at = data.created_at ? new Date(data.created_at).getTime() : 0;
          // Look for actual resolved timestamp, fallback to updated
          const resolvedAt = data.resolved_at ? new Date(data.resolved_at).getTime() : 
                             (data.updatedAt ? new Date(data.updatedAt).getTime() : 
                             (data.updated_at ? new Date(data.updated_at).getTime() : 0));
          
          if (created_at > 0 && resolvedAt > created_at) {
            totalDiffMs += (resolvedAt - created_at);
          }
          completedCount++;

          fetched.push({
            id: data.case_number ? `CAS-${String(data.case_number).padStart(3, '0')}` : `CAS-${String(data.id).substring(0, 5)}`,
            rawId: data.id,
            type: data.type || 'ไม่ระบุ',
            severity: String(data.severity || '1'),
            status: data.status,
            createdTimestamp: created_at,
            resolvedTimestamp: resolvedAt,
            timeCreated: created_at > 0 ? new Date(created_at).toLocaleString('th-TH') : '-',
            timeCompleted: resolvedAt > 0 ? new Date(resolvedAt).toLocaleString('th-TH') : '-',
            timestamp: resolvedAt,
            latitude: data.latitude || '-',
            longitude: data.longitude || '-',
            description: data.details || data.description || '',
            destination: data.destination || ''
          });
        });

        // Sort by newest completed time
        fetched.sort((a, b) => b.timestamp - a.timestamp);
        setCases(fetched);

        // Calculate Average Resolution Time
        const avgDiffMs = completedCount > 0 ? totalDiffMs / completedCount : 0;
        const avgMinutes = Math.floor(avgDiffMs / 60000);
        const avgHours = Math.floor(avgMinutes / 60);
        const avgDisplay = avgHours > 0 ? `${avgHours} ชั่วโมง ${avgMinutes % 60} นาที` : `${avgMinutes} นาที`;
        
        setStats({ completedCount, avgDisplay });
        setLoading(false);
      } catch (err) {
        console.error("Error fetching history:", err);
        setLoading(false);
      }
    };

    fetchHistory();

    const channel = supabase
      .channel('custom-history-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases', filter: `volunteer_id=eq.${uid}` },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Extract unique destinations
  const uniqueDestinations = useMemo(() => {
    const dests = new Set<string>();
    cases.forEach(c => {
      if (c.destination) dests.add(c.destination);
    });
    return Array.from(dests);
  }, [cases]);

  // Filtering Logic
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchSearch = c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSeverity = severityFilter === 'all' || c.severity === severityFilter;
      const matchDest = destinationFilter === 'all' || c.destination === destinationFilter;

      let matchDate = true;
      let matchResDate = true;

      if (dateFrom) {
        matchDate = matchDate && (c.createdTimestamp >= new Date(dateFrom).getTime());
      }
      if (dateTo) {
        // Add 86400000 ms to cover the end of the selected day
        matchDate = matchDate && (c.createdTimestamp <= new Date(dateTo).getTime() + 86400000); 
      }

      if (resolvedDateFrom) {
        matchResDate = matchResDate && (c.resolvedTimestamp >= new Date(resolvedDateFrom).getTime());
      }
      if (resolvedDateTo) {
        matchResDate = matchResDate && (c.resolvedTimestamp <= new Date(resolvedDateTo).getTime() + 86400000);
      }

      return matchSearch && matchSeverity && matchDest && matchDate && matchResDate;
    });
  }, [cases, searchQuery, severityFilter, destinationFilter, dateFrom, dateTo, resolvedDateFrom, resolvedDateTo]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCases.slice(start, start + itemsPerPage);
  }, [filteredCases, currentPage]);

  return (
    <>
      <DashboardHeader title="ประวัติช่วยเหลือ" />
      <div className="max-w-7xl mx-auto py-6 pb-32 md:pb-10 space-y-6 px-4 sm:px-6">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 border-0 rounded-2xl">
            <h3 className="text-emerald-100 font-medium mb-1">เคสที่ช่วยเหลือสำเร็จ</h3>
            <p className="text-4xl font-bold">{stats.completedCount}</p>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-xl shadow-orange-500/20 border-0 rounded-2xl">
            <h3 className="text-orange-100 font-medium mb-1">เวลาเฉลี่ยในการปิดเคส</h3>
            <p className="text-4xl font-bold">{stats.completedCount > 0 ? stats.avgDisplay : '-'}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-5 border-0 shadow-sm bg-white dark:bg-[#151b2c] rounded-2xl">
          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-bold mb-4">
            <Filter className="w-5 h-5" />
            ตัวกรองอัจฉริยะ
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">ค้นหารหัสเคส</label>
              <Input 
                placeholder="เช่น CAS-001..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">ระดับความรุนแรง</label>
              <select 
                className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded-lg dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">ทุกระดับ</option>
                <option value="5">ระดับ 5 (วิกฤต)</option>
                <option value="4">ระดับ 4 (รุนแรง)</option>
                <option value="3">ระดับ 3 (ปานกลาง)</option>
                <option value="2">ระดับ 2 (เฝ้าระวัง)</option>
                <option value="1">ระดับ 1 (ทั่วไป)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">จุดหมายปลายทาง</label>
              <select 
                className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded-lg dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={destinationFilter}
                onChange={(e) => { setDestinationFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">ทุกจุดหมาย</option>
                {uniqueDestinations.map(dest => (
                  <option key={dest} value={dest}>{dest}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">วันที่แจ้งเหตุ (ตั้งแต่)</label>
                <input 
                  type="date" 
                  className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded-lg dark:bg-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">วันที่แจ้งเหตุ (ถึง)</label>
                <input 
                  type="date" 
                  className="w-full border border-slate-300 dark:border-slate-700 p-2 rounded-lg dark:bg-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Table Data */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-[#151b2c]">
          {/* Mobile View (Cards) */}
          <div className="block lg:hidden p-4 space-y-4 bg-slate-50 dark:bg-transparent">
            {loading ? (
              <div className="p-8 text-center text-slate-500">กำลังโหลด...</div>
            ) : paginatedCases.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">ไม่พบประวัติการช่วยเหลือที่ตรงกับเงื่อนไข</div>
            ) : (
              paginatedCases.map((c) => (
                <div key={c.rawId} className="bg-white dark:bg-[#111c35] p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">{c.id}</h3>
                      <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2.5 py-0.5 rounded text-xs font-semibold mt-1 inline-block">
                        ระดับ {c.severity}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-bold whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      เสร็จสิ้น
                    </span>
                  </div>
                  
                  <div className="text-slate-600 dark:text-slate-300 text-sm line-clamp-2">
                    {c.description || '-'}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 mb-1">วันที่แจ้งเหตุ</p>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">{c.timeCreated}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 mb-1">เวลาที่ปิดเคส</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {c.timeCompleted}
                      </p>
                    </div>
                    {c.destination && (
                      <div className="col-span-2 mt-1 bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
                        <p className="text-slate-500 dark:text-slate-400 mb-1">จุดหมายปลายทาง</p>
                        <p className="text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                          {c.destination}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View (Table) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <th className="p-4 whitespace-nowrap">ID เคส</th>
                  <th className="p-4 whitespace-nowrap">ความรุนแรง</th>
                  <th className="p-4 min-w-[200px]">รายละเอียด</th>
                  <th className="p-4 whitespace-nowrap">จุดหมายปลายทาง</th>
                  <th className="p-4 whitespace-nowrap">วันที่แจ้งเหตุ</th>
                  <th className="p-4 whitespace-nowrap">เวลาที่ปิดเคส</th>
                  <th className="p-4 whitespace-nowrap">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800 animate-pulse">
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-10"></div></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div></td>
                      <td className="p-4"><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20"></div></td>
                    </tr>
                  ))
                ) : paginatedCases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500">
                      ไม่พบประวัติการช่วยเหลือที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  paginatedCases.map((c) => (
                    <tr key={c.rawId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{c.id}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2.5 py-0.5 rounded text-xs font-semibold">
                          ระดับ {c.severity}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                        <div className="line-clamp-2 max-w-xs">{c.description || '-'}</div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        {c.destination ? (
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                            {c.destination}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                        {c.timeCreated}
                      </td>
                      <td className="p-4 font-medium text-emerald-600 dark:text-emerald-400 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {c.timeCompleted}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-bold whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          เสร็จสิ้นแล้ว
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && filteredCases.length > 0 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/20">
              <span className="text-sm text-slate-500">
                แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, filteredCases.length)} จากทั้งหมด {filteredCases.length} รายการ
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors bg-white dark:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    // Show max 5 pages logic for better UI if many pages exist
                    if (totalPages > 5 && (i + 1 < currentPage - 1 || i + 1 > currentPage + 1) && i !== 0 && i !== totalPages - 1) {
                      if (i + 1 === currentPage - 2 || i + 1 === currentPage + 2) return <span key={i} className="text-slate-400">...</span>;
                      return null;
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === i + 1 
                            ? 'bg-emerald-600 text-white' 
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {i + 1}
                      </button>
                    )
                  })}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors bg-white dark:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
