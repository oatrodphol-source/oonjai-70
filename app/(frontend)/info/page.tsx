'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Phone, CheckCircle2, Clock, MapPin, Building2, ShieldPlus, Package } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function InfoPage() {
  const [stats, setStats] = useState<{
    pendingCount: number;
    completedCount: number;
    shelterCount: number;
    hospitalCount: number;
  }>({
    pendingCount: 0,
    completedCount: 0,
    shelterCount: 0,
    hospitalCount: 0,
  });
  
  const [evacuees, setEvacuees] = useState<any[]>([]);
  const [safePersons, setSafePersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const completedStatuses = ["ส่งเข้าศูนย์พักพิง", "ส่งเข้าศูนย์พักพิงสำเร็จ", "นำส่งโรงพยาบาล", "นำส่งโรงพยาบาลแล้ว", "มอบถุงยังชีพ", "มอบถุงยังชีพเสร็จสิ้น", "ปลอดภัยแล้ว"];
  
  const resolvedCases = evacuees.filter(c => {
      // 1. Check if status string implies completion
      const currentStatus = c.status || "";
      const hasCompletedStatus = completedStatuses.some(s => currentStatus.includes(s));
      
      // 2. MUST have an assigned volunteer (Reject ghost cases)
      const hasVolunteer = Boolean(c.volunteer_id); 
      
      return hasCompletedStatus && hasVolunteer;
  });

  const filteredEvacuees = resolvedCases.filter((c) => {
    if (activeTab === 'โรงพยาบาล' && c.status !== 'นำส่งโรงพยาบาลแล้ว') return false;
    if (activeTab === 'ศูนย์พักพิง' && c.status !== 'ส่งเข้าศูนย์พักพิงสำเร็จ') return false;
    if (activeTab === 'ถุงยังชีพ' && c.status !== 'มอบถุงยังชีพเสร็จสิ้น') return false;

    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      const matchName = c.name.toLowerCase().includes(searchLower);
      const matchId = String(c.id).toLowerCase().includes(searchLower);
      if (!matchName && !matchId) return false;
    }
    return true;
  });

  useEffect(() => {
    const q = query(collection(db, 'safe_reports'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const persons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSafePersons(persons);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cases'), (snapshot) => {
      let pendingCount = 0;
      let completedCount = 0;
      let shelterCount = 0;
      let hospitalCount = 0;
      
      const evacueesList: any[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        const status = data.status || '';

        // waiting
        if (['รอการช่วยเหลือ', 'กำลังเข้าช่วยเหลือ', 'รอดำเนินการ', 'wait', 'pending', 'in_progress'].includes(status)) {
          pendingCount++;
        } 
        
        // success
        if (['ปลอดภัยแล้ว', 'ส่งเข้าศูนย์พักพิงสำเร็จ', 'มอบถุงยังชีพเสร็จสิ้น', 'นำส่งโรงพยาบาลแล้ว', 'completed', 'เสร็จสิ้น'].includes(status)) {
          completedCount++;
        }

        // evacuation and hospital board
        if (['ส่งเข้าศูนย์พักพิงสำเร็จ', 'นำส่งโรงพยาบาลแล้ว', 'มอบถุงยังชีพเสร็จสิ้น', 'ปลอดภัยแล้ว'].includes(status)) {
          if (status === 'ส่งเข้าศูนย์พักพิงสำเร็จ') shelterCount++;
          if (status === 'นำส่งโรงพยาบาลแล้ว') hospitalCount++;
          
          let displayName = data.reporter_name || data.name || data.contactName || "ผู้ประสบภัย";
          const referenceId = data.case_number ? `CAS-${String(data.case_number).padStart(3, '0')}` : `CAS-${doc.id.substring(0, 5)}`;
          
          if (displayName.includes("SOS User") || displayName === "ผู้ประสบภัย" || (!data.reporter_name && !data.name && !data.contactName)) {
              const phone = data.phone || "";
              if (phone.length >= 4) {
                  displayName = `ผู้ประสบภัย (เบอร์: 0XX-XXX-${phone.slice(-4)})`;
              } else {
                  displayName = `ผู้ประสบภัย (รหัส: ${referenceId})`;
              }
          }

          evacueesList.push({
            id: referenceId,
            name: displayName,
            status: status,
            volunteer_id: data.volunteer_id || data.assigned_volunteer_name || data.rescuer_name || data.assigned_to || null,
            timestamp: data.updated_at ? new Date(data.updated_at).getTime() : (data.createdAt ? new Date(data.createdAt).getTime() : Date.now()),
          });
        }
      });

      evacueesList.sort((a, b) => b.timestamp - a.timestamp);

      setStats({
        pendingCount,
        completedCount,
        shelterCount,
        hospitalCount
      });
      setEvacuees(evacueesList);
      setLoading(false);
    }, (err) => {
      console.error('Failed to fetch stats:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const emergencyNumbers = [
    { name: 'เจ็บป่วยฉุกเฉิน', number: '1669', color: 'bg-red-100 text-red-600 dark:bg-red-900/30' },
    { name: 'ปภ. (บรรเทาสาธารณภัย)', number: '1784', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' },
    { name: 'กฟภ. (แจ้งไฟฟ้าขัดข้อง)', number: '1129', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' },
    { name: 'เหตุด่วนเหตุร้าย', number: '191', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' },
    { name: 'ตำรวจทางหลวง', number: '1193', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30' },
    { name: 'กรมทางหลวงชนบท', number: '1146', color: 'bg-green-100 text-green-600 dark:bg-green-900/30' },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden px-4 pb-32 pt-24 sm:px-6 mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">ภาพรวมสถานการณ์</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ข้อมูลแบบเรียลไทม์จากศูนย์อุ่นใจ</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
        <div className="w-full min-w-0 h-full bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 p-3 sm:p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm overflow-hidden min-h-[100px] sm:min-h-[120px]">
          <Clock className="w-8 h-8 text-orange-500 mb-2 hidden sm:block" />
          <h3 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-500">{stats.pendingCount}</h3>
          <p className="whitespace-normal break-words text-center text-xs sm:text-sm w-full leading-tight font-semibold text-orange-800 dark:text-orange-400 mt-1">รอการช่วยเหลือ</p>
        </div>
        
        <div className="w-full min-w-0 h-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 p-3 sm:p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm overflow-hidden min-h-[100px] sm:min-h-[120px]">
          <CheckCircle2 className="w-8 h-8 text-green-500 mb-2 hidden sm:block" />
          <h3 className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-500">{stats.completedCount}</h3>
          <p className="whitespace-normal break-words text-center text-xs sm:text-sm w-full leading-tight font-semibold text-green-800 dark:text-green-400 mt-1">ช่วยเหลือสำเร็จ</p>
        </div>

        {/* Shelter */}
        <div className="w-full min-w-0 h-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-3 sm:p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm overflow-hidden min-h-[100px] sm:min-h-[120px]">
          <span className="text-3xl mb-1 hidden sm:block">🏠</span>
          <h3 className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-500">{stats.shelterCount}</h3>
          <p className="whitespace-normal break-words text-center text-xs sm:text-sm w-full leading-tight font-semibold text-blue-800 dark:text-blue-400 mt-1">ศูนย์พักพิง</p>
        </div>

        {/* Hospital */}
        <div className="w-full min-w-0 h-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 p-3 sm:p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm overflow-hidden min-h-[100px] sm:min-h-[120px]">
          <span className="text-3xl mb-1 hidden sm:block">🏥</span>
          <h3 className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-500">{stats.hospitalCount}</h3>
          <p className="whitespace-normal break-words text-center text-xs sm:text-sm w-full leading-tight font-semibold text-red-800 dark:text-red-400 mt-1">โรงพยาบาล/หน่วยแพทย์</p>
        </div>
      </div>

      {/* Evacuation & Hospitalization Board */}
      <div className="pt-2">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
          📋 รายชื่อผู้ได้รับการช่วยเหลือล่าสุด
        </h3>
        
        {/* Search & Filters */}
        <div className="mb-4">
          <input 
            type="text" 
            placeholder="🔍 ค้นหาชื่อ หรือ รหัสอ้างอิง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 rounded-2xl bg-white shadow-sm px-4 mb-3 text-sm focus:ring-2 focus:ring-[#ff6600] outline-none dark:bg-[#151b2c] dark:text-white dark:placeholder-gray-500 border border-gray-100 dark:border-gray-800"
          />
          <div className="relative w-full">
            <div className="flex flex-wrap gap-2 pb-2 w-full">
              {[
                { id: 'all', label: 'ทั้งหมด 📋' },
                { id: 'โรงพยาบาล', label: 'โรงพยาบาล 🏥' },
                { id: 'ศูนย์พักพิง', label: 'ศูนย์พักพิง 🏡' },
                { id: 'ถุงยังชีพ', label: 'รับถุงยังชีพ 📦' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                    activeTab === tab.id 
                      ? 'bg-gray-900 text-white shadow-md dark:bg-white dark:text-gray-900' 
                      : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm dark:bg-[#151b2c] dark:text-gray-400 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full max-w-full bg-white dark:bg-[#151b2c] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden max-h-[500px] overflow-y-auto">
          {filteredEvacuees.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredEvacuees.map((caseItem, idx) => (
                <li key={idx} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors bg-white dark:bg-[#151b2c]">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {caseItem.name || `ผู้ประสบภัย (ไม่ระบุชื่อ) - ${caseItem.id}`}
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(caseItem.timestamp).toLocaleString('th-TH', { 
                        dateStyle: 'short', 
                        timeStyle: 'short' 
                      })}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {caseItem.status === 'นำส่งโรงพยาบาลแล้ว' ? (
                      <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 text-[10px] sm:text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-full whitespace-nowrap">
                        <ShieldPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 🏥 โรงพยาบาล
                      </span>
                    ) : caseItem.status === 'มอบถุงยังชีพเสร็จสิ้น' ? (
                      <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-full whitespace-nowrap">
                        <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 📦 ถุงยังชีพ
                      </span>
                    ) : caseItem.status === 'ส่งเข้าศูนย์พักพิงสำเร็จ' ? (
                      <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-full whitespace-nowrap">
                        <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 🏡 ศูนย์พักพิง
                      </span>
                    ) : caseItem.status === 'ปลอดภัยแล้ว' ? (
                      <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-full whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> ✅ ปลอดภัยแล้ว
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
              <ShieldPlus className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
              <p>{searchTerm || activeTab !== 'all' ? '❌ ไม่พบรายชื่อผู้ได้รับการช่วยเหลือที่ตรงกับเงื่อนไข' : 'ยังไม่มีข้อมูลผู้ได้รับการช่วยเหลือ'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Safe Persons List */}
      {safePersons.length > 0 && (
        <div className="pt-2">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            🛡️ รายชื่อผู้ปลอดภัย (ภายนอก)
          </h3>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
            {safePersons.map(person => (
              <div key={person.id} className="p-4 bg-white dark:bg-[#151b2c] rounded-lg shadow-sm border border-green-100 dark:border-green-800/50 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{person.name || person.area}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ช่วยเหลือโดย: {person.agency || 'รายงานตนเอง'}</p>
                </div>
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-3 py-1 rounded-full font-bold">ปลอดภัย</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Numbers Grid */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">เบอร์โทรฉุกเฉิน</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {emergencyNumbers.map((item, index) => (
            <a 
              key={index}
              href={`tel:${item.number}`}
              className="flex items-center gap-3 p-4 bg-white dark:bg-[#151b2c] border border-gray-50 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md active:scale-95 active:bg-gray-50 dark:active:bg-gray-800 transition-all cursor-pointer"
            >
              <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{item.name}</p>
                <p className="font-black text-gray-900 dark:text-white">{item.number}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}
