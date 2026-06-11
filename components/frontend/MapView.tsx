'use client';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import HeatmapLayer from './HeatmapLayer';
import { Button } from '@/components/ui/Button';
import { Layers, MapPin, Crosshair } from 'lucide-react';

interface CasePoint {
  id: number;
  type: string;
  latitude: number;
  longitude: number;
  severity: number;
}

export default function MapView() {
  const position: [number, number] = [13.7563, 100.5018]; // BKK Default
  const [cases, setCases] = useState<CasePoint[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [icons, setIcons] = useState<{ red: any, yellow: any } | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);

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
    const fetchCases = async () => {
      try {
        const res = await fetch('/api/heatmap');
        const data = await res.json();
        setCases(data);
      } catch (error) {
        console.error('Error fetching map data:', error);
      }
    };
    fetchCases();
  }, []);

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapInstance) {
            try {
              // Only attempt to fly if the map is still properly mounted
              if (mapInstance.getContainer()) {
                mapInstance.flyTo([latitude, longitude], 16, { animate: true, duration: 1.5 });
              }
            } catch (error) {
              console.warn("Map instance was stale, skipping flyTo animation.", error);
            }
          }
          // Always set the location marker, even if flyTo fails
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

  const heatmapPoints: [number, number, number][] = cases.map(c => [c.latitude, c.longitude, c.severity]);

  return (
    <div className="flex-1 w-full relative z-0 h-full min-h-[400px]">
      
      {/* GPS Locate Button */}
      <div className="absolute bottom-44 right-4 z-[1000] flex flex-col gap-3 pointer-events-none">
        <div className="pointer-events-auto">
          <button 
            onClick={handleLocateMe}
            className="bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 flex items-center justify-center p-3 rounded-full transition-all duration-200 active:scale-95 dark:bg-[#0b1325]/95 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800/50"
          >
            <Crosshair className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Layer Toggles */}
      <div className="absolute bottom-28 right-4 z-[1000] flex flex-col gap-3 pointer-events-none">
        <div className="pointer-events-auto">
          <button 
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`backdrop-blur-md flex items-center justify-center gap-2 px-5 py-3 rounded-full font-bold transition-all duration-200 active:scale-95 ${
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
        <ZoomControl position="bottomleft" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {!showHeatmap && icons && cases.map((c) => (
          <Marker 
            key={c.id} 
            position={[c.latitude, c.longitude]} 
            icon={c.severity >= 4 ? icons.red : icons.yellow}
          >
            <Popup>
              <div className="font-sans">
                <p className="font-bold mb-1">รหัสเคส: CAS-{String(c.id).padStart(3, '0')}</p>
                <p className="text-sm">ประเภท: {c.type}</p>
                <p className="text-sm">ความรุนแรง: {c.severity}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {showHeatmap && heatmapPoints.length > 0 && (
          <HeatmapLayer points={heatmapPoints} />
        )}

        {myLocation && (
          <CircleMarker 
            center={myLocation} 
            radius={8}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.8, weight: 2 }}
          >
            <Popup>
              <div className="font-sans font-bold text-[#3b82f6]">
                ตำแหน่งของคุณ
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}
