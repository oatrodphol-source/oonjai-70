'use client';
import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface HeatmapMapProps {
  cases: any[];
}

export default function HeatmapMap({ cases }: HeatmapMapProps) {
  const position: [number, number] = [13.7563, 100.5018]; // BKK Default

  const getMarkerStyle = (severity: number) => {
    switch (severity) {
      case 5: return { color: '#DC2626', fillColor: '#DC2626', radius: 12, className: 'animate-pulse' };
      case 4: return { color: '#EA580C', fillColor: '#EA580C', radius: 10 };
      case 3: return { color: '#F97316', fillColor: '#F97316', radius: 8 };
      case 2: return { color: '#EAB308', fillColor: '#EAB308', radius: 7 };
      case 1: default: return { color: '#22C55E', fillColor: '#22C55E', radius: 6 };
    }
  };

  return (
    <div className="h-full w-full absolute inset-0 z-0">
      <MapContainer 
        center={position} 
        zoom={12} 
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {cases.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.latitude, c.longitude]}
            {...getMarkerStyle(c.severity)}
            fillOpacity={0.7}
            weight={2}
          >
            <Popup className="rounded-xl">
              <div className="p-1">
                <div className="flex items-center justify-between gap-3 border-b pb-2 mb-2">
                  <span className="font-bold text-gray-900">{c.id}</span>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full text-white ${
                    c.severity === 5 ? 'bg-red-500' :
                    c.severity === 4 ? 'bg-orange-600' :
                    c.severity === 3 ? 'bg-orange-500' :
                    c.severity === 2 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}>
                    {c.severity === 5 ? 'วิกฤต (ระดับ 5)' :
                     c.severity === 4 ? 'รุนแรง (ระดับ 4)' :
                     c.severity === 3 ? 'ปานกลาง (ระดับ 3)' :
                     c.severity === 2 ? 'เฝ้าระวัง (ระดับ 2)' : 'ทั่วไป (ระดับ 1)'}
                  </span>
                </div>
                <p className="font-bold text-sm text-gray-800 mb-1">{c.type === 'sos' ? 'SOS ฉุกเฉิน' : c.type}</p>
                <p className="text-xs text-gray-600 line-clamp-2">{c.details || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                <p className="text-[10px] text-gray-400 mt-2">
                  {new Date(c.timestamp).toLocaleString('th-TH')}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
