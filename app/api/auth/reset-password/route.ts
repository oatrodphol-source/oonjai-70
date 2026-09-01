import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, phone, agency, province, newPassword } = body;

    // ตรวจสอบว่ากรอกข้อมูลครบทุกช่อง (บังคับกรอกทั้งหมด)
    if (!username || !phone || !agency || !province || !newPassword) {
      return NextResponse.json(
        { error: 'กรุณากรอก Username, เบอร์โทรศัพท์, หน่วยกู้ภัย, จังหวัดประจำการ และรหัสผ่านใหม่ให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' },
        { status: 400 }
      );
    }

    // ทำความสะอาดเบอร์โทรศัพท์ (ลบขีดและช่องว่าง)
    const cleanPhone = phone.replace(/[\s-]/g, '').trim();

    // ค้นหาข้อมูลอาสาสมัคร (เฉพาะอาสาสมัครเท่านั้น)
    const { data: volData, error: volErr } = await supabase
      .from('volunteers')
      .select('*')
      .eq('username', username.trim())
      .maybeSingle();

    if (volErr || !volData) {
      return NextResponse.json(
        { error: 'ไม่พบชื่อผู้ใช้งาน (Username) อาสาสมัครนี้ในระบบ' },
        { status: 404 }
      );
    }
    const user = volData;

    // 1. ตรวจสอบเบอร์โทรศัพท์
    const userCleanPhone = (user.phone || '').replace(/[\s-]/g, '').trim();
    if (userCleanPhone !== cleanPhone) {
      return NextResponse.json(
        { error: 'เบอร์โทรศัพท์ไม่ตรงกับข้อมูลที่ลงทะเบียนไว้' },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบหน่วยงาน/สังกัดกู้ภัย (บังคับตรวจ)
    const userAgency = (user.agency || '').toLowerCase().trim();
    const inputAgency = agency.toLowerCase().trim();
    if (userAgency && !userAgency.includes(inputAgency) && !inputAgency.includes(userAgency)) {
      return NextResponse.json(
        { error: 'หน่วยงาน/สังกัดกู้ภัยไม่ตรงกับข้อมูลที่ลงทะเบียนไว้' },
        { status: 400 }
      );
    }

    // 3. ตรวจสอบจังหวัดประจำการ (บังคับตรวจ)
    const userProvince = (user.province || '').toLowerCase().trim();
    const inputProvince = province.toLowerCase().trim();
    if (userProvince && !userProvince.includes(inputProvince) && !inputProvince.includes(userProvince)) {
      return NextResponse.json(
        { error: 'จังหวัดประจำการไม่ตรงกับข้อมูลที่ลงทะเบียนไว้' },
        { status: 400 }
      );
    }

    // ตรวจสอบสถานะบัญชี
    if (user.status === 'inactive' || user.status === 'deleted') {
      return NextResponse.json(
        { error: 'บัญชีของคุณถูกปิดใช้งาน กรุณาติดต่อศูนย์ผู้ดูแลระบบ' },
        { status: 403 }
      );
    }

    // เข้ารหัสรหัสผ่านใหม่ด้วย bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // อัปเดตรหัสผ่านในฐานข้อมูล Supabase
    const { error: updateErr } = await supabase
      .from('volunteers')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateErr) {
      console.error('[Reset Password ERROR]:', updateErr);
      return NextResponse.json(
        { error: 'ไม่สามารถบันทึกรหัสผ่านใหม่ได้ กรุณาลองใหม่อีกครั้ง' },
        { status: 500 }
      );
    }

    // บันทึก Log กิจกรรมความปลอดภัยลง activity_logs อัตโนมัติ พร้อม timestamp และ IP
    try {
      const ip = request.headers.get('x-forwarded-for') || 'Unknown IP';
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        user: user.username || user.name,
        action: 'รีเซ็ตรหัสผ่าน (Password Reset)',
        ip_address: ip,
        status: 'success',
        timestamp: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn('Failed to log reset password activity:', logErr);
    }

    return NextResponse.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านใหม่สำเร็จเรียบร้อยแล้ว สามารถเข้าสู่ระบบได้ทันที'
    }, { status: 200 });

  } catch (error: any) {
    console.error('API Reset Password Error:', error);
    return NextResponse.json(
      { error: `เกิดข้อผิดพลาด: ${error.message}` },
      { status: 500 }
    );
  }
}
