'use client';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface DraggableMapProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

// Fix leaflet icon issue in Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapSearchControl = ({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) => {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

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
    map.flyTo([lat, lon], 16);
    onLocationChange(lat, lon);
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
            className="flex-1 px-3 py-2 outline-none text-sm text-slate-800" 
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
    </>
  );
};

function DraggableMarker({ lat, lng, onLocationChange }: DraggableMapProps) {
  const markerRef = useRef<L.Marker>(null);
  
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          onLocationChange(newPos.lat, newPos.lng);
        }
      },
    }),
    [onLocationChange]
  );

  return (
    <Marker
      key="draggable-report-marker"
      draggable={true}
      eventHandlers={eventHandlers}
      position={[lat, lng]}
      icon={customIcon}
      ref={markerRef}
    >
      <Popup minWidth={90}>
        <span className="font-bold text-red-600">พิกัดของคุณ</span><br/>
        <span className="text-xs text-gray-600">สามารถลากหมุดเพื่อแก้ไขตำแหน่งได้</span>
      </Popup>
    </Marker>
  );
}

export default function DraggableMap({ lat, lng, onLocationChange }: DraggableMapProps) {
  return (
    <div className="h-[250px] w-full rounded-xl overflow-hidden border-2 border-orange-200 mt-3 relative z-0">
      <MapContainer 
        center={[lat, lng]} 
        zoom={16} 
        scrollWheelZoom={false} 
        className="w-full h-full z-0"
      >
        <MapSearchControl onLocationChange={onLocationChange} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <DraggableMarker lat={lat} lng={lng} onLocationChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}
