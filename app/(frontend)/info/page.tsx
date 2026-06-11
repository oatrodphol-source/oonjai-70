'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Phone, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function InfoPage() {
  const [stats, setStats] = useState<{
    pendingCount: number;
    completedCount: number;
    shelterCount: number;
    hospitalCount: number;
    highRiskDistricts: { name: string; severityCount: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const getRiskLevelStyles = (count: number) => {
    if (count > 50) return { bg: 'bg-red-800', text: 'text-red-800', label: 'วิกฤต' };
    if (count >= 21) return { bg: 'bg-orange-500', text: 'text-orange-600', label: 'รุนแรง' };
    if (count >= 11) return { bg: 'bg-yellow-400', text: 'text-yellow-600', label: 'เฝ้าระวังสูง' };
    if (count >= 6) return { bg: 'bg-blue-500', text: 'text-blue-600', label: 'เฝ้าระวัง' };
    return { bg: 'bg-green-500', text: 'text-green-600', label: 'ปกติ' };
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cases'), (snapshot) => {
      let pendingCount = 0;
      let completedCount = 0;
      let shelterCount = 0;
      let hospitalCount = 0;
      
      const districtCounts: Record<string, number> = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Counts
        if (data.status === 'pending' || data.status === 'accepted' || data.status === 'in_progress') {
          pendingCount++;
        } else if (data.status === 'completed') {
          completedCount++;
        }

        if (data.help_type === 'shelter') {
          shelterCount++;
        } else if (data.help_type === 'hospital') {
          hospitalCount++;
        }

        // District Counts for high risk
        if (data.status !== 'completed' && data.status !== 'cancelled') {
           const rawLocation = data.district || data.location_name || data.address || data.details || '';
           let finalDistrict = 'ไม่ระบุพื้นที่';

           if (rawLocation) {
              // Try to find structural address keywords
              const addrMatch = rawLocation.match(/(เขต|อำเภอ|ตำบล|แขวง)\s*([^\s,()]+)/);
              
              if (addrMatch) {
                 finalDistrict = addrMatch[1] + addrMatch[2];
              } else {
                 // Fallback to first 20 characters of whatever location text we have
                 finalDistrict = rawLocation.length > 20 ? rawLocation.substring(0, 20) + '...' : rawLocation;
              }
           }
           
           if (!districtCounts[finalDistrict]) districtCounts[finalDistrict] = 0;
           districtCounts[finalDistrict] += 1;
        }
      });

      const highRiskDistricts = Object.entries(districtCounts)
        .map(([name, severityCount]) => ({ name, severityCount }))
        .sort((a, b) => b.severityCount - a.severityCount)
        .slice(0, 3);

      setStats({
        pendingCount,
        completedCount,
        shelterCount,
        hospitalCount,
        highRiskDistricts
      });
      setLoading(false);
    }, (err) => {
      console.error('Failed to fetch stats:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const emergencyNumbers = [
    { name: 'ปภ. (บรรเทาสาธารณภัย)', number: '1784', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' },
    { name: 'เจ็บป่วยฉุกเฉิน', number: '1669', color: 'bg-red-100 text-red-600 dark:bg-red-900/30' },
    { name: 'ตำรวจทางหลวง', number: '1193', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' },
    { name: 'กรมทางหลวงชนบท', number: '1146', color: 'bg-green-100 text-green-600 dark:bg-green-900/30' },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-4 sm:p-6 pb-32 max-w-2xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">ภาพรวมสถานการณ์</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ข้อมูลแบบเรียลไทม์จากศูนย์อุ่นใจ</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
          <Clock className="w-8 h-8 text-orange-500 mb-2" />
          <h3 className="text-3xl font-black text-orange-600 dark:text-orange-500">{stats?.pendingCount || 0}</h3>
          <p className="text-xs font-semibold text-orange-800 dark:text-orange-400 mt-1">รอการช่วยเหลือ</p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
          <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
          <h3 className="text-3xl font-black text-green-600 dark:text-green-500">{stats?.completedCount || 0}</h3>
          <p className="text-xs font-semibold text-green-800 dark:text-green-400 mt-1">ช่วยเหลือสำเร็จ</p>
        </div>

        {/* Shelter */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-3xl mb-1">🏠</span>
          <h3 className="text-2xl font-black text-blue-600 dark:text-blue-500">{stats?.shelterCount || 0}</h3>
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-400 mt-1">นำส่งศูนย์พักพิงสำเร็จ</p>
        </div>

        {/* Hospital */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-3xl mb-1">🏥</span>
          <h3 className="text-2xl font-black text-red-600 dark:text-red-500">{stats?.hospitalCount || 0}</h3>
          <p className="text-xs font-semibold text-red-800 dark:text-red-400 mt-1">นำส่งโรงพยาบาล/หน่วยแพทย์</p>
        </div>
      </div>

      {/* District Risk Levels */}
      <div className="bg-white dark:bg-[#151b2c] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-gray-900 dark:text-white">🔴 พื้นที่วิกฤต (High Risk)</h3>
        </div>
        
        <div className="space-y-4">
          {stats?.highRiskDistricts?.length ? stats.highRiskDistricts.map((district, index) => {
            const risk = getRiskLevelStyles(district.severityCount);
            const percentage = Math.min((district.severityCount / 50) * 100, 100);
            return (
              <div key={index} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{district.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-opacity-10 dark:bg-opacity-20 ${risk.text} bg-current`}>
                      {risk.label}
                    </span>
                    <span className={`${risk.text} font-bold`}>{district.severityCount} เคส</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                  <div className={`${risk.bg} h-full rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
            );
          }) : (
            <p className="text-sm text-gray-500">ไม่มีข้อมูลพื้นที่วิกฤต</p>
          )}
        </div>
      </div>

      {/* Emergency Numbers Grid */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">เบอร์โทรฉุกเฉิน</h3>
        <div className="grid grid-cols-2 gap-3">
          {emergencyNumbers.map((item, index) => (
            <a 
              key={index}
              href={`tel:${item.number}`}
              className="flex items-center gap-3 p-3 bg-white dark:bg-[#151b2c] border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow active:scale-95"
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
