'use client';
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getSeverityBadgeStyle } from '@/lib/utils';
import { Navigation, MapPin, Flame, X } from 'lucide-react';
import GoogleMapControls from '@/components/shared/GoogleMapControls';
import { supabase } from '@/lib/supabase';
import 'leaflet.heat';

const getHexColor = (severity: any) => {
  const level = String(severity || '');
  if (level.includes('5')) return '#ef4444';
  if (level.includes('4')) return '#f97316';
  if (level.includes('3')) return '#eab308';
  if (level.includes('2')) return '#3b82f6';
  return '#22c55e'; // Default Level 1
};

interface HeatmapMapProps {
  cases: any[];
}

import ReactDOM from 'react-dom';

const SmartInsightsControl = ({ cases }: { cases: any[] }) => {
  const map = useMap();
  const [isOpen, setIsOpen] = useState(false);

  const hotzones = React.useMemo(() => {
    const activeCases = cases.filter(c => c.status !== 'resolved' && c.status !== 'completed' && c.status !== 'cancelled');
    const zones: Record<string, { lat: number, lng: number, count: number, severitySum: number }> = {};
    activeCases.forEach(c => {
      if (!c.latitude || !c.longitude) return;
      const key = `${c.latitude.toFixed(2)},${c.longitude.toFixed(2)}`;
      if (!zones[key]) {
        zones[key] = { lat: c.latitude, lng: c.longitude, count: 0, severitySum: 0 };
      }
      zones[key].count += 1;
      zones[key].severitySum += (c.severity || 1);
    });
    return Object.values(zones)
      .sort((a, b) => (b.count * b.severitySum) - (a.count * a.severitySum))
      .slice(0, 3);
  }, [cases]);

  if (hotzones.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-2xl shadow-lg border border-red-500 text-xs font-bold hover:opacity-95 transition-all active:scale-95 group"
        title="ดูพื้นที่วิกฤตสูงสุด"
      >
        <Flame className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
        <span className="font-bold whitespace-nowrap">จุดวิกฤต ({hotzones.length})</span>
      </button>

      {/* Hotspots Bottom Sheet Modal Portal */}
      {isOpen && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10005] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto">
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
          <div className="bg-white dark:bg-[#111c35] w-full max-w-md rounded-t-3xl p-5 shadow-2xl border-t border-red-200 dark:border-red-900/50 z-[10006] animate-in slide-in-from-bottom duration-300 max-h-[75vh] overflow-y-auto relative">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
            
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <span>🔥</span> พื้นที่วิกฤตที่มีผู้รอช่วยเหลือสูงสุด ({hotzones.length} จุด)
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {hotzones.map((zone, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    map.flyTo([zone.lat, zone.lng], 15);
                    setIsOpen(false);
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl bg-red-50/90 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/40 cursor-pointer transition-colors"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-xs font-bold text-red-700 dark:text-red-300">จุดวิกฤตที่ {idx + 1}</span>
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">รอช่วยเหลือ {zone.count} เคส</span>
                  </div>
                  <span className="px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shrink-0 flex items-center gap-1">
                    📍 นำทาง
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

const HeatLayer = ({ points }: { points: any[] }) => {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const heat = (L as any).heatLayer(points, { radius: 25, blur: 15, maxZoom: 17 }).addTo(map);
      return () => {
        map.removeLayer(heat);
      };
    }
  }, [map, points]);
  return null;
};

export default function HeatmapMap({ cases }: HeatmapMapProps) {
  const position: [number, number] = [13.7563, 100.5018]; // BKK Default

  const [realHeatPoints, setRealHeatPoints] = useState<any[]>([]);

  useEffect(() => {
    const fetchPoints = async () => {
      const { data } = await supabase.from('cases').select('*');
      if (data) {
        const points = data.filter((d: any) => d.latitude && d.longitude);
        const formattedPoints = points.map((p: any) => [
          parseFloat(p.latitude), 
          parseFloat(p.longitude), 
          p.severity ? parseInt(p.severity) * 0.2 : 0.5
        ]);
        setRealHeatPoints(formattedPoints);
      }
    };

    fetchPoints();

    const channel = supabase
      .channel('heatmap-cases-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => {
        fetchPoints();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getMarkerStyle = (severity: number) => {
    const hex = getHexColor(severity);
    switch (severity) {
      case 5: return { color: hex, fillColor: hex, radius: 12, className: 'animate-pulse' };
      case 4: return { color: hex, fillColor: hex, radius: 10 };
      case 3: return { color: hex, fillColor: hex, radius: 8 };
      case 2: return { color: hex, fillColor: hex, radius: 7 };
      case 1: default: return { color: hex, fillColor: hex, radius: 6 };
    }
  };

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={position} 
        zoom={12} 
        zoomControl={false}
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <GoogleMapControls 
          searchTopClass="top-3 sm:top-4" 
          controlsBottomClass="bottom-20 sm:bottom-24"
          leftControls={<SmartInsightsControl cases={cases} />}
        />
        <HeatLayer points={realHeatPoints} />
        {cases.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.latitude, c.longitude]}
            {...getMarkerStyle(c.severity)}
            fillOpacity={0.8}
            weight={2}
          >
            <Popup className="rounded-2xl custom-popup">
              <div className="p-3 min-w-[260px] sm:min-w-[280px] text-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-amber-400">{c.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${c.isActive ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
                      {c.isActive ? '🔴 รอกู้ภัย' : '✅ เสร็จสิ้น'}
                    </span>
                  </div>

                  <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border shadow-sm ${
                    c.severity === 5 ? 'bg-red-600 text-white border-red-500' :
                    c.severity === 4 ? 'bg-orange-600 text-white border-orange-500' :
                    c.severity === 3 ? 'bg-yellow-500 text-slate-950 border-yellow-400 font-black' :
                    c.severity === 2 ? 'bg-blue-600 text-white border-blue-400' : 'bg-emerald-600 text-white border-emerald-400'
                  }`}>
                    {c.severity === 5 ? '🔴 วิกฤต (5)' :
                     c.severity === 4 ? '🟠 รุนแรง (4)' :
                     c.severity === 3 ? '🟡 ปานกลาง (3)' :
                     c.severity === 2 ? '🔵 เฝ้าระวัง (2)' : '🟢 ปลอดภัย (1)'}
                  </span>
                </div>
                
                {/* Body Details */}
                <div className="space-y-1.5 text-xs mb-3">
                  <div className="flex items-center justify-between text-slate-200">
                    <span className="font-bold text-slate-400">👤 ผู้แจ้ง:</span>
                    <span className="font-bold">{c.name || 'ผู้แจ้งเหตุ'}</span>
                  </div>

                  {c.phone && c.phone !== '-' && (
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-400">📞 โทรติดต่อ:</span>
                      <a href={`tel:${c.phone}`} className="font-black text-emerald-400 underline hover:text-emerald-300">
                        {c.phone}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-400">👥 จำนวนผู้ประสบภัย:</span>
                    <span className="font-bold text-white bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md">
                      {c.peopleCount || 1} คน
                    </span>
                  </div>

                  {(c.bedridden || c.elderly) && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="font-bold text-purple-300 bg-purple-950/80 border border-purple-800 px-2.5 py-1 rounded-xl text-[11px] w-full text-center shadow-inner">
                        ⚠️ {c.bedridden ? 'ผู้ป่วยติดเตียง' : ''} {c.elderly ? 'ผู้สูงอายุ/เด็ก' : ''}
                      </span>
                    </div>
                  )}

                  {c.water_level && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-bold text-slate-400">🌊 ระดับน้ำ:</span>
                      <span className="font-bold text-blue-300">{c.water_level}</span>
                    </div>
                  )}

                  <div className="mt-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-slate-200">
                    <span className="font-bold text-slate-400 block text-[10px] mb-0.5">📝 รายละเอียดเพิ่มเติม:</span>
                    <p className="text-[11px] leading-relaxed line-clamp-3 font-medium">
                      {c.details || 'ไม่มีรายละเอียดเพิ่มเติม'}
                    </p>
                  </div>
                </div>

                {/* Google Maps Direct Rescuer Navigation Button */}
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl shadow-lg transition-all active:scale-95 border border-emerald-500"
                >
                  <Navigation className="w-4 h-4 shrink-0 text-white" />
                  <span>📍 นำทางทีมกู้ภัย (Google Maps)</span>
                </a>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
