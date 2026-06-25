'use client';
import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
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

import { Crosshair } from 'lucide-react';

const LocateControl = () => {
  const map = useMap();
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);

  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.flyTo([position.coords.latitude, position.coords.longitude], 14);
          setMyLocation([position.coords.latitude, position.coords.longitude]);
        },
        () => alert('ไม่สามารถดึงตำแหน่งได้')
      );
    } else {
      alert('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง (GPS)');
    }
  };
  return (
    <>
      <div className="absolute bottom-6 right-4 z-[1000] pointer-events-auto">
        <button 
          onClick={handleLocate}
          className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all duration-200 active:scale-95"
        >
          <Crosshair className="w-6 h-6 text-gray-700" />
        </button>
      </div>
      {myLocation && (
        <Marker 
          key={`loc-${myLocation[0]}-${myLocation[1]}`}
          position={myLocation}
          icon={L.divIcon({ html: '<div class="bg-blue-500 w-4 h-4 rounded-full border-2 border-white shadow-md animate-pulse"></div>', className: '', iconSize: [16, 16] })}
        >
          <Popup>ตำแหน่งของคุณ</Popup>
        </Marker>
      )}
    </>
  );
};

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
        <MapSearchControl />
        <LocateControl />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
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
