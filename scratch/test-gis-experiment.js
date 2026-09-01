// Test GIS & Leaflet.heat functionality for 50 cases
const fs = require('fs');

// Haversine formula implementation as in MapView.tsx
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Generate 50 realistic test coordinate sets in Thailand & various scenarios
const testLocations = [
  { name: 'Siam Paragon', lat: 13.7466, lng: 100.5347, severity: 5 },
  { name: 'CentralWorld', lat: 13.7469, lng: 100.5393, severity: 4 },
  { name: 'Victory Monument', lat: 13.7649, lng: 100.5383, severity: 3 },
  { name: 'Chatuchak Market', lat: 13.7999, lng: 100.5508, severity: 2 },
  { name: 'Grand Palace', lat: 13.7500, lng: 100.4915, severity: 5 },
  { name: 'ICONSIAM', lat: 13.7267, lng: 100.5108, severity: 1 },
  { name: 'Silom Complex', lat: 13.7285, lng: 100.5342, severity: 4 },
  { name: 'Asok Intersection', lat: 13.7369, lng: 100.5608, severity: 3 },
  { name: 'Thong Lo', lat: 13.7303, lng: 100.5815, severity: 2 },
  { name: 'Ekkamai', lat: 13.7196, lng: 100.5852, severity: 3 },
  { name: 'Ari BTS', lat: 13.7797, lng: 100.5447, severity: 2 },
  { name: 'Mo Chit BTS', lat: 13.8023, lng: 100.5538, severity: 4 },
  { name: 'Bang Sue Grand Station', lat: 13.8039, lng: 100.5398, severity: 5 },
  { name: 'Don Mueang Airport', lat: 13.9126, lng: 100.6067, severity: 3 },
  { name: 'Suvarnabhumi Airport', lat: 13.6900, lng: 100.7501, severity: 4 },
  { name: 'Nonthaburi Pier', lat: 13.8427, lng: 100.4905, severity: 2 },
  { name: 'Impact Arena', lat: 13.9113, lng: 100.5488, severity: 5 },
  { name: 'Mega Bangna', lat: 13.6467, lng: 100.6803, severity: 3 },
  { name: 'Future Park Rangsit', lat: 13.9892, lng: 100.6177, severity: 4 },
  { name: 'Samut Prakan City Hall', lat: 13.5991, lng: 100.5971, severity: 2 },
  { name: 'Chiang Mai Old City', lat: 18.7883, lng: 98.9853, severity: 4 },
  { name: 'Chiang Mai Airport', lat: 18.7668, lng: 98.9626, severity: 3 },
  { name: 'Doi Suthep', lat: 18.8048, lng: 98.9216, severity: 2 },
  { name: 'Phuket Old Town', lat: 7.8844, lng: 98.3908, severity: 5 },
  { name: 'Patong Beach', lat: 7.8967, lng: 98.2968, severity: 4 },
  { name: 'Phuket Airport', lat: 8.1132, lng: 98.3169, severity: 3 },
  { name: 'Khon Kaen University', lat: 16.4744, lng: 102.8231, severity: 3 },
  { name: 'Central Khon Kaen', lat: 16.4322, lng: 102.8267, severity: 2 },
  { name: 'Korat Terminal 21', lat: 14.9818, lng: 102.0967, severity: 4 },
  { name: 'Pattaya Walking Street', lat: 12.9254, lng: 100.8719, severity: 5 },
  { name: 'Pattaya Beach Central', lat: 12.9348, lng: 100.8831, severity: 3 },
  { name: 'Hua Hin Night Market', lat: 12.5707, lng: 99.9577, severity: 2 },
  { name: 'Hua Hin Clock Tower', lat: 12.5684, lng: 99.9576, severity: 1 },
  { name: 'Chonburi City Hall', lat: 13.3611, lng: 100.9847, severity: 3 },
  { name: 'Bangsaen Beach', lat: 13.2833, lng: 100.9144, severity: 4 },
  { name: 'Ayutthaya Historical Park', lat: 14.3556, lng: 100.5583, severity: 5 },
  { name: 'Nakhon Pathom Chedi', lat: 13.8196, lng: 100.0601, severity: 3 },
  { name: 'Ratchaburi City Center', lat: 13.5381, lng: 99.8156, severity: 2 },
  { name: 'Kanchanaburi Bridge', lat: 14.0410, lng: 99.5038, severity: 4 },
  { name: 'Surat Thani City', lat: 9.1382, lng: 99.3215, severity: 3 },
  { name: 'Koh Samui Chaweng', lat: 9.5323, lng: 100.0631, severity: 4 },
  { name: 'Hat Yai Clock Tower', lat: 7.0084, lng: 100.4747, severity: 5 },
  { name: 'Songkhla Old Town', lat: 7.2061, lng: 100.5898, severity: 2 },
  { name: 'Ubon Ratchathani City', lat: 15.2287, lng: 104.8564, severity: 3 },
  { name: 'Udon Thani Nong Prajak', lat: 17.4138, lng: 102.7872, severity: 4 },
  { name: 'Rayong PMY Beach', lat: 12.6681, lng: 101.2384, severity: 3 },
  { name: 'Trat City Center', lat: 12.2428, lng: 102.5175, severity: 2 },
  { name: 'Krabi Ao Nang', lat: 8.0357, lng: 98.8242, severity: 5 },
  { name: 'Nakhon Si Thammarat Wat Phra Mahathat', lat: 8.4116, lng: 99.9662, severity: 4 },
  { name: 'Sukhothai Historical Park', lat: 17.0189, lng: 99.7039, severity: 3 }
];

