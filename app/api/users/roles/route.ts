import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const sql = `
      SELECT * FROM roles
      ORDER BY created_at DESC
    `;

    const roles = await query(sql) as any[];

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Fetch roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, permissions } = body;

    if (!name || !permissions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await query(
      'INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)',
      [name, description || null, JSON.stringify(permissions)]
    );

    return NextResponse.json(
      { id: (result as any).insertId, message: 'Role created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, description, permissions } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    await query(
      'UPDATE roles SET name = ?, description = ?, permissions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description || null, JSON.stringify(permissions), id]
    );

    return NextResponse.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Prevent deletion of system roles
    const roleData = await query('SELECT name FROM roles WHERE id = ?', [id]) as any[];
    if (roleData[0]?.name === 'admin' || roleData[0]?.name === 'rescue' || roleData[0]?.name === 'victim') {
      return NextResponse.json(
        { error: 'Cannot delete system roles' },
        { status: 403 }
      );
    }

    await query('DELETE FROM roles WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
