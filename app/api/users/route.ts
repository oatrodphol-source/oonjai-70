import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET: Fetch all users
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (username LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM user ${whereClause}`;
    const countResult = await query(countSql, params) as any;
    const total = countResult[0].total;

    // Get paginated users with aliases matching the frontend User interface
    const sql = `
      SELECT userId, username, email, phone, role, status, created_at 
      FROM user 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    // Add limit and offset to params
    const queryParams = [...params, limit, offset];
    
    const users = await query(sql, queryParams);
    
    return NextResponse.json({ users, total }, { status: 200 });
  } catch (error) {
    console.error("API GET Users Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a new user
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, password, role = 'victim', status = 'active' } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Using exact columns: username, email, password, phone, role
    const insertSql = `
      INSERT INTO user (username, email, password, phone, role)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await query(insertSql, [name, email, passwordHash, phone || null, role]) as any;
    
    const newUserId = result.insertId;

    // Log the action (wrapped in try-catch to not block creation)
    try {
      const logSql = `INSERT INTO user_activity_log (user_id, action, status) VALUES (?, ?, 'success')`;
      await query(logSql, [newUserId, 'CREATE']);
    } catch (logErr) {
      console.warn("Could not log CREATE action:", logErr);
    }

    return NextResponse.json({ message: 'User created successfully', userId: newUserId }, { status: 201 });
  } catch (error) {
    console.error("API POST Users Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update an existing user
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { userId, name, email, phone, role, status } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const updateSql = `
      UPDATE user 
      SET username = COALESCE(?, username), 
          email = COALESCE(?, email), 
          phone = COALESCE(?, phone), 
          role = COALESCE(?, role),
          status = COALESCE(?, status)
      WHERE userId = ?
    `;
    await query(updateSql, [name, email, phone, role, status, userId]);

    // Log the action
    try {
      const logSql = `INSERT INTO user_activity_log (user_id, action, status) VALUES (?, ?, 'success')`;
      await query(logSql, [userId, 'UPDATE']);
    } catch (logErr) {
      console.warn("Could not log UPDATE action:", logErr);
    }

    return NextResponse.json({ message: 'User updated successfully' }, { status: 200 });
  } catch (error) {
    console.error("API PUT Users Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a user
export async function DELETE(req: Request) {
  try {
    // Attempt to parse userId from URL first, then body fallback
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get('userId');

    if (!userId) {
      const body = await req.json().catch(() => ({}));
      userId = body.userId;
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Since deleting a user might trigger ON DELETE CASCADE in the database,
    // we should log the action first or log it to a table that doesn't enforce strict FK for deleted users.
    try {
      const logSql = `INSERT INTO user_activity_log (user_id, action, status) VALUES (?, ?, 'success')`;
      await query(logSql, [userId, 'DELETE']);
    } catch (logErr) {
      console.warn("Could not log DELETE action:", logErr);
    }

    const deleteSql = `DELETE FROM user WHERE userId = ?`;
    await query(deleteSql, [userId]);

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error("API DELETE Users Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
