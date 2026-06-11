import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction } from 'firebase/firestore';

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

    const result = await runTransaction(db, async (transaction) => {
      const counterRef = doc(db, 'counters', 'cases');
      const counterDoc = await transaction.get(counterRef);
      
      let newCount = 1;
      if (counterDoc.exists()) {
        newCount = (counterDoc.data().count || 0) + 1;
      }
      
      // Update counter
      transaction.set(counterRef, { count: newCount }, { merge: true });
      
      const caseNumberStr = String(newCount).padStart(3, '0');
      
      const newCase = {
        case_number: caseNumberStr,
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

      const newCaseRef = doc(collection(db, 'cases'));
      transaction.set(newCaseRef, newCase);

      return { id: newCaseRef.id, case_number: caseNumberStr, phone: newCase.phone };
    });

    console.log("🔥 Quick SOS saved to Firebase via Transaction with Case No:", result.case_number);

    return NextResponse.json({ 
      success: true, 
      id: result.id, 
      case_number: result.case_number,
      phone: result.phone 
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 SOS FIREBASE WRITE ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
