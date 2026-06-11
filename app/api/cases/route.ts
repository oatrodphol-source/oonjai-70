import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const phoneFilter = url.searchParams.get('phone');
    const idFilter = url.searchParams.get('id');
    
    const casesRef = collection(db, 'cases');
    let q = query(casesRef, orderBy('createdAt', 'desc'));

    if (phoneFilter) {
      q = query(casesRef, where('phone', '==', phoneFilter), orderBy('createdAt', 'desc'));
    } else if (idFilter) {
      q = query(casesRef, where('__name__', '==', idFilter));
    }
    
    const querySnapshot = await getDocs(q);
    const cases = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const formattedCases = cases.map((row: any) => ({
      id: `CAS-${row.id}`,
      rawId: row.id,
      name: row.name,
      type: row.type,
      severity: row.severity,
      time: row.createdAt 
        ? new Date(row.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        : row.created_at 
          ? new Date(row.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
          : '-',
      status: mapStatus(row.status),
      phone: row.phone,
      peopleCount: row.peopleCount || 1,
      waterLevel: row.waterLevel || '-',
      bedridden: Boolean(row.bedridden),
      elderly: Boolean(row.elderly),
      note: row.details || '-',
      latitude: row.latitude,
      longitude: row.longitude
    }));

    return NextResponse.json(formattedCases, { status: 200 });
  } catch (error: any) {
    console.error("🔥 FIREBASE READ ERROR:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

function mapStatus(dbStatus: string) {
  switch(dbStatus) {
    case 'pending':
    case 'wait': return 'รอการช่วยเหลือ';
    case 'accepted': return 'รับเรื่องแล้ว';
    case 'in_progress': return 'กำลังช่วยเหลือ';
    case 'completed': return 'เสร็จสิ้น';
    case 'cancelled': return 'ยกเลิก';
    default: return dbStatus;
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("Attempting to save to Firebase:", payload);

    const {
      name,
      phone,
      type,
      peopleCount,
      bedridden,
      elderly,
      waterLevel,
      details,
      latitude,
      longitude,
      image_url
    } = payload;

    const bedriddenVal = bedridden ? 1 : 0;
    const elderlyVal = elderly ? 1 : 0;
    
    let severity = 1;
    let appendedNote = "";

    if (bedriddenVal === 1 || waterLevel === 'ท่วมมิดหลังคา') {
      severity = 5;
      appendedNote = "[ผู้ป่วยติดเตียง/วิกฤตอันตรายถึงชีวิต]";
    } else if (elderlyVal === 1 && waterLevel === 'ระดับอก/ท่วมในบ้าน') {
      severity = 4;
      appendedNote = "[กลุ่มเปราะบาง/เสี่ยงสูงต้องการอพยพด่วน]";
    } else if (waterLevel === 'ระดับอก/ท่วมในบ้าน' || waterLevel === 'ระดับเอว') {
      severity = 3;
      appendedNote = "[น้ำเข้าบ้าน/ต้องการความช่วยเหลือ]";
    } else if (waterLevel === 'ระดับเข่า') {
      severity = 2;
      appendedNote = "[น้ำท่วมถนน/สัญจรลำบาก]";
    }

    const finalDetails = appendedNote ? `${details || ''} ${appendedNote}`.trim() : (details || '');
    const status = 'pending';

    const newCase = {
      name: name || '-',
      phone: phone || '-',
      type,
      severity,
      peopleCount,
      bedridden: bedriddenVal,
      elderly: elderlyVal,
      waterLevel,
      latitude: latitude || 0,
      longitude: longitude || 0,
      status,
      details: finalDetails || null,
      image_url: image_url || null,
      created_at: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'cases'), newCase);
    console.log("Successfully saved case ID:", docRef.id);

    return NextResponse.json({ success: true, id: docRef.id, phone: payload.phone });
  } catch (error: any) {
    console.error("🔥 FIREBASE WRITE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
