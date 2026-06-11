import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { name, email, phone, password, role, agency } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role === 'rescue' && !agency) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อหน่วยกู้ภัย' }, { status: 400 });
    }

    // Check if email or username already exists
    const existingUsers = await query('SELECT userId FROM user WHERE email = ? OR username = ?', [email, name]);
    if ((existingUsers as any[]).length > 0) {
      return NextResponse.json({ error: 'Email หรือชื่อผู้ใช้นี้มีในระบบแล้ว' }, { status: 409 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const result = await query(
      'INSERT INTO user (username, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, hashedPassword, role]
    ) as any;

    const newUserId = result.insertId;

    if (role === 'rescue') {
      try {
        await query(
          'INSERT INTO rescuer (user_id, agency_name, verified) VALUES (?, ?, false)',
          [newUserId, agency]
        );
      } catch (rescuerErr) {
        console.warn("Could not insert rescuer details:", rescuerErr);
      }
    }

    try {
      await query(
        `INSERT INTO user_activity_log (user_id, action, status) VALUES (?, ?, 'success')`,
        [newUserId, 'REGISTER']
      );
    } catch (logErr) {}

    return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
