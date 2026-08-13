'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, Navigation, Package, Home, Hospital, Phone, Clock, Info, AlertTriangle, AlertCircle, CheckCircle, Users, Pencil } from 'lucide-react';
import { isPendingCase, isInProgressCase, isCompletedCase, isShelterDestination, isHospitalDestination, isSuppliesDestination } from '@/lib/caseUtils';
import { getSeverityBadgeStyle } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { CaseDetailModal } from './CaseDetailModal';
import toast from 'react-hot-toast';

// Helper function for AI Triage colors
const getSeverityColor = (severity: any) => {
  const level = String(severity || '');
  if (level.includes('5')) return 'bg-red-500 text-red-500';
  if (level.includes('4')) return 'bg-orange-500 text-orange-500';
  if (level.includes('3')) return 'bg-yellow-500 text-yellow-500';
  if (level.includes('2')) return 'bg-blue-500 text-blue-500';
  return 'bg-green-500 text-green-500'; // Default Level 1
};

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

export const VolunteerTaskBoard = ({ 
  statusFilter = 'all', 
  severityFilter = 'all', 
  searchQuery = '',
  limit,
  destinationFilter = 'all',
  searchCaseId = '',
  searchVolunteerName = '',
  excludeResolved = false
}: { 
  statusFilter?: string, 
  severityFilter?: string, 
  searchQuery?: string,
  limit?: number,
  destinationFilter?: string,
  searchCaseId?: string,
  searchVolunteerName?: string,
  excludeResolved?: boolean
}) => {
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{uid: string, name: string, phone?: string, rescueUnit?: string} | null>(null);
  const [currentUserStatus, setCurrentUserStatus] = useState<string>('active');
  const [currentUserOnline, setCurrentUserOnline] = useState<boolean>(true);
  const [updatingCaseId, setUpdatingCaseId] = useState<string | null>(null);
  const [editingSeverity, setEditingSeverity] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
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
      toast.error('เกิดข้อผิดพลาดในการอัปเดตระดับความรุนแรง');
    }
  };

  useEffect(() => {
    let statusChannel: any = null;

    try {
      const stored = localStorage.getItem('oonjai_user');
      if (stored) {
        const user = JSON.parse(stored);
        const uid = user.id || user.uid;
        setCurrentUser({ 
          uid: uid, 
          name: user.name, 
          phone: user.phone || 'ไม่ระบุเบอร์โทร', 
          rescueUnit: user.agency || user.rescueUnit 
        });

        // ดึงสถานะล่าสุดจากฐานข้อมูลเพื่อกันผู้ใช้โดนแบนหรือปิด Live
        const fetchUserStatus = async () => {
          const table = user.role === 'admin' ? 'admins' : 'volunteers';
          const { data } = await supabase.from(table).select('status, is_online').eq('id', uid).single();
          if (data) {
            setCurrentUserStatus(data.status || 'active');
            if (data.is_online !== undefined) {
              setCurrentUserOnline(data.is_online);
            }
          }
        };
        fetchUserStatus();

        // Subscribe to changes specifically for this user
        const statusChannelName = `realtime-user-status-${uid}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        statusChannel = supabase.channel(statusChannelName)
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: user.role === 'admin' ? 'admins' : 'volunteers', 
            filter: `id=eq.${uid}` 
          }, (payload) => {
            const updated = payload.new as any;
            if (updated.status !== undefined) setCurrentUserStatus(updated.status);
            if (updated.is_online !== undefined) setCurrentUserOnline(updated.is_online);
          }).subscribe();
      }
    } catch (e) {
      console.error(e);
    }

    const fetchCases = async () => {
      try {
        const { data, error } = await supabase.from('cases').select('*').in('status', ['pending', 'in_progress', 'resolved']);
        if (error) throw error;
        
        if (data) {
          const fetchedCases: any[] = [];
          data.forEach((d: any) => {
            fetchedCases.push({
              id: d.id,
              ...d,
              displayId: d.case_number ? `CAS-${String(d.case_number).padStart(3, '0')}` : `CAS-${String(d.id).substring(0, 5)}`,
            });
          });

          // Sort by severity (5 to 1), then by time
          fetchedCases.sort((a, b) => {
            const sevDiff = (b.severity || 1) - (a.severity || 1);
            if (sevDiff !== 0) return sevDiff;
            const timeA = new Date(a.created_at || 0).getTime();
            const timeB = new Date(b.created_at || 0).getTime();
            return timeA - timeB; // Older first
          });

          setCases(fetchedCases);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching volunteer cases:", error);
        setLoading(false);
      }
    };

    fetchCases();

    const casesChannelName = `realtime-vol-cases-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const channel = supabase.channel(casesChannelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, async (payload) => {
        console.log('🔄 ข้อมูลงานอาสาสมัครมีการเปลี่ยนแปลง:', payload.eventType);
        
        // ดึงข้อมูลใหม่จาก DB ทันที (Refetch) และ Set State ภายใน Callback
        const { data, error } = await supabase.from('cases')
          .select('*')
          .in('status', ['pending', 'in_progress', 'resolved']);
          
        if (data && !error) {
          const fetchedCases: any[] = [];
          data.forEach((d: any) => {
            fetchedCases.push({
              id: d.id,
              ...d,
              displayId: d.case_number ? `CAS-${String(d.case_number).padStart(3, '0')}` : `CAS-${String(d.id).substring(0, 5)}`,
            });
          });

          fetchedCases.sort((a, b) => {
            const sevDiff = (b.severity || 1) - (a.severity || 1);
            if (sevDiff !== 0) return sevDiff;
            const timeA = new Date(a.created_at || 0).getTime();
            const timeB = new Date(b.created_at || 0).getTime();
            return timeA - timeB;
          });

          setCases(fetchedCases);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (statusChannel) {
        supabase.removeChannel(statusChannel);
      }
    };
  }, []);

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

  const handleAcceptCase = async (caseId: string | number) => {
    if (!currentUser) return toast.error('ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่');
    if (currentUserStatus !== 'active') {
      return toast.error('บัญชีของคุณถูกระงับชั่วคราว กรุณาติดต่อผู้ดูแลระบบ');
    }
    if (!currentUserOnline) {
      return toast.error('คุณต้องเปิดสถานะพร้อมรับงานก่อนจึงจะสามารถรับเคสได้');
    }
    
    setUpdatingCaseId(String(caseId));
    try {
      await supabase.from('cases').update({
        status: 'in_progress',
        volunteer_id: Number((currentUser as any).id || currentUser.uid),
        volunteer_name: currentUser.name,
        assigned_volunteer_name: currentUser.name,
        assigned_volunteer_unit: currentUser.rescueUnit || "อาสาสมัคร",
        assigned_volunteer_phone: currentUser.phone || 'ไม่ระบุเบอร์โทร',
        updated_at: new Date().toISOString()
      }).eq('id', Number(caseId));

      toast.success("รับเคสสำเร็จ");
    } catch (e) {
      console.error("Error accepting case:", e);
      toast.error('เกิดข้อผิดพลาดในการรับเคส');
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const handleBulkAccept = async (caseIds: (string | number)[]) => {
    if (!currentUser) return toast.error('ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่');
    if (currentUserStatus !== 'active') {
      return toast.error('บัญชีของคุณถูกระงับชั่วคราว กรุณาติดต่อผู้ดูแลระบบ');
    }
    if (!currentUserOnline) {
      return toast.error('คุณต้องเปิดสถานะพร้อมรับงานก่อนจึงจะสามารถรับเคสได้');
    }
    
    const bulkId = 'bulk-' + caseIds.join(',');
    setUpdatingCaseId(bulkId);
    try {
      const updatePromises = caseIds.map(id => {
        return supabase.from('cases').update({
          status: 'in_progress',
          volunteer_id: Number((currentUser as any).id || currentUser.uid),
          volunteer_name: currentUser.name,
          assigned_volunteer_name: currentUser.name,
          assigned_volunteer_unit: currentUser.rescueUnit || "อาสาสมัคร",
          assigned_volunteer_phone: currentUser.phone || 'ไม่ระบุเบอร์โทร',
          updated_at: new Date().toISOString()
        }).eq('id', Number(id));
      });
      await Promise.all(updatePromises);
      caseIds.forEach(id => {
        fetch('/api/line/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: id,
            status: 'in_progress',
            volunteerName: currentUser.name,
            volunteerPhone: currentUser.phone,
            volunteerUnit: currentUser.rescueUnit
          })
        }).catch(err => console.error('Push notification error:', err));
      });
      toast.success(`รับเคสสำเร็จ ${caseIds.length} เคส`);
    } catch (e) {
      console.error("Error accepting bulk cases:", e);
      toast.error('เกิดข้อผิดพลาดในการรับเคสกลุ่ม');
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const handleUpdateStatus = async (caseId: string | number, newStatus: string) => {
    setUpdatingCaseId(String(caseId));
    try {
      const now = new Date().toISOString();
      await supabase.from('cases').update({
        status: 'resolved',
        destination: newStatus,
        updated_at: now,
        resolved_at: now
      }).eq('id', Number(caseId));

      fetch('/api/line/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseId,
          status: 'resolved',
          volunteerName: currentUser?.name || 'อาสาสมัคร',
          volunteerPhone: currentUser?.phone || 'ไม่ระบุเบอร์โทร',
          volunteerUnit: currentUser?.rescueUnit || 'ศูนย์กู้ภัยฉุกเฉิน'
        })
      }).catch(err => console.error('Push notification error:', err));

      toast.success("อัปเดตสถานะสำเร็จ");
    } catch (e) {
      console.error("Error updating case status:", e);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const handleReleaseCase = async (caseId: string | number) => {
    if (!window.confirm("คุณต้องการโอนเคสนี้กลับเข้าสู่ระบบส่วนกลางใช่หรือไม่?")) {
      return;
    }
    setUpdatingCaseId(String(caseId));
    try {
      await supabase.from('cases').update({
        status: 'pending',
        volunteer_id: null,
        assigned_volunteer_name: null,
        updated_at: new Date().toISOString()
      }).eq('id', Number(caseId));
      toast.success("โอนเคสสำเร็จ");
    } catch (e) {
      console.error("Error releasing case:", e);
      toast.error('เกิดข้อผิดพลาดในการโอนเคส');
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const filteredCases = cases.filter(c => {
    const status = c.status || '';
    const isWait = isPendingCase(status);
    const isInProgress = isInProgressCase(status);
    const isCompleted = isCompletedCase(status);

    // Anti-Duplicate Race Condition Logic:
    // Only display if (Condition A) it's new/unassigned OR (Condition B) it's assigned to ME
    const isUnassigned = isWait;
    const isMine = (isInProgress || isCompleted) && (String(c.volunteer_id) === String(currentUser?.uid) || String(c.assigned_volunteer_id) === String(currentUser?.uid) || String(c.rescuer_id) === String(currentUser?.uid));
    
    if (!isUnassigned && !isMine && !(statusFilter === 'completed' && isCompleted)) {
      return false; // Vanish instantly if someone else took it
    }

    const matchStatus = statusFilter === 'all' || 
      ((statusFilter === 'รอการช่วยเหลือ' || statusFilter === 'pending') && isWait) ||
      ((statusFilter === 'กำลังช่วยเหลือ' || statusFilter === 'in_progress') && isInProgress) ||
      (statusFilter === 'completed' && isCompleted);

    const cSeverity = c.severity !== undefined && c.severity !== null ? String(c.severity) : '1';
    const matchSeverity = severityFilter === 'all' || cSeverity === severityFilter;
    
    let matchDestination = true;
    let matchCaseId = true;
    let matchVolunteer = true;
    
    if (statusFilter === 'completed' || statusFilter === 'resolved') {
      if (destinationFilter !== 'all') {
        if (destinationFilter === 'ศูนย์พักพิง') matchDestination = isShelterDestination(c.destination);
        else if (destinationFilter === 'นำส่งโรงพยาบาล' || destinationFilter === 'โรงพยาบาล/หน่วยแพทย์') matchDestination = isHospitalDestination(c.destination);
        else if (destinationFilter === 'มอบถุงยังชีพ' || destinationFilter === 'ถุงยังชีพ') matchDestination = isSuppliesDestination(c.destination);
        else matchDestination = c.destination === destinationFilter;
      }
      if (searchCaseId) {
        matchCaseId = Boolean(c.id && String(c.id).toLowerCase().includes(String(searchCaseId).toLowerCase()));
      }
      if (searchVolunteerName) {
        const vName = String(c.volunteer_name || c.assigned_volunteer_name || '');
        matchVolunteer = vName.toLowerCase().includes(String(searchVolunteerName).toLowerCase());
      }
    }
    const searchLower = String(searchQuery || '').toLowerCase();
    const matchSearch = !searchLower || 
      (c.displayId && String(c.displayId).toLowerCase().includes(searchLower)) || 
      (c.phone && String(c.phone).includes(searchQuery)) ||
      (c.details && String(c.details).toLowerCase().includes(searchLower)) ||
      (c.type && String(c.type).toLowerCase().includes(searchLower)) ||
      (c.location && String(c.location).toLowerCase().includes(searchLower)) ||
      (c.address && String(c.address).toLowerCase().includes(searchLower)) ||
      (c.subdistrict && String(c.subdistrict).toLowerCase().includes(searchLower));
      
    return matchStatus && matchSeverity && matchDestination && matchSearch && matchCaseId && matchVolunteer;
  });

  if (loading) {
    return <div className="p-8 text-center text-gray-500">กำลังโหลดเคสช่วยเหลือ...</div>;
  }

  if (filteredCases.length === 0) {
    const isSearching = searchQuery !== '' || statusFilter !== 'all' || severityFilter !== 'all';
    return (
      <div className="p-8 flex flex-col items-center justify-center bg-white dark:bg-[#151b2c] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isSearching ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600'}`}>
          {isSearching ? <Info className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {isSearching ? "ไม่มีเคสที่ตรงกับเงื่อนไขการค้นหา" : "ไม่มีเคสฉุกเฉินในขณะนี้"}
        </h3>
        {!isSearching && <p className="text-gray-500 mt-2">ขอบคุณที่เตรียมพร้อมช่วยเหลือประชาชน</p>}
      </div>
    );
  }

  let finalCases = [...filteredCases];
  if (excludeResolved) {
    finalCases = finalCases.filter(c => c.status !== 'resolved');
  }
  if (limit) {
    finalCases = finalCases.slice(0, limit);
  }

  const pendingCases = finalCases.filter(c => c.status === 'pending');
  const activeCases = finalCases.filter(c => c.status === 'in_progress');
  const resolvedCases = finalCases.filter(c => c.status === 'resolved');

  // Sort Active cases (already mostly sorted by time, but ensure 'กำลังเข้าช่วยเหลือ' are top)
  activeCases.sort((a, b) => {
    if (a.status === 'กำลังเข้าช่วยเหลือ' && b.status !== 'กำลังเข้าช่วยเหลือ') return -1;
    if (b.status === 'กำลังเข้าช่วยเหลือ' && a.status !== 'กำลังเข้าช่วยเหลือ') return 1;
    return 0;
  });

  const groupedPending: { base: any, items: any[] }[] = [];
  const processedPending = new Set();
  
  pendingCases.forEach(c => {
    if (processedPending.has(c.id)) return;
    const group = [c];
    processedPending.add(c.id);
    pendingCases.forEach(other => {
      if (!processedPending.has(other.id) && c.latitude && c.longitude && other.latitude && other.longitude) {
        if (getDistanceKm(c.latitude, c.longitude, other.latitude, other.longitude) <= 0.05) { // 50 meters
          group.push(other);
          processedPending.add(other.id);
        }
      }
    });
    groupedPending.push({ base: c, items: group });
  });

  const displayItems = [
    ...activeCases.map(c => ({ isGroup: false, base: c, items: [c] })),
    ...groupedPending.map(g => ({ isGroup: true, base: g.base, items: g.items })),
    ...resolvedCases.map(c => ({ isGroup: false, base: c, items: [c] }))
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="w-full space-y-4">
        {displayItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, idx) => {
        const c = item.base;
        const groupItems = item.items;
        const isBulk = item.isGroup && groupItems.length > 1;
        
        const status = c.status || '';
        const isWaitStatus = status === 'pending';
        const isInProgressStatus = status === 'in_progress';
        const isResolvedStatus = status === 'resolved';

        const isAcceptedByMe = (String(c.volunteer_id) === String(currentUser?.uid)) || (String(c.assigned_volunteer_id) === String(currentUser?.uid)) || (String(c.rescuer_id) === String(currentUser?.uid));
        
        const showAcceptButton = isWaitStatus;
        const showActionButtons = isInProgressStatus && isAcceptedByMe;
        
        // Proximity check (approx 500m ~ 0.5km) using Haversine
        const nearbyCases = cases.filter(other => {
          if (other.id === c.id || !c.latitude || !c.longitude || !other.latitude || !other.longitude) return false;
          const isCompleted = other.status === 'resolved';
          if (isCompleted) return false;
          return getDistanceKm(c.latitude, c.longitude, other.latitude, other.longitude) <= 0.5;
        });
        
        return (
          <div key={c.id || idx} className="bg-white dark:bg-[#151b2c] rounded-[24px] shadow-xl shadow-orange-500/5 border border-gray-100 dark:border-gray-800/60 p-5 md:p-6 mb-6 transition-all hover:shadow-2xl hover:shadow-orange-500/10">
            
            {isBulk && (
              <div className="bg-red-50 text-red-800 p-3 mb-4 rounded-xl font-bold border border-red-200 text-sm flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>มีผู้ประสบภัย {groupItems.length} เคสในจุดนี้</span>
                </div>
                <div className="text-xs font-medium sm:ml-auto opacity-90 bg-red-100 px-2.5 py-1 rounded-lg text-red-900 border border-red-200">
                  รหัส: {groupItems.map(g => g.displayId || 'ไม่ระบุ').join(', ')}
                </div>
              </div>
            )}

            {/* Gig App Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 relative">
                <div className="flex items-center gap-2 relative">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getSeverityBadgeStyle(c.severity || 1)}`}>
                    {getSeverityText(c.severity || 1)}
                  </span>
                  {(currentUser as any)?.role === 'admin' && (
                    <>
                      <button 
                        onClick={() => setEditingSeverity(editingSeverity === c.id ? null : c.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                        title="แก้ไขระดับความรุนแรง (Admin Only)"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {editingSeverity === c.id && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#151b2c] shadow-2xl border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden whitespace-nowrap min-w-[240px] animate-in zoom-in-95 duration-200">
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500">
                            ปรับระดับความรุนแรง (Override)
                          </div>
                          {[5,4,3,2,1].map(lvl => (
                            <button 
                              key={lvl} 
                              className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center gap-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0 transition-colors"
                              onClick={() => handleUpdateSeverity(c.id, lvl)}
                            >
                              <span className={`w-3 h-3 rounded-full ${getSeverityColor(lvl).split(' ')[0]}`}></span>
                              <span className="text-gray-700 dark:text-gray-300 font-medium">{getSeverityText(lvl)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-lg ml-1">{c.displayId}</span>
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Clock className="w-4 h-4" /> 
                {c.created_at ? new Date(c.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : '-'}
              </div>
            </div>

            {/* Gig App Body */}
            <div className="space-y-3 mb-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900 dark:text-white text-xl">{c.type || 'ขอความช่วยเหลือฉุกเฉิน'}</h3>
                  <button 
                    onClick={() => setSelectedCase(c)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                    title="ดูคำแนะนำการกู้ภัยจาก AI"
                  >
                    ⚡ คำแนะนำ AI
                  </button>
                </div>
                
                {/* Compact Info Tags */}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg flex items-center gap-1 border border-blue-200 dark:border-blue-800/50">
                    <Users className="w-3.5 h-3.5" /> {c.people_count || 1} คน
                  </span>
                  {c.water_level && c.water_level !== '-' && (
                    <span className="px-2.5 py-1 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-xs font-bold rounded-lg flex items-center gap-1 border border-cyan-200 dark:border-cyan-800/50">
                      🌊 น้ำ: {c.water_level}
                    </span>
                  )}
                  {c.bedridden > 0 && (
                    <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg flex items-center gap-1 border border-red-200 dark:border-red-800/50">
                      🛏️ ติดเตียง
                    </span>
                  )}
                  {c.elderly > 0 && (
                    <span className="px-2.5 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 text-xs font-bold rounded-lg flex items-center gap-1 border border-orange-200 dark:border-orange-800/50">
                      👴 เด็ก/ผู้สูงอายุ
                    </span>
                  )}
                </div>
                
                {c.details && <div className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-100 dark:border-gray-700">{c.details}</div>}
              </div>

              {/* Location details fallback (optional general area) */}
              {c.address && c.address !== '-' && (
                <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400 text-sm mt-2">
                  <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="line-clamp-2">{c.address}</div>
                </div>
              )}

              {/* Large Call Button */}
              {c.phone ? (
                <a href={`tel:${c.phone}`} className="flex items-center justify-center w-full py-3 mt-3 text-base font-bold bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-500/20 rounded-xl gap-2 transition-colors border border-green-600">
                  <Phone className="w-5 h-5" /> โทรหาผู้ประสบภัย
                </a>
              ) : (
                <div className="flex items-center justify-center w-full py-3 mt-3 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl gap-2 border border-gray-200 dark:border-gray-700">
                  <Phone className="w-4 h-4" /> ไม่มีเบอร์ติดต่อ
                </div>
              )}
              
              {nearbyCases.length > 0 && (
                <div className="mt-3 bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-200 text-sm flex items-start gap-2">
                  <MapPin className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">เคสใกล้เคียงรัศมี 500m ({nearbyCases.length} เคส)</span>
                    <p className="text-xs opacity-80 mt-0.5">รวมรหัส: {nearbyCases.map(n => n.displayId || 'ไม่ระบุ').join(', ')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Gig App Interaction Flow */}
            <div className="mt-2">
              {showAcceptButton && (
                <Button 
                  onClick={() => isBulk ? handleBulkAccept(groupItems.map(i => i.id)) : handleAcceptCase(c.id)}
                  disabled={updatingCaseId === c.id || (isBulk && updatingCaseId === 'bulk-' + groupItems.map(i=>i.id).join(','))}
                  className="w-full h-auto py-4 sm:py-6 text-base sm:text-lg md:text-xl font-bold bg-[#10b981] hover:bg-[#059669] text-white shadow-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-normal leading-tight break-words"
                >
                  {isBulk 
                    ? (updatingCaseId === 'bulk-' + groupItems.map(i=>i.id).join(',') ? "กำลังดำเนินการ..." : `รับเคสทั้งหมดในจุดนี้ (${groupItems.length} เคส)`)
                    : (updatingCaseId === c.id ? "กำลังดำเนินการ..." : "รับเคสนี้ (Accept Case)")}
                </Button>
              )}

              {isResolvedStatus && (
                <div className="w-full py-4 text-center text-lg font-bold text-green-600 bg-green-50 border border-green-200 rounded-xl">
                  {c.destination || 'ช่วยเหลือสำเร็จแล้ว'}
                </div>
              )}

              {showActionButtons && (
                <div className="space-y-4 animate-in fade-in">
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full h-auto py-4 sm:py-6 text-base sm:text-lg md:text-xl font-bold bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-lg rounded-xl gap-2 transition-colors whitespace-normal leading-tight break-words"
                  >
                    <MapPin className="w-6 h-6" /> นำทางด้วย GPS
                  </a>
                  
                  <div className="flex items-center py-2">
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">บันทึกผลการช่วยเหลือ</span>
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  
                  <details className="group border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/30 overflow-hidden">
                    <summary className="cursor-pointer p-4 font-bold text-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors list-none flex justify-center items-center gap-2">
                      <span>บันทึกผลการช่วยเหลือ / ปิดเคส</span>
                      <span className="group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4 bg-white dark:bg-[#151b2c]">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button 
                          variant="outline"
                          disabled={updatingCaseId === c.id}
                          className="py-4 border-2 border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-800/60 font-bold flex flex-col gap-1 h-auto rounded-xl disabled:opacity-50 transition-colors shadow-sm"
                          onClick={() => handleUpdateStatus(c.id, 'ส่งเข้าศูนย์พักพิง')}
                        >
                          <Home className="w-6 h-6 mb-1" />
                          <span className="text-sm">ศูนย์พักพิง</span>
                        </Button>
                        <Button 
                          variant="outline"
                          disabled={updatingCaseId === c.id}
                          className="py-4 border-2 border-orange-400 bg-orange-50 hover:bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:border-orange-500 dark:text-orange-300 dark:hover:bg-orange-800/60 font-bold flex flex-col gap-1 h-auto rounded-xl disabled:opacity-50 transition-colors shadow-sm"
                          onClick={() => handleUpdateStatus(c.id, 'มอบถุงยังชีพ')}
                        >
                          <Package className="w-6 h-6 mb-1" />
                          <span className="text-sm">มอบถุงยังชีพ</span>
                        </Button>
                        <Button 
                          variant="outline"
                          disabled={updatingCaseId === c.id}
                          className="py-4 border-2 border-red-400 bg-red-50 hover:bg-red-100 text-red-800 dark:bg-red-900/40 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-800/60 font-bold flex flex-col gap-1 h-auto rounded-xl disabled:opacity-50 transition-colors shadow-sm"
                          onClick={() => handleUpdateStatus(c.id, 'นำส่งโรงพยาบาล')}
                        >
                          <Hospital className="w-6 h-6 mb-1" />
                          <span className="text-sm">โรงพยาบาล</span>
                        </Button>
                      </div>

                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                        <Button
                          variant="ghost"
                          disabled={updatingCaseId === c.id}
                          onClick={() => handleReleaseCase(c.id)}
                          className="w-full text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 py-2 border border-transparent hover:border-red-100 dark:hover:border-red-800/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          ⚠️ ไม่สามารถช่วยเหลือได้ (โอนเคสกลับส่วนกลาง)
                        </Button>
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
            
          </div>
        );
      })}
      </div>
      
      {Math.ceil(displayItems.length / itemsPerPage) > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8 pb-4">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-[#151b2c] text-slate-700 dark:text-slate-300 shadow-sm"
          >
            ก่อนหน้า
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.ceil(displayItems.length / itemsPerPage) }).map((_, i) => {
              const page = i + 1;
              const totalPages = Math.ceil(displayItems.length / itemsPerPage);
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
            onClick={() => setCurrentPage(p => Math.min(Math.ceil(displayItems.length / itemsPerPage), p + 1))}
            disabled={currentPage === Math.ceil(displayItems.length / itemsPerPage)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-[#151b2c] text-slate-700 dark:text-slate-300 shadow-sm"
          >
            ถัดไป
          </button>
        </div>
      )}

      {selectedCase && (
        <CaseDetailModal 
          isOpen={!!selectedCase} 
          onClose={() => setSelectedCase(null)} 
          caseData={selectedCase} 
        />
      )}
    </div>
  );
};
