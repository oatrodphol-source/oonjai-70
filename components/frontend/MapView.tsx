'use client';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import HeatmapLayer from './HeatmapLayer';
import { Button } from '@/components/ui/Button';
import { Layers, MapPin, Crosshair, ShieldCheck, X } from 'lucide-react';
import { getSeveritySolidColor } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { RiskLegend } from '@/components/shared/RiskLegend';

// Helper function for AI Triage colors
const getTriageColor = (severity: any) => {
  const level = String(severity || '');
  if (level.includes('5')) return 'bg-red-600';
  if (level.includes('4')) return 'bg-orange-500';
  if (level.includes('3')) return 'bg-yellow-500';
  if (level.includes('2')) return 'bg-blue-500';
  return 'bg-green-500'; // Default Level 1
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

interface CasePoint {
  id: number;
  case_number?: string;
  type: string;
  latitude: number;
  longitude: number;
  severity: number;
  level?: number | string;
  status?: 'pending' | 'in_progress' | 'resolved' | 'cancelled';
}

import GoogleMapControls from '@/components/shared/GoogleMapControls';

interface MapViewProps {
  onMarkerClick?: (caseData: any) => void;
}

export default function MapView({ onMarkerClick }: MapViewProps = {}) {
  const position: [number, number] = [13.7563, 100.5018]; // BKK Default
  const [cases, setCases] = useState<CasePoint[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [icons, setIcons] = useState<{ red: any, yellow: any } | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);

  const [showSafeModal, setShowSafeModal] = useState(false);
  const [safePhone, setSafePhone] = useState('');
  const [safeArea, setSafeArea] = useState('');
  const [isSubmittingSafe, setIsSubmittingSafe] = useState(false);

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
    // Fix leaflet icon issue in Next.js by initializing only on the client
    if (typeof window !== 'undefined') {
      const createIcon = (colorUrl: string) => new L.Icon({
        iconUrl: colorUrl,
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      // Use rawgit cdn for leaflet color markers
      const redIcon = createIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png');
      const yellowIcon = createIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png');
      
      setIcons({ red: redIcon, yellow: yellowIcon });
    }
  }, []);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const { data, error } = await supabase.from('cases').select('*');
        if (error) throw error;
        
        const activeCases: CasePoint[] = [];
        (data || []).forEach(docData => {
          if ((docData.status === 'pending' || docData.status === 'in_progress') && docData.latitude && docData.longitude) {
            activeCases.push({
              id: docData.id,
              case_number: docData.case_number,
              type: docData.type || 'ไม่ระบุ',
              latitude: docData.latitude,
              longitude: docData.longitude,
              severity: docData.severity || 1,
              status: docData.status
            });
          }
        });
        setCases(activeCases);
        
        // Auto-center map based on cases bounds
        if (mapInstance && mapInstance.getContainer && mapInstance.getContainer()) {
          if (activeCases.length > 0) {
            try {
              const bounds = L.latLngBounds(activeCases.map(c => [c.latitude, c.longitude]));
              if (bounds.isValid()) {
                mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
              }
            } catch (e) {
              console.warn('Error auto-centering map:', e);
            }
          } else {
            try {
              mapInstance.flyTo([13.7563, 100.5018], 10);
            } catch (e) {
              console.warn('Error default flyTo map:', e);
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ ข้ามการโหลดแผนที่ (ดึงข้อมูลไม่สำเร็จ):', err);
      }
    };

    fetchCases();

    const channel = supabase
      .channel('custom-map-cases')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        (payload) => {
          setCases((prevCases) => {
            if (payload.eventType === 'INSERT') {
              const newCase = payload.new;
              if ((newCase.status === 'pending' || newCase.status === 'in_progress') && newCase.latitude && newCase.longitude) {
                return [...prevCases, {
                  id: newCase.id,
                  case_number: newCase.case_number,
                  type: newCase.type || 'ไม่ระบุ',
                  latitude: newCase.latitude,
                  longitude: newCase.longitude,
                  severity: newCase.severity || 1,
                  status: newCase.status
                }];
              }
              return prevCases;
            } else if (payload.eventType === 'UPDATE') {
              const updatedCase = payload.new;
              if (updatedCase.status !== 'pending' && updatedCase.status !== 'in_progress' || !updatedCase.latitude || !updatedCase.longitude) {
                return prevCases.filter(c => c.id !== updatedCase.id);
              }
              const exists = prevCases.find(c => c.id === updatedCase.id);
              if (exists) {
                return prevCases.map(c => c.id === updatedCase.id ? {
                  id: updatedCase.id,
                  case_number: updatedCase.case_number,
                  type: updatedCase.type || 'ไม่ระบุ',
                  latitude: updatedCase.latitude,
                  longitude: updatedCase.longitude,
                  severity: updatedCase.severity || 1,
                  status: updatedCase.status
                } : c);
              } else {
                return [...prevCases, {
                  id: updatedCase.id,
                  case_number: updatedCase.case_number,
                  type: updatedCase.type || 'ไม่ระบุ',
                  latitude: updatedCase.latitude,
                  longitude: updatedCase.longitude,
                  severity: updatedCase.severity || 1,
                  status: updatedCase.status
                }];
              }
            } else if (payload.eventType === 'DELETE') {
              return prevCases.filter(c => c.id !== payload.old.id);
            }
            return prevCases;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mapInstance]);

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapInstance) {
            try {
              if (mapInstance.getContainer()) {
                mapInstance.flyTo([latitude, longitude], 16, { animate: true, duration: 1.5 });
              }
            } catch (error) {
              console.warn("Map instance was stale, skipping flyTo animation.", error);
            }
          }
          setMyLocation([latitude, longitude]);
        },
        (error) => {
          console.error("GPS Error:", error);
          alert("ไม่สามารถดึงตำแหน่งของคุณได้ กรุณาเปิดสิทธิ์เข้าถึง GPS บนเบราว์เซอร์");
        }
      );
    } else {
      alert('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง (GPS)');
    }
  };

  const handleSafeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    setIsSubmittingSafe(true);
    try {
      const myCases = JSON.parse(localStorage.getItem('oonjai_my_cases') || '[]');
      const lastSos = localStorage.getItem('oonjai_last_sos');
      const lastReport = localStorage.getItem('oonjai_last_report');
      
      const localCases: any[] = Array.isArray(myCases) ? [...myCases] : [];
      if (lastSos) {
        try { const parsed = JSON.parse(lastSos); if (parsed.caseId) localCases.push(parsed.caseId); } catch(e){}
      }
      if (lastReport) {
        try { const parsed = JSON.parse(lastReport); if (parsed.caseId) localCases.push(parsed.caseId); } catch(e){}
      }
      
      const ids = localCases.map((id: any) => {
        if (typeof id === 'string' && id.startsWith('CAS-')) {
          return Number(id.replace('CAS-', ''));
        }
        return Number(id);
      }).filter((id: number) => !isNaN(id));

      // 1. Record the safe report with clean fields
      const phoneText = safePhone.trim() ? safePhone.trim() : 'ไม่ระบุเบอร์';
      const areaText = safeArea.trim() ? safeArea.trim() : 'พื้นที่ปลอดภัย';
      const caseText = ids.length > 0 ? `[ปิดเคส #${ids.join(', #')}]` : '';

      const { error: safeError } = await supabase.from('safe_reports').insert({
        name: `ผู้ประสบภัย (${phoneText}) ${caseText}`.trim(),
        phone: safePhone.trim() || null,
        area: safeArea.trim() || null,
        destination: areaText,
        agency: 'แจ้งด้วยตนเอง',
        status: 'safe',
        timestamp: new Date().toISOString()
      });

      if (safeError) console.warn('safe_reports insert notice:', safeError);

      // Step A: Close by BOTH ID AND Case Number
      if (ids.length > 0) {
        const updatePayload = {
          status: 'resolved', 
          destination: 'แจ้งปลอดภัยด้วยตนเอง',
          updated_at: new Date().toISOString(),
          volunteer_id: 'self-reported',
          volunteer_name: 'แจ้งด้วยตนเอง',
          assigned_volunteer_name: 'แจ้งด้วยตนเอง'
        };

        await supabase.from('cases').update(updatePayload).in('id', ids);
        await supabase.from('cases').update(updatePayload).in('case_number', ids);
      }

      // Step B: Close by Phone
      if (safePhone && typeof safePhone === 'string' && safePhone.trim() !== '') {
        await supabase.from('cases').update({
          status: 'resolved',
          destination: 'แจ้งปลอดภัยด้วยตนเอง',
          updated_at: new Date().toISOString(),
          volunteer_id: 'self-reported',
          volunteer_name: 'แจ้งด้วยตนเอง',
          assigned_volunteer_name: 'แจ้งด้วยตนเอง'
        })
        .eq('phone', safePhone.trim())
        .not('status', 'in', '("resolved","cancelled")');
      }

      alert('บันทึกข้อมูลสำเร็จ! ระบบได้ทำการอัปเดตสถานะการขอความช่วยเหลือของคุณเรียบร้อยแล้ว');
      setShowSafeModal(false);
      setSafePhone('');
      setSafeArea('');
    } catch (error) {
      console.error('Error adding safe report:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmittingSafe(false);
    }
  };

  const heatmapPoints: [number, number, number][] = cases.map(c => [c.latitude, c.longitude, c.severity]);

  return (
    <div className="flex-1 w-full relative z-0 h-full min-h-[50vh] md:min-h-[400px]">
      
      {/* Collapsible Risk Level Legend Overlay */}
      <RiskLegend className="bottom-6 left-4" label="ระดับความเสี่ยง" />


      <MapContainer 
        center={position} 
        zoom={13} 
        zoomControl={false}
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        ref={setMapInstance}
      >
        <GoogleMapControls 
          searchTopClass="top-16 sm:top-20" 
          controlsBottomClass="bottom-20 sm:bottom-24"
          leftControls={
            <button 
              type="button"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`backdrop-blur-md flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl font-bold transition-all duration-200 active:scale-95 shadow-lg border text-xs ${
                showHeatmap 
                  ? 'bg-orange-500 text-white border-orange-400' 
                  : 'bg-white/95 text-slate-700 border-slate-200 dark:bg-slate-900/95 dark:text-slate-200 dark:border-slate-800'
              }`}
            >
              {showHeatmap ? <MapPin className="w-4 h-4 text-white" /> : <Layers className="w-4 h-4 text-orange-500" />}
              <span className="font-bold">{showHeatmap ? 'ดูแบบหมุด' : 'ดูพื้นที่เสี่ยง'}</span>
            </button>
          }
          extraControls={
            <button 
              type="button"
              onClick={() => setShowSafeModal(true)}
              className="bg-[#00B900] text-white shadow-lg shadow-green-500/30 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-full font-bold transition-all duration-200 active:scale-95 border-2 border-green-500 text-xs"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="font-bold">ฉันปลอดภัยดี</span>
            </button>
          }
        />
        
        {(() => {
          if (showHeatmap || !icons) return null;

          const clusters: { base: CasePoint, group: CasePoint[] }[] = [];
          const processedIds = new Set();

          cases.forEach(c => {
            if (processedIds.has(c.id)) return;
            const group = [c];
            processedIds.add(c.id);

            cases.forEach(other => {
              if (!processedIds.has(other.id) && getDistanceKm(c.latitude, c.longitude, other.latitude, other.longitude) <= 0.5) {
                group.push(other);
                processedIds.add(other.id);
              }
            });
            clusters.push({ base: c, group });
          });

          return clusters.map((cluster, idx) => {
            const c = cluster.base;



            if (cluster.group.length > 1) {
              const maxSeverity = Math.max(...cluster.group.map(c => {
                const match = String(c.severity || c.level || 1).match(/\d+/);
                return match ? parseInt(match[0], 10) : 1;
              }));
              const clusterColor = getTriageColor(maxSeverity);
              const countIcon = L.divIcon({
                html: `<div class="${clusterColor} text-white font-bold rounded-full w-10 h-10 flex items-center justify-center border-2 border-white shadow-lg animate-bounce">${cluster.group.length}</div>`,
                className: 'custom-cluster',
                iconSize: [40, 40]
              });
              return (
                <Marker 
                  key={`cluster-${idx}`} 
                  position={[c.latitude, c.longitude]} 
                  icon={countIcon}
                  eventHandlers={{
                    click: () => {
                      if (onMarkerClick) onMarkerClick(c);
                    }
                  }}
                >
                  <Popup>
                    <div className="font-sans">
                      <div className={`text-center ${clusterColor.replace('bg-', 'text-')} font-bold mb-2`}>🚨 มี {cluster.group.length} เคสในรัศมี 500 เมตร</div>
                      <div className="text-xs text-gray-600">
                        <span className="font-bold">รหัส: </span> 
                        {cluster.group.map(g => g.case_number ? `CAS-${g.case_number}` : (g.id ? `CAS-${String(g.id).substring(0,6)}` : 'ไม่ระบุ')).join(', ')}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            }

            const markerColorClass = getTriageColor(c.severity || (c as any).level || 1);
            const singleIcon = L.divIcon({
              html: `<div class="${markerColorClass} w-6 h-6 rounded-full border-2 border-white shadow-md animate-pulse"></div>`,
              className: 'custom-marker',
              iconSize: [24, 24]
            });

            return (
              <Marker 
                key={c.id} 
                position={[c.latitude, c.longitude]} 
                icon={singleIcon}
                eventHandlers={{
                  click: () => {
                    if (onMarkerClick) onMarkerClick(c);
                  }
                }}
              >
                <Popup>
                  <div className="font-sans">
                    <p className="font-bold mb-1">รหัสเคส: CAS-{c.case_number || String(c.id).substring(0,6)}</p>
                    <p className="text-sm">ประเภท: {c.type}</p>
                    <p className="text-sm">ความรุนแรง: {getSeverityText(c.severity)}</p>
                  </div>
                </Popup>
              </Marker>
            );
          });
        })()}

        {showHeatmap && heatmapPoints.length > 0 && (
          <HeatmapLayer points={heatmapPoints} />
        )}

        {myLocation && (
          <Marker 
            key={`loc-${myLocation[0]}-${myLocation[1]}`}
            position={myLocation}
            icon={L.divIcon({ html: '<div class="bg-blue-500 w-4 h-4 rounded-full border-2 border-white shadow-md animate-pulse"></div>', className: '', iconSize: [16, 16] })}
          >
            <Popup>
              <div className="font-sans font-bold text-[#3b82f6]">
                ตำแหน่งของคุณ
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Safe Modal */}
      {showSafeModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0b1325] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 scale-100 animate-in zoom-in-95 duration-300 relative">
            <button 
              onClick={() => setShowSafeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-[#00B900] rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 text-center">ฉันปลอดภัยดี</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
              รายงานตัวว่าปลอดภัย เพื่อลดความกังวลของเจ้าหน้าที่
            </p>
            <form onSubmit={handleSafeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">เบอร์ติดต่อ (10 หลัก)</label>
                <input 
                  type="tel" 
                  maxLength={10}
                  value={safePhone}
                  onChange={(e) => setSafePhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-[#00B900] focus:ring-1 focus:ring-[#00B900] outline-none transition-all"
                  placeholder="0812345678"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">พื้นที่ปัจจุบัน</label>
                <input 
                  type="text" 
                  value={safeArea}
                  onChange={(e) => setSafeArea(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-[#00B900] focus:ring-1 focus:ring-[#00B900] outline-none transition-all"
                  placeholder="เช่น ศูนย์อพยพวัดพระธรรมกาย หรือ บ้านญาติ"
                />
              </div>
              <button 
                type="submit" 
                disabled={isSubmittingSafe}
                className={`w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-lg shadow-green-500/30 transition-all ${isSubmittingSafe ? 'bg-gray-400 opacity-70 cursor-not-allowed' : 'bg-[#00B900] hover:bg-[#009900]'}`}
              >
                {isSubmittingSafe ? 'กำลังบันทึก...' : 'บันทึกสถานะ'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
