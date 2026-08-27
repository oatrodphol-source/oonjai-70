import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('input');

  if (!input || input.trim().length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const cleanInput = input.trim();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  // 1. If Google Maps API Key is configured, prioritize Google Places Autocomplete API
  if (apiKey) {
    try {
      const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        cleanInput
      )}&language=th&components=country:th&key=${apiKey}`;

      const res = await fetch(googleUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
          const predictions = (data.predictions || []).map((item: any) => ({
            place_id: item.place_id,
            main_text: item.structured_formatting?.main_text || item.description,
            secondary_text: item.structured_formatting?.secondary_text || '',
            description: item.description,
            source: 'google'
          }));
          return NextResponse.json({ predictions, provider: 'google' });
        }
      }
    } catch (err) {
      console.error('Google Places Autocomplete error:', err);
    }
  }

  // 2. High-performance Free Multi-Provider Search (Longdo Public POI + Nominatim Spaced + Photon)
  try {
    // Generate Thai word segments for OpenStreetMap query
    let spacedInput = cleanInput;
    try {
      const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
      spacedInput = Array.from(segmenter.segment(cleanInput))
        .map((s) => s.segment)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (e) {
      /* Fallback if Segmenter is unavailable */
    }

    const fetches = [
      // Provider A: Longdo Map Search (Best coverage for Thai schools, temples, government offices & local POIs)
      fetch(`https://search.longdo.com/mapsearch/json/search?keyword=${encodeURIComponent(cleanInput)}&limit=6`, {
        headers: {
          'Referer': 'https://map.longdo.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
        .then(async (r) => {
          if (!r.ok) return [];
          const text = await r.text();
          let cleanText = text;
          if (cleanText.includes('throw') && cleanText.includes('{')) {
            cleanText = cleanText.substring(cleanText.indexOf('{'));
          }
          const data = JSON.parse(cleanText);
          return (data.data || []).map((i: any) => ({
            place_id: `longdo_${i.id}`,
            main_text: i.name,
            secondary_text: i.address || i.ob || '',
            description: `${i.name} ${i.address || ''}`,
            lat: parseFloat(i.lat),
            lng: parseFloat(i.lon),
            source: 'longdo'
          }));
        })
        .catch((err) => {
          console.error('Longdo search error:', err);
          return [];
        }),

      // Provider B: OpenStreetMap Nominatim with Thai Spaced Segmentation
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          spacedInput
        )}&countrycodes=th&limit=6&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'th,en',
            'User-Agent': 'OonJaiEmergencyApp/1.0'
          }
        }
      )
        .then((r) => (r.ok ? r.json() : []))
        .then((data) =>
          (data || []).map((i: any) => ({
            place_id: `osm_${i.place_id}`,
            main_text: i.display_name.split(',')[0],
            secondary_text: i.display_name.split(',').slice(1, 4).join(','),
            description: i.display_name,
            lat: parseFloat(i.lat),
            lng: parseFloat(i.lon),
            source: 'osm'
          }))
        )
        .catch(() => []),

      // Provider C: Photon OpenStreetMap POI Engine
      fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(cleanInput)}&limit=6`)
        .then((r) => (r.ok ? r.json() : { features: [] }))
        .then((data) =>
          (data.features || []).map((f: any) => ({
            place_id: `photon_${f.properties.osm_id}`,
            main_text: f.properties.name || f.properties.street || '',
            secondary_text: [f.properties.district, f.properties.city, f.properties.state, f.properties.country]
              .filter(Boolean)
              .join(', '),
            description: f.properties.name,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            source: 'photon'
          }))
        )
        .catch(() => [])
    ];

    const resultsArray = await Promise.all(fetches);
    const combined = resultsArray.flat();

    // Deduplicate results by approximate coordinates (radius ~100m)
    const seenCoordinates = new Set<string>();
    const predictions: any[] = [];

    for (const item of combined) {
      if (!item || !item.lat || !item.lng || isNaN(item.lat) || isNaN(item.lng)) continue;
      const geoKey = `${item.lat.toFixed(3)}_${item.lng.toFixed(3)}`;
      if (!seenCoordinates.has(geoKey)) {
        seenCoordinates.add(geoKey);
        predictions.push(item);
      }
    }

    return NextResponse.json({ predictions: predictions.slice(0, 8), provider: 'free_multi_provider' });
  } catch (err) {
    console.error('Free multi-provider search error:', err);
  }

  return NextResponse.json({ predictions: [], provider: 'none' });
}
