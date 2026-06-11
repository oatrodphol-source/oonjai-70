import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { status } = await req.json();
    const { id } = await params;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Map frontend status string back to DB enum if needed
    let dbStatus = status;
    if (status === 'รอการช่วยเหลือ') dbStatus = 'wait';
    if (status === 'รับเรื่องแล้ว') dbStatus = 'accepted';
    if (status === 'กำลังช่วยเหลือ') dbStatus = 'in_progress';
    if (status === 'เสร็จสิ้น') dbStatus = 'completed';
    if (status === 'ยกเลิก') dbStatus = 'cancelled';

    let caseId = id;
    if (id.startsWith('CAS-')) {
      caseId = id.replace('CAS-', '');
    }

    const docRef = doc(db, 'cases', caseId);
    
    // We update the doc directly. updateDoc will throw an error if the document doesn't exist,
    // so we wrap it in a try/catch or just let the main catch handle it, 
    // but to return a proper 404 we should perhaps check, or just rely on the error.
    // For safety, let's catch the specific error if possible, or just assume any error during update is a 500/404.
    try {
      await updateDoc(docRef, { status: dbStatus });
    } catch (updateError: any) {
      if (updateError.code === 'not-found') {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Status updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Update case status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
