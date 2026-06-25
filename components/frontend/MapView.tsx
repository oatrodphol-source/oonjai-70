'use client';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import HeatmapLayer from './HeatmapLayer';
import { Button } from '@/components/ui/Button';
import { Layers, MapPin, Crosshair, ShieldCheck, X } from 'lucide-react';
import { getSeverityText } from '@/lib/ai-triage';
import { getSeveritySolidColor } from '@/lib/utils';
import { db } from '@/lib/firebase';

// Helper function for AI Triage colors
const getTriageColor = (severity: any) => {
  const level = String(severity || '');
  if (level.includes('5')) return 'bg-red-600';
  if (level.includes('4')) return 'bg-orange-500';
  if (level.includes('3')) return 'bg-yellow-500';
  if (level.includes('2')) return 'bg-blue-500';
  return 'bg-green-500'; // Default Level 1
};
import { collection, onSnapshot, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

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
  id: string | number;
  case_number?: string;
  type: string;
  latitude: number;
  longitude: number;
  severity: number;
  status?: string;
}

const MapSearchControl = () => {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchPin, setSearchPin] = useState<[number, number] | null>(null);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length > 2) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=th&limit=5`);
        const data = await res.json();
        setSuggestions(data);
      } catch(err){}
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    map.flyTo([lat, lon], 15);
    setSearchPin([lat, lon]);
    setQuery(item.display_name.split(',')[0]);
    setSuggestions([]);
  };

  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm drop-shadow-md pointer-events-auto">
        <div className="flex shadow-lg rounded-full overflow-hidden bg-white border border-slate-200">
          <input 
            type="text" 
            placeholder="ค้นหาสถานที่..." 
            value={query} 
            onChange={handleInputChange} 
            className="flex-1 px-4 py-3 outline-none text-sm text-slate-800" 
          />
        </div>
        {suggestions.length > 0 && (
          <ul className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100 max-h-48 overflow-y-auto">
            {suggestions.map((item, idx) => (
              <li key={idx} onClick={() => handleSelect(item)} className="px-4 py-3 text-sm border-b cursor-pointer hover:bg-slate-50 text-slate-700 truncate">
                {item.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {searchPin && (
        <Marker 
          key={`search-${searchPin[0]}-${searchPin[1]}`}
          position={searchPin}
          icon={L.divIcon({ html: '<div class="bg-red-500 w-5 h-5 rounded-full border-2 border-white shadow-md animate-bounce"></div>', className: '', iconSize: [20, 20] })}
        >
          <Popup>ตำแหน่งจากผลการค้นหา</Popup>
        </Marker>
      )}
    </>
  );
};

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
    const unsub = onSnapshot(collection(db, 'cases'), (snapshot) => {
      const activeCases: CasePoint[] = [];
      snapshot.forEach(document => {
        const data = document.data();
        if (data.status !== 'completed' && data.status !== 'cancelled' && data.status !== 'ปลอดภัยแล้ว' && data.latitude && data.longitude) {
          activeCases.push({
            id: document.id,
            case_number: data.case_number,
            type: data.type || 'ไม่ระบุ',
            latitude: data.latitude,
            longitude: data.longitude,
            severity: data.severity || 1,
            status: data.status
          });
        }
      });
      setCases(activeCases);
      
      // Auto-center map based on cases bounds
      if (mapInstance) {
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
          mapInstance.flyTo([13.7563, 100.5018], 10);
        }
      }
    }, (error) => {
      console.error('Error fetching map data:', error);
    });

    return () => unsub();
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
    if (!safePhone.trim() || !safeArea.trim()) return;
    
    setIsSubmittingSafe(true);
    try {
      const localCases = JSON.parse(localStorage.getItem('oonjai_my_cases') || '[]');
      
      const response = await fetch('/api/safe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: safePhone,
          area: safeArea,
          caseIds: localCases
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      // Removed: localStorage.removeItem('oonjai_my_cases'); to preserve history
      
      alert(data.message || 'บันทึกข้อมูลสำเร็จ! ระบบได้ทำการอัปเดตสถานะการขอความช่วยเหลือของคุณเรียบร้อยแล้ว');
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
      
      {/* GPS Locate Button */}
      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          <button 
            onClick={handleLocateMe}
            className="bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 flex items-center justify-center p-3 rounded-full transition-all duration-200 active:scale-95 dark:bg-[#0b1325]/95 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800/50"
          >
            <Crosshair className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-40 md:bottom-24 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          <button 
            onClick={() => setShowSafeModal(true)}
            className="bg-[#00B900] text-white shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 px-5 py-3 rounded-full font-bold transition-all duration-200 active:scale-95 border-2 border-green-500 w-full"
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="font-bold">ฉันปลอดภัยดี</span>
          </button>
        </div>
        
        <div className="pointer-events-auto">
          <button 
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`backdrop-blur-md flex items-center justify-center gap-2 px-5 py-3 rounded-full font-bold transition-all duration-200 active:scale-95 w-full ${
              showHeatmap 
                ? 'bg-orange-500 text-white shadow-lg border-2 border-orange-400' 
                : 'bg-white text-gray-700 border border-gray-200 shadow-sm dark:bg-[#0b1325]/95 dark:text-gray-300 dark:border-gray-800'
            }`}
          >
            {showHeatmap ? <MapPin className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            <span className="font-bold">{showHeatmap ? 'ดูแบบหมุด' : 'ดูพื้นที่เสี่ยง'}</span>
          </button>
        </div>
      </div>

      <MapContainer 
        center={position} 
        zoom={13} 
        zoomControl={false}
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        ref={setMapInstance}
      >
        <MapSearchControl />
        <ZoomControl position="bottomleft" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
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
                  required
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
                  required
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
