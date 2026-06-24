'use client';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { MapPin, Navigation, Package, Home, Hospital, Phone, Clock, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { getSeverityBadgeStyle } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

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
  limit
}: { 
  statusFilter?: string, 
  severityFilter?: string, 
  searchQuery?: string,
  limit?: number
}) => {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{uid: string, name: string, phone?: string, rescueUnit?: string} | null>(null);
  const [updatingCaseId, setUpdatingCaseId] = useState<string | null>(null);
  const [editingSeverity, setEditingSeverity] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const displayToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oonjai_user');
      if (stored) {
        const user = JSON.parse(stored);
        setCurrentUser({ uid: user.uid, name: user.name, phone: user.phone, rescueUnit: user.rescueUnit });
      }
    } catch (e) {
      console.error(e);
    }

    const casesRef = collection(db, 'cases');
    // Fetch cases that are active (not completed yet)
    const q = query(
      casesRef, 
      where('status', 'in', ['pending', 'wait', 'รอการช่วยเหลือ', 'in_progress', 'กำลังช่วยเหลือ', 'กำลังเข้าช่วยเหลือ'])
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedCases: any[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        fetchedCases.push({
          id: docSnap.id,
          ...data,
          displayId: data.case_number ? `CAS-${String(data.case_number).padStart(3, '0')}` : `CAS-${docSnap.id.substring(0, 5)}`,
        });
      });

      // Sort by severity (5 to 1), then by time
      fetchedCases.sort((a, b) => {
        const sevDiff = (b.severity || 1) - (a.severity || 1);
        if (sevDiff !== 0) return sevDiff;
        const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
        const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
        return timeA - timeB; // Older first
      });

      setCases(fetchedCases);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching volunteer cases:", error);
      setLoading(false);
    });

    return () => unsub();
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

  const handleAcceptCase = async (caseId: string) => {
    if (!currentUser) return alert('ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่');
    
    setUpdatingCaseId(caseId);
    try {
      const caseRef = doc(db, 'cases', caseId);
      await updateDoc(caseRef, {
        status: 'กำลังเข้าช่วยเหลือ',
        assigned_volunteer_id: currentUser.uid,
        assigned_volunteer_name: currentUser.name,
        assigned_volunteer_unit: currentUser.rescueUnit || "อาสาสมัคร",
        assigned_volunteer_phone: currentUser.phone || 'ไม่ระบุเบอร์โทร',
        updated_at: new Date().toISOString()
      });
      displayToast("รับเคสสำเร็จ");
    } catch (e) {
      console.error("Error accepting case:", e);
      alert('เกิดข้อผิดพลาดในการรับเคส');
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const handleBulkAccept = async (caseIds: string[]) => {
    if (!currentUser) return alert('ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่');
    
    const bulkId = 'bulk-' + caseIds.join(',');
    setUpdatingCaseId(bulkId);
    try {
      const updatePromises = caseIds.map(id => {
        const caseRef = doc(db, 'cases', id);
        return updateDoc(caseRef, {
          status: 'กำลังเข้าช่วยเหลือ',
          assigned_volunteer_id: currentUser.uid,
          assigned_volunteer_name: currentUser.name,
          assigned_volunteer_unit: currentUser.rescueUnit || "อาสาสมัคร",
          assigned_volunteer_phone: currentUser.phone || 'ไม่ระบุเบอร์โทร',
          updated_at: new Date().toISOString()
        });
      });
      await Promise.all(updatePromises);
      displayToast(`รับเคสสำเร็จ ${caseIds.length} เคส`);
    } catch (e) {
      console.error("Error accepting bulk cases:", e);
      alert('เกิดข้อผิดพลาดในการรับเคสกลุ่ม');
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const handleUpdateStatus = async (caseId: string, newStatus: string) => {
    setUpdatingCaseId(caseId);
    try {
      const caseRef = doc(db, 'cases', caseId);
      const now = new Date().toISOString();
      await updateDoc(caseRef, {
        status: newStatus,
        updated_at: now,
        resolved_at: now,
        completedAt: now
      });
      displayToast("อัปเดตสถานะสำเร็จ");
    } catch (e) {
      console.error("Error updating case status:", e);
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const handleReleaseCase = async (caseId: string) => {
    if (!window.confirm("คุณต้องการโอนเคสนี้กลับเข้าสู่ระบบส่วนกลางใช่หรือไม่?")) {
      return;
    }
    setUpdatingCaseId(caseId);
    try {
      const caseRef = doc(db, 'cases', caseId);
      await updateDoc(caseRef, {
        status: 'รอการช่วยเหลือ',
        assigned_volunteer_id: null,
        assigned_volunteer_name: null,
        updated_at: new Date().toISOString()
      });
      displayToast("โอนเคสสำเร็จ");
    } catch (e) {
      console.error("Error releasing case:", e);
      alert('เกิดข้อผิดพลาดในการโอนเคส');
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const filteredCases = cases.filter(c => {
    const status = c.status || '';
    const isWait = ['wait', 'pending', 'รอการช่วยเหลือ'].includes(status);
    const isInProgress = ['in_progress', 'กำลังช่วยเหลือ', 'กำลังเข้าช่วยเหลือ'].includes(status);

    // Anti-Duplicate Race Condition Logic:
    // Only display if (Condition A) it's new/unassigned OR (Condition B) it's assigned to ME
    const isUnassigned = isWait;
    const isMine = isInProgress && (c.assigned_volunteer_id === currentUser?.uid || c.rescuerId === currentUser?.uid);
    
    if (!isUnassigned && !isMine) {
      return false; // Vanish instantly if someone else took it
    }

    const matchStatus = statusFilter === 'all' || 
      (statusFilter === 'รอการช่วยเหลือ' && isWait) ||
      (statusFilter === 'กำลังช่วยเหลือ' && isInProgress);

    const matchSeverity = severityFilter === 'all' || (c.severity && c.severity.toString() === severityFilter);
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = searchQuery === '' || 
      (c.displayId && c.displayId.toLowerCase().includes(searchLower)) || 
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.details && c.details.toLowerCase().includes(searchLower)) ||
      (c.type && c.type.toLowerCase().includes(searchLower)) ||
      (c.location && c.location.toLowerCase().includes(searchLower)) ||
      (c.address && c.address.toLowerCase().includes(searchLower)) ||
      (c.subdistrict && c.subdistrict.toLowerCase().includes(searchLower));
      
    return matchStatus && matchSeverity && matchSearch;
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
  if (limit) {
    finalCases = finalCases.slice(0, limit);
  }

  const pendingCases = finalCases.filter(c => ['wait', 'pending', 'รอการช่วยเหลือ'].includes(c.status || ''));
  const activeCases = finalCases.filter(c => ['in_progress', 'กำลังช่วยเหลือ', 'กำลังเข้าช่วยเหลือ'].includes(c.status || ''));

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
    ...groupedPending.map(g => ({ isGroup: true, base: g.base, items: g.items }))
  ];

  return (
    <div className="space-y-4 w-full">
      {displayItems.map((item, idx) => {
        const c = item.base;
        const groupItems = item.items;
        const isBulk = item.isGroup && groupItems.length > 1;
        
        const isAcceptedByMe = (c.assigned_volunteer_id === currentUser?.uid) || (c.rescuerId === currentUser?.uid);
        const isPending = !c.assigned_volunteer_id && !c.rescuerId;
        
        // Proximity check (approx 500m ~ 0.5km) using Haversine
        const nearbyCases = cases.filter(other => {
          if (other.id === c.id || !c.latitude || !c.longitude || !other.latitude || !other.longitude) return false;
          const isCompleted = ['เสร็จสิ้น', 'สำเร็จ', 'completed', 'ปลอดภัยแล้ว', 'ส่งเข้าศูนย์พักพิงสำเร็จ', 'มอบถุงยังชีพเสร็จสิ้น', 'นำส่งโรงพยาบาลแล้ว'].includes(other.status);
          if (isCompleted) return false;
          return getDistanceKm(c.latitude, c.longitude, other.latitude, other.longitude) <= 0.5;
        });
        
        return (
          <div key={c.id || idx} className="bg-white dark:bg-[#151b2c] rounded-[24px] shadow-xl shadow-orange-500/5 border border-gray-100 dark:border-gray-800/60 p-5 md:p-6 mb-6 transition-all hover:shadow-2xl hover:shadow-orange-500/10">
            
            {isBulk && (
              <div className="bg-red-100 text-red-800 p-3 mb-4 rounded-xl font-bold border border-red-200 text-lg flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <span>🚨</span> มีผู้ประสบภัย {groupItems.length} เคสในจุดนี้
                </div>
                <div className="text-sm font-normal sm:ml-auto opacity-90 bg-red-200 px-2 py-1 rounded-lg text-red-900 border border-red-300">
                  รหัส: {groupItems.map(g => g.displayId || 'ไม่ระบุ').join(', ')}
                </div>
              </div>
            )}

            {/* Gig App Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 relative">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getSeverityBadgeStyle(c.severity || 1)}`}>
                    {getSeverityText(c.severity || 1)}
                  </span>
                  <button 
                    onClick={() => setEditingSeverity(editingSeverity === c.id ? null : c.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                    title="แก้ไขระดับความรุนแรง"
                  >
                    ✏️
                  </button>
                </div>
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
                <span className="font-bold text-gray-900 dark:text-white text-lg ml-1">{c.displayId}</span>
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Clock className="w-4 h-4" /> 
                {c.createdAt ? new Date(c.createdAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : 
                 (c.created_at ? new Date(c.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : '-')}
              </div>
            </div>

            {/* Gig App Body */}
            <div className="space-y-3 mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-xl">{c.type || 'ขอความช่วยเหลือฉุกเฉิน'}</h3>
              
              <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300 text-base">
                <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>พิกัด: {c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)}</div>
              </div>

              <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300 text-base">
                <Phone className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="font-semibold text-lg">{c.phone || 'ไม่ระบุเบอร์โทร'}</div>
              </div>

              <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300 text-base bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between">
                    <span>ระดับน้ำ: <span className="font-bold text-red-500">{c.waterLevel || '-'}</span></span>
                    <span>จำนวน: <span className="font-bold">{c.peopleCount || 1} คน</span></span>
                  </div>
                  {(c.bedridden || c.elderly) && (
                    <div className="flex gap-2 mt-1">
                      {c.bedridden && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-bold">ผู้ป่วยติดเตียง</span>}
                      {c.elderly && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-bold">เด็กเล็ก/ผู้สูงอายุ</span>}
                    </div>
                  )}
                  {c.details && <div className="text-sm mt-1 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-1">{c.details}</div>}
                </div>
              </div>
              
              {nearbyCases.length > 0 && (
                <div className="mt-3 bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-200 text-sm flex items-start gap-2">
                  <span className="text-lg">📍</span>
                  <div>
                    <span className="font-semibold">เคสใกล้เคียงรัศมี 500m ({nearbyCases.length} เคส)</span>
                    <p className="text-xs opacity-80 mt-0.5">รวมรหัส: {nearbyCases.map(n => n.displayId || 'ไม่ระบุ').join(', ')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Gig App Interaction Flow */}
            <div className="mt-2">
              {isPending && (
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

              {isAcceptedByMe && (
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
                      <span>📝 บันทึกผลการช่วยเหลือ / ปิดเคส</span>
                      <span className="group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4 bg-white dark:bg-[#151b2c]">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button 
                          variant="outline"
                          disabled={updatingCaseId === c.id}
                          className="py-4 border-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-500 text-emerald-700 dark:border-emerald-800/50 dark:hover:bg-emerald-900/20 font-bold flex flex-col gap-1 h-auto rounded-xl disabled:opacity-50"
                          onClick={() => handleUpdateStatus(c.id, 'ส่งเข้าศูนย์พักพิงสำเร็จ')}
                        >
                          <Home className="w-5 h-5 mb-1" />
                          <span className="text-sm">ศูนย์พักพิง</span>
                        </Button>
                        <Button 
                          variant="outline"
                          disabled={updatingCaseId === c.id}
                          className="py-4 border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-500 text-[#ff6600] dark:border-orange-800/50 dark:hover:bg-orange-900/20 font-bold flex flex-col gap-1 h-auto rounded-xl disabled:opacity-50"
                          onClick={() => handleUpdateStatus(c.id, 'มอบถุงยังชีพเสร็จสิ้น')}
                        >
                          <Package className="w-5 h-5 mb-1" />
                          <span className="text-sm">มอบถุงยังชีพ</span>
                        </Button>
                        <Button 
                          variant="outline"
                          disabled={updatingCaseId === c.id}
                          className="py-4 border-2 border-red-200 hover:bg-red-50 hover:border-red-500 text-red-600 dark:border-red-800/50 dark:hover:bg-red-900/20 font-bold flex flex-col gap-1 h-auto rounded-xl disabled:opacity-50"
                          onClick={() => handleUpdateStatus(c.id, 'นำส่งโรงพยาบาลแล้ว')}
                        >
                          <Hospital className="w-5 h-5 mb-1" />
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
      
      {showToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl z-[9999] text-sm animate-in fade-in slide-in-from-bottom-5">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
