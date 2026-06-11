import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'oonjai_secret_key_123';

export async function POST(req: Request) {
  try {
    const { email, password, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing username/email or password' }, { status: 400 });
    }

    // Find user by email or username (since the label says "ชื่อบัญชีผู้ใช้ / อีเมล")
    const users = await query('SELECT * FROM user WHERE email = ? OR username = ?', [email, email]) as any[];
    
    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const user = users[0];

    // Check role if specified
    if (role && user.role && user.role !== role) {
      return NextResponse.json({ error: `บัญชีนี้ไม่มีสิทธิ์เข้าถึงในระดับ ${role}` }, { status: 403 });
    }

    // Verify password (handle both password_hash and password column names just in case)
    const hashToCompare = user.password || user.password_hash;
    if (!hashToCompare) {
       return NextResponse.json({ error: 'Database configuration error: No password field found' }, { status: 500 });
    }

    const isMatch = await bcrypt.compare(password, hashToCompare);
    if (!isMatch) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user.userId, name: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Return success without password hash
    const { password: _pw, password_hash, ...userWithoutPassword } = user;
    
    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return NextResponse.json({ 
      message: 'Login successful',
      token,
      user: userWithoutPassword
    }, { status: 200 });

  } catch (error: any) {
    console.error('Login error:', error);
    // Return the actual error message to help debug why it failed
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || String(error)) }, { status: 500 });
  }
}
