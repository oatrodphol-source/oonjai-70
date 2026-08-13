'use client';

import React, { useState } from 'react';
import { MapPin, Search, Navigation, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface LocationPickerProps {
  address: string;
  latitude?: number;
  longitude?: number;
  onChangeLocation: (data: { address: string; latitude?: number; longitude?: number; province?: string }) => void;
}

export default function VolunteerLocationPicker({
  address,
  latitude,
  longitude,
  onChangeLocation,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);

  // Auto-search using multi-provider autocomplete API
  const handleSearch = async (queryText?: string) => {
    const text = queryText !== undefined ? queryText : searchQuery;
    if (!text.trim() || text.trim().length < 2) return;
    
    setIsSearching(true);
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(text.trim())}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const predictions = data.predictions || [];
      setSearchResults(predictions);
      
      if (predictions.length === 0) {
        toast.error('ไม่พบสถานที่ที่ค้นหา ลองพิมพ์ชื่ออำเภอหรือจังหวัดเพิ่มเติม');
      }
    } catch (e) {
      console.error(e);
      toast.error('เกิดข้อผิดพลาดในการค้นหาสถานที่');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = async (item: any) => {
    setIsSearching(true);
    let lat = item.lat;
    let lng = item.lng;
    let fullAddr = item.description || `${item.main_text} ${item.secondary_text}`.trim();

    // If Google place without lat/lng, fetch place details
    if ((!lat || !lng) && item.place_id) {
      try {
        const detailsRes = await fetch(`/api/places/details?place_id=${item.place_id}`);
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          if (detailsData.lat && detailsData.lng) {
            lat = detailsData.lat;
            lng = detailsData.lng;
            if (detailsData.name) fullAddr = detailsData.name;
          }
        }
      } catch (e) {
        console.error('Fetch place details error:', e);
      }
    }

    // Detect Thai province from fullAddr
    let detectedProv = '';
    const THAI_PROVINCES_LIST = [
      'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา',
      'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก',
      'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน',
      'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา',
      'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต',
      'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี',
      'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
      'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี',
      'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี'
    ];

    for (const prov of THAI_PROVINCES_LIST) {
      if (fullAddr.includes(prov) || fullAddr.includes(prov.replace('มหานคร', ''))) {
        detectedProv = prov;
        break;
      }
    }

    onChangeLocation({
      address: fullAddr,
      latitude: lat ? parseFloat(lat) : undefined,
      longitude: lng ? parseFloat(lng) : undefined,
      province: detectedProv || undefined,
    });

    setSearchResults([]);
    setIsSearching(false);
    toast.success('ปักหมุดสถานที่สำเร็จ!');
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('เบราว์เซอร์ของคุณไม่รองรับการระบุพิกัด GPS');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const addr = data.display_name || `พิกัด GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          
          let detectedProv = '';
          if (addr.includes('ปทุมธานี')) detectedProv = 'ปทุมธานี';
          else if (addr.includes('กรุงเทพ')) detectedProv = 'กรุงเทพมหานคร';

          onChangeLocation({
            address: addr,
            latitude: lat,
            longitude: lng,
            province: detectedProv || undefined,
          });
          toast.success('ดึงพิกัด GPS ปัจจุบันสำเร็จ!');
        } catch (e) {
          onChangeLocation({
            address: `พิกัด GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            latitude: lat,
            longitude: lng,
          });
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        toast.error('ไม่สามารถดึงพิกัด GPS ได้ กรุณาพิมพ์ค้นหาชื่อสถานที่แทน');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3 bg-gray-50 dark:bg-gray-800/80 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <MapPin size={16} className="text-red-500" /> ที่อยู่ / พิกัดศูนย์กู้ภัยประจำการหลัก
        </label>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium bg-blue-50 dark:bg-blue-900/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          {isLocating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
          ใช้พิกัด GPS ปัจจุบัน
        </button>
      </div>

      {/* Location Search Bar with Autocomplete */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim().length >= 2) {
                  handleSearch(e.target.value);
                } else {
                  setSearchResults([]);
                }
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
              placeholder="พิมพ์ชื่อโรงเรียน/วัด/ศูนย์กู้ภัย/สถานที่..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          </div>
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={isSearching}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 shrink-0"
          >
            {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            ค้นหา
          </button>
        </div>

        {/* Search Results Dropdown List */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700 z-50">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectResult(item)}
                className="w-full text-left p-3 text-xs text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors flex items-start gap-2.5"
              >
                <MapPin size={15} className="text-red-500 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-gray-900 dark:text-white text-sm truncate">{item.main_text}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs truncate mt-0.5">{item.secondary_text || item.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Address Text Area */}
      <textarea
        name="address"
        rows={2}
        value={address}
        onChange={(e) => onChangeLocation({ address: e.target.value, latitude, longitude })}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
        placeholder="ระบุที่อยู่ / ศูนย์ประสานงาน / จุดสแตนด์บายประจำการ"
      />

      {/* Coordinates Badge */}
      {latitude && longitude ? (
        <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <Check size={14} className="shrink-0" />
          <span>บันทึกพิกัด GPS แม่นยำแล้ว: <strong>{latitude.toFixed(5)}, {longitude.toFixed(5)}</strong> (AI นำไปวิเคราะห์ระยะทางได้ 100%)</span>
        </div>
      ) : (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          💡 สามารถค้นหาชื่อสถานที่ หรือกดปุ่ม <strong>"ใช้พิกัด GPS ปัจจุบัน"</strong> เพื่อให้ AI คำนวณระยะทางได้แม่นยำที่สุด
        </p>
      )}
    </div>
  );
}
