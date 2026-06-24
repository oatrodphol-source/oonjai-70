'use client';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layers, MapPin, Navigation } from 'lucide-react';
import { getSeveritySolidColor } from '@/lib/utils';

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
  type: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
  severity: number;
  status?: string;
  details?: string;
}

function HeatmapLayer({ points }: { points: [number, number, number][] }) {
    const map = useMap();
    
    useEffect(() => {
        if (typeof window === 'undefined' || !points || points.length === 0) return;
        
        // Dynamically import leaflet.heat to avoid SSR "window is not defined" issues
        require('leaflet.heat');
        
        // Filter out any invalid coordinates before passing to Leaflet
        const validPoints = points.filter(p => 
            p && 
            Array.isArray(p) && 
            p.length >= 2 && 
            p[0] !== null && 
            p[1] !== null && 
            !isNaN(p[0]) && 
            !isNaN(p[1])
        );

        if (validPoints.length === 0) return;

        // @ts-ignore - L.heatLayer is added by the plugin
        const heat = L.heatLayer(validPoints, {
            radius: 40,
            blur: 30,
            maxZoom: 17,
            gradient: { 0.4: '#2b83ba', 0.6: '#abdda4', 0.8: '#fdae61', 1.0: '#d7191c' }
        }).addTo(map);

        return () => {
            map.removeLayer(heat);
        };
    }, [map, points]);
    
    return null;
}

