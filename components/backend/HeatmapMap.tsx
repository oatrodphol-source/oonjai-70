'use client';
import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import HeatmapLayer from '@/components/frontend/HeatmapLayer';

interface HeatmapMapProps {
  points: [number, number, number][]; // [lat, lng, intensity]
}

export default function HeatmapMap({ points }: HeatmapMapProps) {
  const position: [number, number] = [13.7563, 100.5018]; // BKK Default

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
        <HeatmapLayer points={points} />
      </MapContainer>
    </div>
  );
}
