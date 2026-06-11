import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { name, email, phone, password, role, agency, unit } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const volunteerAgency = agency || unit;

    if ((role === 'rescue' || role === 'volunteer') && !volunteerAgency) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อหน่วยกู้ภัย' }, { status: 400 });
    }

    const volunteersRef = collection(db, 'volunteers');

    // Check if email or username already exists
    const emailQuery = query(volunteersRef, where('email', '==', email));
    const usernameQuery = query(volunteersRef, where('username', '==', name));

    const [emailSnapshot, usernameSnapshot] = await Promise.all([
      getDocs(emailQuery),
      getDocs(usernameQuery)
    ]);

    if (!emailSnapshot.empty || !usernameSnapshot.empty) {
      return NextResponse.json({ error: 'Email หรือชื่อผู้ใช้นี้มีในระบบแล้ว' }, { status: 409 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      username: name,
      name,
      email,
      phone: phone || null,
      password: hashedPassword,
      password_hash: hashedPassword,
      role: role || 'rescue',
      agency: volunteerAgency || null,
      created_at: new Date().toISOString()
    };

    await addDoc(volunteersRef, newUser);

    return NextResponse.json({ success: true, message: 'User registered successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('🔥 FIREBASE REGISTER ERROR:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}
