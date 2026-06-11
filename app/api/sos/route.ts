import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { lat, lng } = payload;

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude (lat) and longitude (lng) are required' },
        { status: 400 }
      );
    }

    const newCase = {
      name: 'SOS User (Auto)',
      phone: '-',
      type: 'SOS ด่วน',
      severity: 5,
      peopleCount: 1,
      waterLevel: '-',
      bedridden: 0,
      elderly: 0,
      latitude: lat,
      longitude: lng,
      details: "พิกัด: " + lat + ", " + lng,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'cases'), newCase);
    console.log("🔥 Quick SOS saved to Firebase with ID:", docRef.id);

    return NextResponse.json({ 
      success: true, 
      id: docRef.id, 
      phone: newCase.phone 
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 SOS FIREBASE WRITE ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
