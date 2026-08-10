import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    console.log('🔥 LOGIN PAYLOAD:', await request.clone().json());
    const body = await request.json();
    const username = body.username;
    const password = body.password;
    const role = body.role;
    
    if (!username || !password) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    let user = null;
    let finalRole = '';

    if (role === 'admin') {
      let { data: adminData, error: adminErr } = await supabase.from('admins').select('*').eq('username', username).maybeSingle();
      console.log('🚨 DB ERROR:', adminErr);
      if (adminData) {
        user = adminData;
        finalRole = 'admin';
      }
    } else {
      let { data: volData, error: volErr } = await supabase.from('volunteers').select('*').eq('username', username).maybeSingle();
      console.log('🚨 DB ERROR:', volErr);
      if (volData) {
        user = volData;
        finalRole = volData.role || 'rescue';
      }
    }

    console.log('✅ FOUND USER:', user);
    if (!user) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้งานในประเภทเจ้าหน้าที่ ที่ท่านเลือก' }, { status: 401 });
    }

    // ตรวจสอบสถานะบัญชี
    if (user.status === 'inactive' || user.status === 'deleted') {
      return NextResponse.json({ error: 'บัญชีของคุณถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ' }, { status: 403 });
    }

    // 4. ตรวจสอบรหัสผ่านแบบผสม (รองรับทั้ง bcrypt hash และ Plain Text)
    let isPasswordMatch = false;
    const storedPassword = user.password_hash || user.password;

    if (storedPassword) {
      try {
        // ใช้ bcrypt เปรียบเทียบเป็นหลัก
        isPasswordMatch = await bcrypt.compare(password, storedPassword);
      } catch (error) {
        // Fallback: ดักจับ Error (เช่น กรณีที่รูปแบบไม่ใช่ Hash)
        isPasswordMatch = false;
      }

      // Fallback: ถ้า bcrypt ตรวจสอบไม่ผ่าน ให้เปรียบเทียบแบบ Plain Text ธรรมดา
      if (!isPasswordMatch) {
        isPasswordMatch = (password === storedPassword);
      }
    }

    if (!isPasswordMatch) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // 5. บันทึกกิจกรรมการเข้าสู่ระบบ
    try {
      const ip = request.headers.get('x-forwarded-for') || 'Unknown IP';
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        user: user.username || user.name,
        action: 'เข้าสู่ระบบ (Login)',
        ip_address: ip,
        status: 'success'
      });
    } catch (logErr) {
      console.error('Failed to log login activity:', logErr);
    }

    // 6. ส่งข้อมูลกลับไปให้หน้าบ้าน (ID ตอนนี้เป็นตัวเลขแล้ว)
    return NextResponse.json({
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: finalRole,
      agency: user.agency || null
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: `ระบบขัดข้อง: ${error.message}` }, { status: 500 });
  }
}