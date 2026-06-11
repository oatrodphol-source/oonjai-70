import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, query, where, getDoc } from 'firebase/firestore';

// GET: Fetch all volunteers, or filter by status/location
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status');
    const areaFilter = url.searchParams.get('area');
    const idFilter = url.searchParams.get('id');

    if (idFilter) {
      const docRef = doc(db, 'volunteers', idFilter);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return NextResponse.json({ id: docSnap.id, ...docSnap.data() }, { status: 200 });
      } else {
        return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 });
      }
    }

    const volunteersRef = collection(db, 'volunteers');
    let q = query(volunteersRef);
    let conditions = [];

    if (statusFilter) {
      conditions.push(where('status', '==', statusFilter));
    }
    if (areaFilter) {
      conditions.push(where('area', '==', areaFilter));
    }

    if (conditions.length > 0) {
      q = query(volunteersRef, ...conditions);
    }

    const querySnapshot = await getDocs(q);
    const volunteers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ volunteers }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 FIREBASE VOLUNTEER ERROR:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// POST: Register a new volunteer
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { name, phone, status, area } = payload;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const newVolunteer = {
      name,
      phone,
      status: status || 'pending',
      area: area || null,
      created_at: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'volunteers'), newVolunteer);
    
    return NextResponse.json({ message: 'Volunteer registered successfully', id: docRef.id }, { status: 201 });
  } catch (error: any) {
    console.error("🔥 FIREBASE VOLUNTEER ERROR:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// PUT / PATCH: Change volunteer status or update their profile
export async function PUT(req: Request) {
  return handleUpdate(req);
}

export async function PATCH(req: Request) {
  return handleUpdate(req);
}

async function handleUpdate(req: Request) {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get('id');
    const payload = await req.json();

    if (!id && payload.id) {
      id = payload.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'Volunteer ID is required' }, { status: 400 });
    }

    const docRef = doc(db, 'volunteers', id);
    const updateData = { ...payload };
    delete updateData.id; // Prevent updating the document ID

    await updateDoc(docRef, updateData);

    return NextResponse.json({ message: 'Volunteer updated successfully' }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 FIREBASE VOLUNTEER ERROR:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
