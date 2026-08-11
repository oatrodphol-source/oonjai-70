import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('place_id');

  if (!placeId) {
    return NextResponse.json({ error: 'Missing place_id' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey && !placeId.startsWith('osm_')) {
    try {
      const googleDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,geometry,formatted_address&language=th&key=${apiKey}`;

      const res = await fetch(googleDetailsUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.result?.geometry?.location) {
          return NextResponse.json({
            lat: data.result.geometry.location.lat,
            lng: data.result.geometry.location.lng,
            name: data.result.name || data.result.formatted_address
          });
        }
      }
    } catch (err) {
      console.error('Google Place Details error:', err);
    }
  }

  return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 500 });
}