function CurrentLocationMarker() {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMapEvents({
    locationfound(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 15);
    },
  });

  if (!position) return null;

  const userLocationIcon = L.divIcon({
    className: 'bg-transparent border-0',
    html: `
      <div class="relative flex h-6 w-6 items-center justify-center">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-md"></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return (
    <Marker position={position} icon={userLocationIcon}>
      <Popup className="privacy-popup">
        <div className="font-sans font-bold text-center text-blue-700">📍 คุณอยู่ที่นี่</div>
      </Popup>
    </Marker>
  );
}

function LocateControl() {
  const map = useMap();
  
  const handleLocate = () => {
    map.locate();
  };

  return (
    <div className="absolute bottom-28 right-4 z-[1000] pointer-events-auto">
      <button 
        onClick={handleLocate}
        className="bg-white/90 dark:bg-[#0b1325]/90 backdrop-blur-md p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105 group"
        title="Locate Me"
      >
        <Navigation className="w-6 h-6 text-[#ff6600] group-hover:text-[#e55c00]" />
      </button>
    </div>
  );
}

const formatTimeAgo = (dateString?: string) => {
  if (!dateString) return 'ไม่ระบุ';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'ไม่ระบุ';
  
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'เมื่อสักครู่';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} นาทีที่แล้ว`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(seconds / 86400)} วันที่แล้ว`;
};



export default function MapView() {
  const position: [number, number] = [13.7563, 100.5018]; // BKK Default
  const [cases, setCases] = useState<CasePoint[]>([]);
  const [viewMode, setViewMode] = useState<'markers' | 'heatmap'>('markers');

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await fetch('/api/heatmap');
        const data = await res.json();
        console.log("Fetched cases:", data);
        if (Array.isArray(data)) {
          setCases(data);
        } else if (data && Array.isArray(data.data)) {
          setCases(data.data);
        } else {
          setCases([]);
        }
      } catch (error) {
        console.error('Error fetching map data:', error);
        setCases([]);
      }
    };
    
    // Initial fetch
    fetchCases();
    
    // Polling every 5 seconds
    const intervalId = setInterval(fetchCases, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const validCases = Array.isArray(cases) ? cases : [];
  
  const heatPoints: [number, number, number][] = validCases.map(c => [
    parseFloat(c.latitude as string), 
    parseFloat(c.longitude as string), 
    (c.severity || 1) / 5
  ]);
  console.log("Heatmap Data:", heatPoints);

  const getCustomMarkerIcon = (severity: number) => {
    const colorClass = getTriageColor(severity);
    const isPulsing = severity >= 5;

    const html = `
      <div class="relative flex h-6 w-6 items-center justify-center">
        ${isPulsing ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${colorClass.replace('bg-', 'bg-')} opacity-75"></span>` : ''}
        <span class="relative inline-flex rounded-full h-4 w-4 ${colorClass} border-2 border-white shadow-md"></span>
      </div>
    `;
    
    return L.divIcon({
      className: 'bg-transparent border-0',
      html,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  };

  return (
    <div className="h-full w-full absolute inset-0 z-0">
      <div className="absolute top-24 right-4 z-[1000] bg-white/90 dark:bg-[#0b1325]/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-1 pointer-events-auto">
        <button 
          onClick={() => setViewMode('markers')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${viewMode === 'markers' ? 'bg-[#ff6600] text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          <MapPin className="w-4 h-4" />
          ดูแบบหมุด (Markers)
        </button>
        <button 
          onClick={() => setViewMode('heatmap')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${viewMode === 'heatmap' ? 'bg-[#ff6600] text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          <Layers className="w-4 h-4" />
          ดูพื้นที่เสี่ยง (Heatmap)
        </button>
      </div>

      <MapContainer 
        center={position} 
        zoom={13} 
        scrollWheelZoom={true} 
        zoomControl={false}
        style={{ width: '100%', height: '100%', zIndex: 0 }}
      >
        <ZoomControl position="bottomleft" />
        <LocateControl />
        <CurrentLocationMarker />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {(() => {
          if (viewMode !== 'markers') return null;

          const clusters: { base: CasePoint, group: CasePoint[] }[] = [];
          const processedIds = new Set();

          validCases.forEach(c => {
            if (processedIds.has(c.id)) return;
            const group = [c];
            processedIds.add(c.id);

            const lat = parseFloat(c.latitude as string);
            const lng = parseFloat(c.longitude as string);
            if (isNaN(lat) || isNaN(lng)) return;

            validCases.forEach(other => {
              const isCompleted = ['เสร็จสิ้น', 'สำเร็จ', 'completed', 'ปลอดภัยแล้ว'].includes(other.status);
              if (processedIds.has(other.id) || isCompleted) return;
              
              const otherLat = parseFloat(other.latitude as string);
              const otherLng = parseFloat(other.longitude as string);
              if (isNaN(otherLat) || isNaN(otherLng)) return;

              if (getDistanceKm(lat, lng, otherLat, otherLng) <= 0.5) {
                group.push(other);
                processedIds.add(other.id);
              }
            });
            clusters.push({ base: c, group });
          });

          return clusters.map((cluster, idx) => {
            const c = cluster.base;
            const lat = parseFloat(c.latitude as string);
            const lng = parseFloat(c.longitude as string);
            
            if (cluster.group.length > 1) {
              const maxSeverity = Math.max(...cluster.group.map(c => {
                const match = String(c.severity || c.level || 1).match(/\d+/);
                return match ? parseInt(match[0], 10) : 1;
              }));
              const clusterColor = getSeveritySolidColor(maxSeverity);
              const countIcon = L.divIcon({
                html: `<div class="${clusterColor} text-white font-bold rounded-full w-10 h-10 flex items-center justify-center border-2 border-white shadow-lg animate-bounce">${cluster.group.length}</div>`,
                className: 'custom-cluster',
                iconSize: [40, 40]
              });
              return (
                <Marker key={`cluster-${idx}`} position={[lat, lng]} icon={countIcon}>
                  <Popup className="privacy-popup">
                    <div className="font-sans min-w-[200px]">
                      <div className={`text-center ${clusterColor.replace('bg-', 'text-')} font-bold mb-2`}>🚨 มี {cluster.group.length} เคสในรัศมี 500 เมตร</div>
                      <div className="text-xs text-gray-600">
                        พิกัดนี้มีการแจ้งเหตุซ้ำซ้อนหรือใกล้เคียงกันหลายรายการในระบบ โปรดตรวจสอบพื้นที่โดยรอบ
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            }

            const markerColorClass = getSeveritySolidColor(c.severity || (c as any).level || 1);
            const singleIcon = L.divIcon({
              html: `<div class="${markerColorClass} w-6 h-6 rounded-full border-2 border-white shadow-md animate-pulse"></div>`,
              className: 'custom-marker',
              iconSize: [24, 24]
            });

            return (
              <Marker 
                key={c.id} 
                position={[lat, lng]} 
                icon={singleIcon}
              >
                <Popup className="privacy-popup">
                  <div className="font-sans min-w-[200px]">
                    <p className="font-bold mb-2 text-[#b30000] border-b pb-1">
                      🚨 ขอความช่วยเหลือ (ระดับ {c.severity})
                    </p>
                    <p className="text-sm mb-1"><span className="font-semibold">ประเภท:</span> {c.type || 'ไม่ระบุ'}</p>
                    <p className="text-sm mb-1"><span className="font-semibold">สถานะ:</span> {c.status || 'รอดำเนินการ'}</p>
                  </div>
                </Popup>
              </Marker>
            );
          });
        })()}

        {viewMode === 'heatmap' && heatPoints.length > 0 && (
          <HeatmapLayer points={heatPoints} />
        )}
      </MapContainer>
    </div>
  );
}
