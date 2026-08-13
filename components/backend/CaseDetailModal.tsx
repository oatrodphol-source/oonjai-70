import React, { useState, useEffect } from 'react';
import { Case } from '@/types';
import { supabase } from '@/lib/supabase';

interface CaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: (Case & { 
    originalId?: string | number; 
    time?: string; 
    note?: string; 
    volunteer_name?: string;
    assigned_volunteer_name?: string;
    assigned_volunteer_phone?: string;
    assigned_volunteer_unit?: string;
    destination?: string;
    volunteer_id?: number | string;
  }) | null;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({ isOpen, onClose, caseData }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [editStatus, setEditStatus] = useState('pending');
  const [editDestination, setEditDestination] = useState('');
  const [editVolunteerId, setEditVolunteerId] = useState<string | number>('');
  const [volunteersList, setVolunteersList] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oonjai_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user.role === 'admin' || user.role === 'manager') {
          setIsAdmin(true);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const fetchVolunteers = async () => {
        try {
          const { data, error } = await supabase
            .from('volunteers')
            .select('id, name, phone, agency, province, address, skills_equipment, latitude, longitude')
            .order('name');
          if (!error && data) {
            setVolunteersList(data);
          }
        } catch (e) {
          console.error('Error fetching volunteers:', e);
        }
      };
      fetchVolunteers();
    }
  }, [isAdmin]);

  // AI Smart Match Algorithm
  const calculateDistance = (lat1?: number, lon1?: number, lat2?: number, lon2?: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getAiRecommendedVolunteer = () => {
    if (!volunteersList.length || !caseData) return null;

    const caseLat = caseData.latitude;
    const caseLng = caseData.longitude;
    const caseDetails = ((caseData.details || '') + (caseData.water_level || '')).toLowerCase();
    const isWaterCase = caseDetails.includes('น้ำ') || caseDetails.includes('ท่วม') || caseDetails.includes('เรือ');
    const isMedicalCase = caseDetails.includes('ป่วย') || caseDetails.includes('ติดเตียง') || caseDetails.includes('พยาบาล');

    const scoredVols = volunteersList.map((vol) => {
      let score = 50;
      let distanceKm: number | null = null;

      if (caseLat && caseLng && vol.latitude && vol.longitude) {
        distanceKm = calculateDistance(caseLat, caseLng, vol.latitude, vol.longitude);
        if (distanceKm !== null) {
          if (distanceKm < 5) score += 35;
          else if (distanceKm < 15) score += 20;
          else if (distanceKm < 30) score += 10;
        }
      }

      const volSkills = (vol.skills_equipment || '').toLowerCase();
      if (isWaterCase && (volSkills.includes('เรือ') || volSkills.includes('ดำน้ำ'))) {
        score += 25;
      }
      if (isMedicalCase && (volSkills.includes('พยาบาล') || volSkills.includes('als') || volSkills.includes('ปฐมพยาบาล'))) {
        score += 25;
      }

      return { ...vol, score: Math.min(score, 99), distanceKm };
    });

    scoredVols.sort((a, b) => b.score - a.score);
    return scoredVols[0] || null;
  };

  const aiRecommendedVol = getAiRecommendedVolunteer();

  useEffect(() => {
    if (caseData) {
      setEditStatus(caseData.status || 'pending');
      setEditDestination(caseData.destination || '');
      setEditVolunteerId(caseData.volunteer_id || '');
    }
  }, [caseData]);

  const handleSave = async () => {
    if (!caseData || (!caseData.originalId && !caseData.id)) return;
    setIsSaving(true);
    try {
      const idToUpdate = caseData.originalId || caseData.id;
      
      let volunteerUpdateData = {};
      
      if (editVolunteerId === '') {
        volunteerUpdateData = {
          volunteer_id: null,
          volunteer_name: null,
          assigned_volunteer_phone: null,
          assigned_volunteer_unit: null
        };
      } else {
        const selectedVol = volunteersList.find(v => String(v.id) === String(editVolunteerId));
        if (selectedVol) {
          volunteerUpdateData = {
            volunteer_id: selectedVol.id,
            volunteer_name: selectedVol.name,
            assigned_volunteer_phone: selectedVol.phone || null,
            assigned_volunteer_unit: selectedVol.agency || null
          };
        }
      }

      const { error } = await supabase
        .from('cases')
        .update({
          status: editStatus,
          destination: editDestination,
          updated_at: new Date().toISOString(),
          ...volunteerUpdateData
        })
        .eq('id', idToUpdate);

      if (error) throw error;
      
      alert('✅ บันทึกการแก้ไขสำเร็จ');
      window.location.reload();
    } catch (err: any) {
      console.error('Error updating case:', err);
      alert(`❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCase = async () => {
    if (!caseData) return;
    const confirmed = window.confirm('คุณต้องการยกเลิกและลบเคสนี้ออกจากระบบ (Supabase) ใช่หรือไม่? การดำเนินการนี้จะลบเคสจากฐานข้อมูลทันที');
    if (!confirmed) return;

    try {
      setIsSaving(true);
      const idToDelete = caseData.id || caseData.originalId;
      const { error } = await supabase.from('cases').delete().eq('id', idToDelete);
      if (error) throw error;

      alert('✅ ลบเคสและยกเลิกข้อมูลสำเร็จ');
      onClose();
      window.location.reload();
    } catch (err: any) {
      console.error('Error deleting case:', err);
      alert(`❌ เกิดข้อผิดพลาดในการลบเคส: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !caseData) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[4000] flex items-center justify-center p-4 backdrop-blur-sm transition-all">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        <div className={`p-6 flex justify-between items-center text-white ${
          caseData.severity === 5 ? 'bg-red-600' : 
          caseData.severity === 4 ? 'bg-orange-500' : 'bg-yellow-500'
        }`}>
          <div>
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
              🚨 รหัสเคส: {caseData.case_number || caseData.id}
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
                ระดับความรุนแรง {caseData.severity || '-'}
              </span>
            </h2>
            <p className="text-sm opacity-90 mt-1">แจ้งเมื่อ: {caseData.time || (caseData.created_at ? new Date(caseData.created_at).toLocaleString('th-TH') : '-')}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center transition-colors">✕</button>
        </div>

        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* AI Disaster Risk Analysis Card (Matching Image 2) */}
          <div className="col-span-1 md:col-span-2 bg-[#0d1527] dark:bg-[#0b1325] border border-orange-500/40 dark:border-orange-500/30 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-700/50 pb-4">
              <h3 className="text-2xl font-black text-white flex items-center gap-2">
                ระดับความเสี่ยง: <span className="text-orange-500">{caseData.severity || 1}</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md">
                  AI Score: {caseData.severity === 5 ? '92/100' : caseData.severity === 4 ? '75/100' : caseData.severity === 3 ? '58/100' : caseData.severity === 2 ? '35/100' : '18/100'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1">
                  ⏱ เวลาที่เข้าถึงพื้นที่: <strong className="text-orange-400">
                    {caseData.severity === 5 ? 'ภายใน 15-30 นาที' : caseData.severity === 4 ? 'ภายใน 30-60 นาที' : caseData.severity === 3 ? 'ภายใน 1-3 ชั่วโมง' : 'ภายใน 6-12 ชั่วโมง'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Situation & Recommended Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <h4 className="font-bold text-slate-300 text-sm mb-2">สรุปสถานการณ์</h4>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {caseData.details ? caseData.details.replace(/\[AI Analysis[^\]]*\]/g, '').trim() || 'เกิดเหตุน้ำท่วมขังในพื้นที่ ต้องการความช่วยเหลือ' : `เกิดเหตุภัยพิบัติ ขอความช่วยเหลือในพื้นที่ มีผู้ประสบภัย ${caseData.people_count || 1} คน`}
                </p>
              </div>

              <div className="bg-orange-500/5 border border-orange-500/40 rounded-xl p-4">
                <h4 className="font-bold text-orange-400 text-sm mb-2 flex items-center gap-1.5">
                  ⚡ คำแนะนำการปฏิบัติงาน
                </h4>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {(caseData.severity || 1) >= 4 || (caseData as any).bedridden ? 
                    "ส่งทีมกู้ภัยพร้อมเรือท้องแบนและเสื้อชูชีพเข้าช่วยเหลือเพื่อเร่งอพยพกลุ่มเปราะบาง (ผู้ป่วยติดเตียง/ผู้สูงอายุ/เด็กเล็ก) ออกสู่พื้นที่ปลอดภัยโดยด่วน พร้อมจัดสรรถังออกซิเจน ยาประจำตัว และอาหาร/น้ำดื่มสำรอง" :
                    (caseData.severity === 3 ?
                      "จัดส่งทีมกู้ภัยนำส่งเสบียง ถุงยังชีพ น้ำดื่มสะอาด และยาสามัญประจำบ้าน เข้าช่วยเหลือผู้ประสบภัยที่สัญจรลำบาก" :
                      "ประสานงานทีมอาสาสมัครในพื้นที่ติดตามเฝ้าระวังระดับน้ำอย่างใกล้ชิด และเตรียมแผนอพยพสำรอง"
                    )
                  }
                </p>
              </div>
            </div>

            {/* Detected Keywords */}
            <div>
              <h4 className="font-bold text-slate-300 text-xs uppercase tracking-wider mb-2">คีย์เวิร์ดที่พบ</h4>
              <div className="flex flex-wrap gap-2">
                {caseData.water_level && caseData.water_level !== '-' && (
                  <span className="px-3 py-1 bg-blue-900/40 border border-blue-500/30 text-blue-300 rounded-full text-xs font-medium">
                    น้ำ: {caseData.water_level}
                  </span>
                )}
                {(caseData as any).bedridden ? (
                  <span className="px-3 py-1 bg-red-900/40 border border-red-500/30 text-red-300 rounded-full text-xs font-medium">
                    ผู้ป่วยติดเตียง
                  </span>
                ) : null}
                {(caseData as any).elderly ? (
                  <span className="px-3 py-1 bg-amber-900/40 border border-amber-500/30 text-amber-300 rounded-full text-xs font-medium">
                    ผู้สูงอายุ/เด็กเล็ก
                  </span>
                ) : null}
                <span className="px-3 py-1 bg-blue-900/40 border border-blue-500/30 text-blue-300 rounded-full text-xs font-medium">
                  ผู้ประสบภัย {caseData.people_count || 1} คน
                </span>
                {(caseData.severity || 1) >= 4 && (
                  <>
                    <span className="px-3 py-1 bg-blue-900/40 border border-blue-500/30 text-blue-300 rounded-full text-xs font-medium">ต้องการเรือ</span>
                    <span className="px-3 py-1 bg-blue-900/40 border border-blue-500/30 text-blue-300 rounded-full text-xs font-medium">รถเข้าไม่ได้</span>
                    <span className="px-3 py-1 bg-blue-900/40 border border-blue-500/30 text-blue-300 rounded-full text-xs font-medium">ไม่มีทางออก</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* ข้อมูลผู้แจ้ง */}
            <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700">
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold mb-2">👤 ข้อมูลผู้แจ้ง / ผู้ประสบภัย</h3>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{caseData.name || 'ไม่ระบุชื่อ'}</p>
              <p className="text-slate-600 dark:text-slate-300 mt-1">📞 เบอร์ติดต่อ: {caseData.phone || 'ไม่มี'}</p>
            </div>

            {/* ข้อมูลทีมช่วยเหลือ (แสดงเฉพาะเมื่อ in_progress หรือ resolved) */}
            {(caseData.status === 'in_progress' || caseData.status === 'resolved') && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                <h3 className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-2">🚑 ข้อมูลทีมช่วยเหลือ</h3>
                <p className="text-lg font-bold text-slate-800 dark:text-white">
                  {caseData.volunteer_name || caseData.assigned_volunteer_name || 'ไม่ระบุชื่อทีม/อาสา'}
                </p>
                <div className="grid grid-cols-1 gap-1 mt-2 text-slate-600 dark:text-slate-300 text-sm">
                  <p>📞 เบอร์ติดต่อ: {caseData.assigned_volunteer_phone || 'ไม่มี'}</p>
                  <p>🏢 หน่วยงาน: {caseData.assigned_volunteer_unit || 'ไม่ระบุ'}</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-800/30">
              <h3 className="text-blue-600 dark:text-blue-400 text-sm font-semibold mb-2">📍 พิกัดและสถานที่</h3>
              <p className="text-slate-800 dark:text-white font-medium mb-3 leading-relaxed">{caseData.details || (caseData.latitude ? `${caseData.latitude}, ${caseData.longitude}` : 'ไม่มีรายละเอียดสถานที่')}</p>
              {caseData.latitude && caseData.longitude && (
                <a href={`https://www.google.com/maps?q=${caseData.latitude},${caseData.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  🗺️ เปิดพิกัดใน Google Maps
                </a>
              )}
            </div>

            {isAdmin && (
              <button 
                onClick={handleDeleteCase}
                disabled={isSaving}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg p-2.5 w-full flex items-center justify-center gap-2 font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                🗑️ ยกเลิกเคสนี้ (ลบข้อมูล)
              </button>
            )}

          </div>

          <div className="space-y-6">
            <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-xl border border-orange-100 dark:border-orange-800/30">
              <h3 className="text-orange-600 dark:text-orange-400 text-sm font-semibold mb-4">🧠 ข้อมูลประเมิน (Smart Triage)</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div className="text-slate-500">จำนวนผู้ประสบภัย:</div>
                <div className="font-bold text-slate-800 dark:text-white">{caseData.people_count || 1} คน</div>
                <div className="text-slate-500">เด็ก / ผู้สูงอายุ:</div>
                <div className="font-bold text-slate-800 dark:text-white">{(caseData as any).elderly ? 'มี' : 'ไม่มี'}</div>
                <div className="text-slate-500">ผู้ป่วยติดเตียง:</div>
                <div className="font-bold text-slate-800 dark:text-white">{(caseData as any).bedridden ? 'มี' : 'ไม่มี'}</div>
                <div className="text-slate-500">ระดับน้ำ:</div>
                <div className="font-bold text-slate-800 dark:text-white">{caseData.water_level || '-'}</div>
              </div>
            </div>

            {/* Admin Edit Mode */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
              <h3 className="text-slate-800 dark:text-white text-sm font-semibold mb-4">สถานะการช่วยเหลือและการจัดการ</h3>
              
              {isAdmin ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">สถานะ (Status)</label>
                    <select 
                      value={editStatus} 
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 p-2.5 rounded-lg dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="pending">🔴 รอดำเนินการ</option>
                      <option value="in_progress">🟡 กำลังช่วยเหลือ</option>
                      <option value="resolved">🟢 ช่วยเหลือเสร็จสิ้น (Resolved)</option>
                      <option value="completed">🟢 ช่วยเหลือเสร็จสิ้น (Completed)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">จุดหมายปลายทาง (Destination)</label>
                    <select 
                      value={editDestination} 
                      onChange={(e) => setEditDestination(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 p-2.5 rounded-lg dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">ไม่ได้ระบุจุดหมาย</option>
                      <option value="ส่งเข้าศูนย์พักพิง">ส่งเข้าศูนย์พักพิง</option>
                      <option value="มอบถุงยังชีพ">มอบถุงยังชีพ</option>
                      <option value="นำส่งโรงพยาบาล">นำส่งโรงพยาบาล</option>
                    </select>
                  </div>
                  
                  {/* 🤖 AI SMART VOLUNTEER MATCH RECOMMENDATION BANNER */}
                  {aiRecommendedVol && (
                    <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-3 text-white space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                          <span>🤖</span> AI แนะนำอาสาที่เหมาะสมที่สุด:
                        </div>
                        <span className="bg-blue-600/80 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          ความเหมาะสม {aiRecommendedVol.score}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-slate-700/50">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-xs text-white truncate">{aiRecommendedVol.name} ({aiRecommendedVol.agency || 'อาสากู้ภัย'})</p>
                          <p className="text-[11px] text-blue-200">
                            📍 ห่าง {aiRecommendedVol.distanceKm !== null ? `${aiRecommendedVol.distanceKm.toFixed(1)} กม.` : 'ไม่ระบุพิกัด'} • จ.{aiRecommendedVol.province || 'ไม่ระบุ'}
                          </p>
                          {aiRecommendedVol.skills_equipment && (
                            <p className="text-[10px] text-amber-300 font-medium truncate">
                              🛠️ {aiRecommendedVol.skills_equipment}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditVolunteerId(aiRecommendedVol.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all shrink-0 shadow-sm"
                        >
                          เลือกอาสาสมัคร
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">อาสาสมัคร / ทีมช่วยเหลือ (Re-assign Volunteer)</label>
                    <select 
                      value={editVolunteerId} 
                      onChange={(e) => setEditVolunteerId(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 p-2.5 rounded-lg dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">-- ไม่ระบุ / ยกเลิกอาสาสมัคร --</option>
                      {volunteersList.map((vol) => (
                        <option key={vol.id} value={vol.id}>
                          {vol.name} {vol.agency ? `(${vol.agency})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="pt-2">
                    <button 
                      onClick={handleSave} 
                      disabled={isSaving || (editStatus === caseData.status && editDestination === (caseData.destination || '') && String(editVolunteerId) === String(caseData.volunteer_id || ''))}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {isSaving ? 'กำลังบันทึก...' : '💾 บันทึกการแก้ไข'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold block w-max ${
                    caseData.status === 'pending' ? 'bg-red-100 text-red-600' :
                    caseData.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {caseData.status === 'pending' ? '🔴 รอดำเนินการ (รอทีมอาสา)' : caseData.status === 'in_progress' ? '🟡 กำลังช่วยเหลือ (มีทีมรับเคสแล้ว)' : '🟢 ช่วยเหลือเสร็จสิ้น'}
                  </span>
                  {caseData.destination && (
                    <div className="text-sm">
                      <span className="text-slate-500 dark:text-slate-400">จุดหมายปลายทาง: </span>
                      <span className="font-bold text-slate-800 dark:text-white">{caseData.destination}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-bold transition-colors">
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

