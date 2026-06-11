import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const rawId = resolvedParams.id;
    if (!rawId) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }

    let caseId = rawId;
    if (rawId.startsWith('CAS-')) {
      caseId = rawId.replace('CAS-', '');
    }

    const docRef = doc(db, 'cases', caseId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({ id: docSnap.id, ...docSnap.data() }, { status: 200 });
  } catch (error) {
    console.error("API GET Case Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    );
  }
}