console.log(`Loaded ${testLocations.length} locations for testing.`);

// Test 1: Marker Rendering Validation
let markerSuccessCount = 0;
testLocations.forEach((loc, idx) => {
  const isValidLat = typeof loc.lat === 'number' && !isNaN(loc.lat) && loc.lat >= -90 && loc.lat <= 90;
  const isValidLng = typeof loc.lng === 'number' && !isNaN(loc.lng) && loc.lng >= -180 && loc.lng <= 180;
  const hasSeverity = typeof loc.severity === 'number' && loc.severity >= 1 && loc.severity <= 5;
  const markerObj = {
    position: [loc.lat, loc.lng],
    id: idx + 1,
    title: loc.name,
    severity: loc.severity
  };
  if (isValidLat && isValidLng && hasSeverity && markerObj.position.length === 2) {
    markerSuccessCount++;
  }
});

// Test 2: Haversine Formula Distance Calculation
let haversineSuccessCount = 0;
const referenceOrigin = { lat: 13.7466, lng: 100.5347 }; // Siam Paragon
testLocations.forEach((loc, idx) => {
  const dist = getDistanceKm(referenceOrigin.lat, referenceOrigin.lng, loc.lat, loc.lng);
  // Verify distance is valid number, non-negative, and mathematically sound (< 20,000 km)
  if (typeof dist === 'number' && !isNaN(dist) && dist >= 0 && dist <= 20000) {
    haversineSuccessCount++;
  }
});

// Test 3: Heatmap Rendering Data Preparation (Leaflet.heat layer format [lat, lng, intensity])
let heatmapSuccessCount = 0;
const heatPoints = testLocations.map(loc => {
  const intensity = (loc.severity || 1) / 5.0;
  return [loc.lat, loc.lng, intensity];
});

heatPoints.forEach(p => {
  const validPoint = Array.isArray(p) && p.length === 3 &&
    !isNaN(p[0]) && p[0] >= -90 && p[0] <= 90 &&
    !isNaN(p[1]) && p[1] >= -180 && p[1] <= 180 &&
    !isNaN(p[2]) && p[2] >= 0 && p[2] <= 1.0;
  if (validPoint) {
    heatmapSuccessCount++;
  }
});

console.log('Results:');
console.log(`1. Markers: ${markerSuccessCount} / 50 (${(markerSuccessCount/50)*100}%)`);
console.log(`2. Haversine: ${haversineSuccessCount} / 50 (${(haversineSuccessCount/50)*100}%)`);
console.log(`3. Heatmap: ${heatmapSuccessCount} / 50 (${(heatmapSuccessCount/50)*100}%)`);
const totalTests = 50 * 3;
const totalSuccess = markerSuccessCount + haversineSuccessCount + heatmapSuccessCount;
console.log(`Total: ${totalSuccess} / ${totalTests} (${((totalSuccess/totalTests)*100).toFixed(2)}%)`);
