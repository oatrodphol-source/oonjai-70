'use client';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { MapPin, Navigation, Package, Home, Hospital, Phone, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
    } catch (e) {
      console.error("Error accepting case:", e);
      alert('เกิดข้อผิดพลาดในการรับเคส');
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

  let finalCases = filteredCases;
  if (limit) {
    finalCases = finalCases.slice(0, limit);
  }

  return (
    <div className="space-y-4 w-full">
      {finalCases.map((c) => {
        const isAcceptedByMe = (c.assigned_volunteer_id === currentUser?.uid) || (c.rescuerId === currentUser?.uid);
        const isPending = !c.assigned_volunteer_id && !c.rescuerId;
        
        return (
          <div key={c.id} className="bg-white dark:bg-[#151b2c] rounded-[24px] shadow-xl shadow-orange-500/5 border border-gray-100 dark:border-gray-800/60 p-5 md:p-6 mb-6 transition-all hover:shadow-2xl hover:shadow-orange-500/10">
            
            {/* Gig App Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 relative">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${getSeverityColor(c.severity)}`}>
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
            </div>

            {/* Gig App Interaction Flow */}
            <div className="mt-2">
              {isPending && (
                <Button 
                  onClick={() => handleAcceptCase(c.id)}
                  disabled={updatingCaseId === c.id}
                  className="w-full py-6 text-xl font-bold bg-[#10b981] hover:bg-[#059669] text-white shadow-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingCaseId === c.id ? "กำลังดำเนินการ..." : "รับเคสนี้ (Accept Case)"}
                </Button>
              )}

              {isAcceptedByMe && (
                <div className="space-y-4 animate-in fade-in">
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full py-6 text-xl font-bold bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-lg rounded-xl gap-2 transition-colors"
                  >
                    <MapPin className="w-6 h-6" /> นำทางด้วย GPS
                  </a>
                  
                  <div className="flex items-center py-2">
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">เลือกปลายทางเพื่อปิดเคส</span>
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  
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
              )}
            </div>
            
          </div>
        );
      })}
    </div>
  );
};
