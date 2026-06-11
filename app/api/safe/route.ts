import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, caseIds, area } = body;

    console.log("🔥 SAFE API RECEIVED:", { phone, caseIds, area });

    // 1. Record the safe report
    if (phone || area) {
      await addDoc(collection(db, 'safe_reports'), {
        phone: phone || '',
        area: area || '',
        timestamp: new Date().toISOString()
      });
    }

    const updatePromises: Promise<void>[] = [];

    // Step A: Close by IDs
    if (Array.isArray(caseIds) && caseIds.length > 0) {
      for (const id of caseIds) {
        updatePromises.push(
          updateDoc(doc(db, 'cases', id), { 
            status: 'ปลอดภัยแล้ว', 
            updated_at: new Date().toISOString(),
            admin_note: 'Auto-resolved: ผู้ใช้ยืนยันสถานะปลอดภัยแล้ว (by ID)'
          }).catch(err => console.error(`Error updating doc ${id}:`, err))
        );
      }
    }

    // Step B: Close by Phone
    if (phone && typeof phone === 'string' && phone.trim() !== '') {
      const q = query(collection(db, 'cases'), where("phone", "==", phone.trim()));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((document) => {
        const data = document.data();
        if (data.status !== 'completed' && data.status !== 'cancelled' && data.status !== 'ปลอดภัยแล้ว') {
          updatePromises.push(
            updateDoc(doc(db, 'cases', document.id), {
              status: 'ปลอดภัยแล้ว',
              updated_at: new Date().toISOString(),
              admin_note: 'Auto-resolved: ผู้ใช้ยืนยันสถานะปลอดภัยแล้ว (by Phone)'
            }).catch(err => console.error(`Error updating doc ${document.id}:`, err))
          );
        }
      });
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    return NextResponse.json({ success: true, message: 'บันทึกข้อมูลสำเร็จ! ระบบได้ทำการอัปเดตสถานะการขอความช่วยเหลือของคุณเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error("Error in Safe API:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
