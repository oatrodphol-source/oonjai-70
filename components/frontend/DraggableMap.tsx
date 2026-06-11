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
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DraggableMarker lat={lat} lng={lng} onLocationChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}
