'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useMap, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { Search, X, Loader2, MapPin, Plus, Minus, Crosshair, Layers, Globe } from 'lucide-react';

export interface SearchResult {
  place_id: string;
  main_text?: string;
  secondary_text?: string;
  description?: string;
  lat?: number;
  lng?: number;
  source?: string;
  display_name?: string;
}

interface GoogleMapControlsProps {
  onLocationSelect?: (lat: number, lng: number, name?: string) => void;
  showSearch?: boolean;
  showZoom?: boolean;
  showLocate?: boolean;
  showTileSwitcher?: boolean;
  searchPlaceholder?: string;
  searchClassNames?: string;
  controlsPosition?: 'bottomright' | 'topright';
  searchTopClass?: string;
  controlsBottomClass?: string;
  extraControls?: React.ReactNode;
  leftControls?: React.ReactNode;
}

export type TileMode = 'street' | 'satellite';

export function GoogleTileLayer({ tileMode }: { tileMode: TileMode }) {
  if (tileMode === 'satellite') {
    return (
      <>
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <TileLayer
          url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
      </>
    );
  }

  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      maxZoom={19}
    />
  );
}

export default function GoogleMapControls({
  onLocationSelect,
  showSearch = true,
  showZoom = true,
  showLocate = true,
  showTileSwitcher = true,
  searchPlaceholder = 'ค้นหาสถานที่...',
  controlsPosition = 'bottomright',
  searchTopClass = 'top-3',
  controlsBottomClass = 'bottom-20 sm:bottom-24',
  extraControls,
  leftControls
}: GoogleMapControlsProps) {
  const map = useMap();

  // Search States
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchPin, setSearchPin] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Map Tile Switcher State
  const [tileMode, setTileMode] = useState<TileMode>('street');

  // Locate Me state
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Close search results on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Skip search on item selection
  const skipNextSearchRef = useRef(false);

  // Debounced Search API call (/api/places/autocomplete)
  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      setIsSearching(false);
      setShowResults(false);
      return;
    }

    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsSearching(false);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.predictions || []);
          setShowResults(true);
        }
      } catch (err) {
        console.error('Map search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = async (item: any) => {
    let lat = item.lat;
    let lng = item.lng;
    let name = item.main_text || item.description;

    skipNextSearchRef.current = true;
    setQuery(name);
    setShowResults(false);

    // If coordinates are not provided directly (e.g. Google Places ID), fetch details
    if (!lat || !lng) {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/places/details?place_id=${encodeURIComponent(item.place_id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.lat && data.lng) {
            lat = data.lat;
            lng = data.lng;
            if (data.name) name = data.name;
          }
        }
      } catch (err) {
        console.error('Place details error:', err);
      } finally {
        setIsSearching(false);
      }
    }

    if (lat && lng) {
      setSearchPin({ lat, lng, name });

      // Smooth map move
      map.flyTo([lat, lng], 16, {
        animate: true,
        duration: 1.5
      });

      if (onLocationSelect) {
        onLocationSelect(lat, lng, name);
      }
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง GPS');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation([lat, lng]);

        map.flyTo([lat, lng], 16, {
          animate: true,
          duration: 1.2
        });

        setIsLocating(false);
        if (onLocationSelect) {
          onLocationSelect(lat, lng, 'ตำแหน่งปัจจุบัน');
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setIsLocating(false);
        alert('ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณาเปิดการอนุญาตใช้งาน GPS');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const dropdownRef = useRef<HTMLUListElement>(null);

  // Stop Leaflet from intercepting scroll and touch events on the dropdown list
  useEffect(() => {
    if (dropdownRef.current && typeof window !== 'undefined' && L.DomEvent) {
      L.DomEvent.disableScrollPropagation(dropdownRef.current);
      L.DomEvent.disableClickPropagation(dropdownRef.current);
    }
  }, [showResults, results]);

  return (
    <>
      <GoogleTileLayer tileMode={tileMode} />

      {/* Floating Google Maps Style Search Bar */}
      {showSearch && (
        <div 
          ref={searchRef}
          className={`absolute ${searchTopClass} left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md pointer-events-auto`}
        >
          <div className="relative flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200 dark:border-slate-800 transition-all duration-300 hover:shadow-xl focus-within:ring-2 focus-within:ring-orange-500/40">
            <div className="pl-4 pr-2 text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-slate-400" />
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setShowResults(true);
              }}
              placeholder={searchPlaceholder}
              className="w-full py-2.5 sm:py-3 pr-3 text-xs sm:text-sm bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-medium"
            />

            {isSearching && (
              <div className="pr-3 text-orange-500">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}

            {query && !isSearching && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setShowResults(false);
                  setSearchPin(null);
                }}
                className="pr-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showResults && results.length > 0 && (
            <ul 
              ref={dropdownRef}
              onWheel={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute left-0 right-0 top-full mt-1.5 bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 max-h-48 sm:max-h-56 overflow-y-auto animate-in fade-in duration-200 z-[10001] pointer-events-auto [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.5)_transparent]"
            >
              {results.map((item: any) => {
                const mainName = item.main_text || item.description || item.display_name?.split(',')[0];
                const subText = item.secondary_text || item.display_name?.split(',').slice(1, 4).join(',');
                return (
                  <li key={item.place_id}>
                    <button
                      type="button"
                      onClick={() => handleSelectResult(item)}
                      className="w-full px-4 py-2.5 text-left hover:bg-orange-50/80 dark:hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 group"
                    >
                      <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {mainName}
                        </div>
                        {subText && (
                          <div className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 truncate">
                            {subText}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Floating Action Controls - LEFT SIDE STACK */}
      <div className={`absolute ${controlsPosition === 'topright' ? 'top-16 left-3' : `${controlsBottomClass} left-3 sm:left-4`} z-[1000] flex flex-col gap-2.5 items-start transition-all duration-200 ${showResults && results.length > 0 ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-auto scale-100'}`}>
        {/* Map Layer Switcher */}
        {showTileSwitcher && (
          <button
            type="button"
            onClick={() => setTileMode(tileMode === 'street' ? 'satellite' : 'street')}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 group"
            title={tileMode === 'street' ? 'สลับเป็นภาพดาวเทียม' : 'สลับเป็นแผนที่ปกติ'}
          >
            {tileMode === 'street' ? (
              <>
                <Globe className="w-4 h-4 text-blue-600 group-hover:rotate-12 transition-transform shrink-0" />
                <span className="font-bold">ดาวเทียม</span>
              </>
            ) : (
              <>
                <Layers className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-bold">แผนที่ปกติ</span>
              </>
            )}
          </button>
        )}

        {/* Left Side Custom Controls */}
        {leftControls}
      </div>

      {/* Floating Action Controls - RIGHT SIDE STACK */}
      <div className={`absolute ${controlsPosition === 'topright' ? 'top-16 right-3' : `${controlsBottomClass} right-3 sm:right-4`} z-[1000] flex flex-col items-end gap-2.5 transition-all duration-200 ${showResults && results.length > 0 ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-auto scale-100'}`}>
        {/* Extra Custom Controls Slot */}
        {extraControls}

        {/* Google Maps Styled Zoom Control Stack */}
        {showZoom && (
          <div className="flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-2 sm:p-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center active:bg-slate-200"
              title="ซูมเข้า (+)"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-2 sm:p-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center active:bg-slate-200"
              title="ซูมออก (-)"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Locate Me (GPS) - Below zoom controls */}
        {showLocate && (
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center group"
            title="ตำแหน่งปัจจุบัน (GPS)"
          >
            <Crosshair className={`w-5 h-5 text-orange-500 ${isLocating ? 'animate-spin' : 'group-hover:rotate-90 transition-transform duration-300'}`} />
          </button>
        )}
      </div>

      {/* Selected Search Pin Marker */}
      {searchPin && (
        <Marker
          key={`search-pin-${searchPin.lat}-${searchPin.lng}`}
          position={[searchPin.lat, searchPin.lng]}
          icon={L.divIcon({
            html: `
              <div class="relative flex items-center justify-center">
                <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-500 opacity-60"></span>
                <div class="relative w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  📍
                </div>
              </div>
            `,
            className: 'custom-search-pin',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          })}
        >
          <Popup className="rounded-xl">
            <div className="p-1 font-sans text-xs">
              <span className="font-bold text-red-600 block mb-0.5">📍 ตำแหน่งจากการค้นหา</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium block truncate max-w-[200px]">
                {searchPin.name}
              </span>
            </div>
          </Popup>
        </Marker>
      )}

      {/* User GPS Pin Marker */}
      {userLocation && (
        <Marker
          key={`user-gps-${userLocation[0]}-${userLocation[1]}`}
          position={userLocation}
          icon={L.divIcon({
            html: `
              <div class="relative flex items-center justify-center">
                <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-500 opacity-70"></span>
                <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-md"></span>
              </div>
            `,
            className: 'custom-user-gps',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })}
        >
          <Popup className="rounded-xl">
            <div className="font-sans font-bold text-center text-blue-600 text-xs p-0.5">
              🎯 ตำแหน่งปัจจุบันของคุณ
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}
