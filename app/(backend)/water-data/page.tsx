export const dynamic = 'force-dynamic';

import React from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { CloudRain, Database, Umbrella, Droplet, AlertTriangle } from 'lucide-react';

interface RainItem {
  stationCode: string;
  value: number;
}

interface DamItem {
  stationCode: string;
  value: number;
}

const DAM_MOCK_NAMES: Record<string, string> = {
  'G07003-C.2': 'เขื่อนสิริกิติ์',
  'G07003-C.3': 'เขื่อนภูมิพล',
  'G07003-C.4': 'เขื่อนป่าสักชลสิทธิ์',
  'G07003-C.5': 'เขื่อนอุบลรัตน์',
  'G07003-C.6': 'เขื่อนขุนด่านปราการชล',
  'G07003-C.7': 'เขื่อนวชิราลงกรณ',
};

const getDamName = (code: string) => {
  return DAM_MOCK_NAMES[code] || code;
};

// Fallback Mock Data
const MOCK_RAIN_DATA: RainItem[] = [
  { stationCode: 'STN-BKK-01 (กทม.)', value: 120.5 },
  { stationCode: 'STN-TRT-14 (ตราด)', value: 110.2 },
  { stationCode: 'STN-PKT-05 (ภูเก็ต)', value: 95.8 },
  { stationCode: 'STN-PNB-02 (ปราจีนบุรี)', value: 88.4 },
  { stationCode: 'STN-RYG-08 (ระยอง)', value: 76.0 },
];

const MOCK_DAM_DATA: DamItem[] = [
  { stationCode: 'เขื่อนภูมิพล', value: 85.4 },
  { stationCode: 'เขื่อนสิริกิติ์', value: 72.1 },
  { stationCode: 'เขื่อนป่าสักชลสิทธิ์', value: 68.9 },
  { stationCode: 'เขื่อนอุบลรัตน์', value: 65.0 },
  { stationCode: 'เขื่อนขุนด่านปราการชล', value: 55.3 },
];

