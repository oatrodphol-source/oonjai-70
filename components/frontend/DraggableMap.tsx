'use client';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import GoogleMapControls from '@/components/shared/GoogleMapControls';

interface DraggableMapProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

// Fix leaflet icon issue in Next.js
const customIcon = typeof window !== 'undefined' ? new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
}) : null as any;

function DraggableMarker({ lat, lng, onLocationChange }: DraggableMapProps) {
  const markerRef = useRef<L.Marker>(null);
  
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (typeof window !== 'undefined' && marker != null) {
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
  if (typeof window === 'undefined') return null;

  return (
    <div className="h-[300px] sm:h-[340px] w-full rounded-2xl overflow-hidden border-2 border-orange-200 mt-3 relative z-0 shadow-md">
      <MapContainer 
        center={[lat, lng]} 
        zoom={16} 
        zoomControl={false}
        scrollWheelZoom={false} 
        className="w-full h-full z-0"
      >
        <GoogleMapControls 
          searchTopClass="top-2.5 sm:top-3"
          controlsBottomClass="bottom-3 sm:bottom-4"
          onLocationSelect={(newLat, newLng) => onLocationChange(newLat, newLng)} 
        />
        <DraggableMarker lat={lat} lng={lng} onLocationChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}

