import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = body.username;
    const { password, name, phone, agency, province, address, skills_equipment } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน' }, { status: 400 });
    }

    // เช็คชื่อซ้ำ
    const { data: existingVol } = await supabase.from('volunteers').select('id').eq('username', username).maybeSingle();
    if (existingVol) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้นี้ มีในระบบแล้ว' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // บันทึกลงฐานข้อมูล Supabase
    const { data: newUser, error } = await supabase
      .from('volunteers')
      .insert([{
        username: username.trim(),
        password_hash: hashedPassword,
        name: name.trim(),
        phone: phone ? String(phone).replace(/\D/g, '').slice(0, 10) : null,
        agency: agency ? agency.trim() : null,
        province: province || 'ปทุมธานี',
        address: address || null,
        skills_equipment: skills_equipment || null,
        role: 'volunteer',
        status: 'active'
      }])
      .select().single();

    if (error) throw error;

    // บันทึกกิจกรรมลง activity_logs
    try {
      const ip = request.headers.get('x-forwarded-for') || 'Unknown IP';
      await supabase.from('activity_logs').insert({
        user_id: newUser.id,
        user: newUser.username || newUser.name,
        action: 'ลงทะเบียนสมาชิกใหม่ (Register)',
        ip_address: ip,
        status: 'success',
        timestamp: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn('Failed to log register activity:', logErr);
    }

    return NextResponse.json({ message: 'ลงทะเบียนสำเร็จ', user: newUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: `ไม่สามารถลงทะเบียนได้: ${error.message}` }, { status: 500 });
  }
}