export default async function WaterDataPage() {
  let rainData: RainItem[] = [];
  let damData: DamItem[] = [];
  let isUsingMockData = false;

  try {
    const fetchOptions: RequestInit = { 
      next: { revalidate: 3600 },
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36', 
        'Accept': 'application/json' 
      }
    };

    const [rainRes, damRes] = await Promise.all([
      fetch('https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h', fetchOptions),
      fetch('https://api-v3.thaiwater.net/api/v1/thaiwater30/public/dam_hourly', fetchOptions)
    ]);

    if (!rainRes.ok || !damRes.ok) {
      // Fallback if not OK instead of throwing error
      isUsingMockData = true;
      rainData = MOCK_RAIN_DATA;
      damData = MOCK_DAM_DATA;
    } else {
      const rainJson = await rainRes.json();
      const damJson = await damRes.json();

      // Process Rain Data
      let parsedRain: RainItem[] = [];
      if (rainJson.data?.timeSeriesObservation) {
        const observations = rainJson.data.timeSeriesObservation;
        parsedRain = observations.map((obs: any) => {
          const stationRef = obs.station?.stationReference || '';
          const stationCode = stationRef.split('/').pop() || 'Unknown';
          const val = obs.measurementResults?.[0]?.value || 0;
          return { stationCode, value: Number(val) };
        });
      } else if (Array.isArray(rainJson.data)) {
        parsedRain = rainJson.data.map((item: any) => ({
          stationCode: item.station?.tele_station_name?.th || item.station?.station_name?.th || `ID:${item.id}`,
          value: Number(item.rain_24h || 0)
        }));
      }
      
      rainData = parsedRain
        .filter(item => !isNaN(item.value))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Process Dam Data
      let parsedDam: DamItem[] = [];
      if (damJson.data?.timeSeriesObservation) {
        const observations = damJson.data.timeSeriesObservation;
        parsedDam = observations.map((obs: any) => {
          const stationCode = obs.stationCode || (obs.station?.stationReference?.split('/').pop()) || 'Unknown';
          const val = obs.measurementResults?.[0]?.value || 0;
          return { stationCode, value: Number(val) };
        });
      } else if (Array.isArray(damJson.data)) {
        parsedDam = damJson.data.map((item: any) => ({
          stationCode: item.dam?.dam_name?.th || `ID:${item.id}`,
          value: Number(item.dam_storage_percent || 0)
        }));
      } else if (Array.isArray(damJson.data?.dam_hourly_data)) {
        parsedDam = damJson.data.dam_hourly_data.map((item: any) => ({
          stationCode: item.dam?.dam_name?.th || `ID:${item.id}`,
          value: Number(item.dam_storage_percent || 0)
        }));
      }
      
      damData = parsedDam
        .filter(item => !isNaN(item.value))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Final safety check if API returned empty arrays despite success status
      if (rainData.length === 0 || damData.length === 0) {
        isUsingMockData = true;
        if (rainData.length === 0) rainData = MOCK_RAIN_DATA;
        if (damData.length === 0) damData = MOCK_DAM_DATA;
      }
    }

  } catch (err: any) {
    console.error('Server Fetch error:', err);
    isUsingMockData = true;
    rainData = MOCK_RAIN_DATA;
    damData = MOCK_DAM_DATA;
  }

  return (
    <>
      <DashboardHeader title="ศูนย์ข้อมูลภัยพิบัติและสภาพอากาศ" />
      
      <div className="w-full max-w-[100vw] overflow-x-hidden pb-32 md:pb-10 mx-auto py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Interactive Map (Spans 2 columns on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-4 sm:p-6 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <CloudRain className="text-blue-500 w-6 h-6" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">แผนที่เรดาร์สภาพอากาศ (Windy)</h2>
              </div>
              <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-xl overflow-hidden relative min-h-[480px] sm:min-h-[750px] h-[480px] sm:h-[750px]">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=6&overlay=rain&product=ecmwf&level=surface&lat=13.75&lon=100.5" 
                  frameBorder="0" 
                  className="rounded-xl shadow-md border border-gray-200 dark:border-gray-800 w-full h-full min-h-[480px] sm:min-h-[750px]"
                  style={{ width: '100%', height: '100%', minHeight: '480px' }}
                  title="Windy Weather Map"
                />
              </div>
            </Card>
          </div>

          {/* Right Column: Information Cards */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Card 1: Rain 24h Top 5 */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Umbrella className="text-blue-500 w-6 h-6" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">ฝนตกหนัก 5 อันดับ</h2>
                </div>
                {isUsingMockData && (
                  <span className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    ข้อมูลจำลอง
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {rainData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                        idx === 0 ? 'bg-red-100 text-red-600' : 
                        idx === 1 ? 'bg-orange-100 text-orange-600' :
                        idx === 2 ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm max-w-[130px] sm:max-w-[180px] truncate">
                        {item.stationCode}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{item.value.toFixed(1)}</span>
                      <span className="text-xs text-gray-500 ml-1">มม.</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Card 2: Dam Storage Top 5 */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database className="text-cyan-500 w-6 h-6" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">สถานะน้ำเขื่อนหลัก</h2>
                </div>
                {isUsingMockData && (
                  <span className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    ข้อมูลจำลอง
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {damData.map((item, idx) => {
                  const isHigh = item.value >= 80;
                  return (
                    <div key={idx} className={`flex justify-between items-center p-3 rounded-lg border ${
                      isHigh 
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Droplet className={`w-4 h-4 shrink-0 ${isHigh ? 'text-red-500' : 'text-cyan-500'}`} />
                        <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm max-w-[130px] sm:max-w-[180px] truncate">
                          {getDamName(item.stationCode)}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-1 shrink-0">
                        <span className={`text-lg font-bold ${isHigh ? 'text-red-600 dark:text-red-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                          {item.value.toFixed(1)}%
                        </span>
                        {isHigh && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
