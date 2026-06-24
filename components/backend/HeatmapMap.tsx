'use client';
import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getSeverityBadgeStyle } from '@/lib/utils';

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

export default function HeatmapMap({ cases }: HeatmapMapProps) {
  const position: [number, number] = [13.7563, 100.5018]; // BKK Default

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
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${getSeverityBadgeStyle(c.severity || 1)}`}>
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
