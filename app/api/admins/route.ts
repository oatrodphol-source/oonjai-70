import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch all admins or a specific admin by email/ID
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const emailFilter = url.searchParams.get('email');
    const idFilter = url.searchParams.get('id');

    if (idFilter) {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', idFilter)
        .single();
        
      if (data) {
        return NextResponse.json({ id: data.id, ...data }, { status: 200 });
      } else {
        return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
      }
    }

    let query = supabase.from('admins').select('*');

    if (emailFilter) {
      query = query.eq('email', emailFilter);
    }

    const { data: admins, error } = await query;
    
    if (error) {
      throw error;
    }

    return NextResponse.json({ admins }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 SUPABASE ADMIN ERROR:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// POST: Add a new admin doc
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { name, email, role, permissions } = payload;

    if (!email || !name) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const newAdmin = {
      name,
      email,
      role: role || 'admin',
      permissions: permissions || [],
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('admins')
      .insert(newAdmin)
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ message: 'Admin created successfully', id: data.id }, { status: 201 });
  } catch (error: any) {
    console.error("🔥 SUPABASE ADMIN ERROR:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// PUT / PATCH: Allow updating permissions or info
export async function PUT(req: Request) {
  return handleUpdate(req);
}

export async function PATCH(req: Request) {
  return handleUpdate(req);
}

async function handleUpdate(req: Request) {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get('id');
    const payload = await req.json();

    if (!id && payload.id) {
      id = payload.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }

    const updateData = { ...payload };
    delete updateData.id; // Don't write the ID back to the document payload

    const { error } = await supabase
      .from('admins')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Admin updated successfully' }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 SUPABASE ADMIN ERROR:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// DELETE: Remove an admin safely
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get('id');

    if (!id) {
      const payload = await req.json().catch(() => ({}));
      id = payload.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Admin deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 SUPABASE ADMIN ERROR:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
