import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch all volunteers, or filter by status/location
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status');
    const areaFilter = url.searchParams.get('area');
    const idFilter = url.searchParams.get('id');

    if (idFilter) {
      const { data, error } = await supabase.from('volunteers').select('*').eq('id', idFilter).single();
      if (data) {
        return NextResponse.json({ id: data.id, ...data }, { status: 200 });
      } else {
        return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 });
      }
    }

    let query = supabase.from('volunteers').select('*');

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (areaFilter) {
      query = query.eq('area', areaFilter);
    }

    const { data: volunteers, error } = await query;
    if (error) throw error;

    return NextResponse.json({ volunteers }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 SUPABASE VOLUNTEER ERROR:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// POST: Register a new volunteer
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { name, phone, status, area } = payload;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const newVolunteer = {
      name,
      phone,
      status: status || 'pending',
      area: area || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('volunteers').insert(newVolunteer).select().single();
    if (error) throw error;
    
    return NextResponse.json({ message: 'Volunteer registered successfully', id: data.id }, { status: 201 });
  } catch (error: any) {
    console.error("🔥 SUPABASE VOLUNTEER ERROR:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// PUT / PATCH: Change volunteer status or update their profile
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
      return NextResponse.json({ error: 'Volunteer ID is required' }, { status: 400 });
    }

    const updateData = { ...payload };
    delete updateData.id; // Prevent updating the document ID

    const { error } = await supabase.from('volunteers').update(updateData).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ message: 'Volunteer updated successfully' }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 SUPABASE VOLUNTEER ERROR:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
