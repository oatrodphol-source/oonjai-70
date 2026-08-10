import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParams = searchParams.get('limit') || '10';
    const offsetParams = searchParams.get('offset') || '0';
    const published = searchParams.get('published');

    let query = supabase.from('news').select('*', { count: 'exact' }).order('created_at', { ascending: false });

    if (published !== null && published !== undefined) {
      const isPublished = published === 'true';
      query = query.eq('published', isPublished);
    }

    const limit = parseInt(limitParams);
    const offset = parseInt(offsetParams);
    
    // pagination in supabase uses range
    query = query.range(offset, offset + limit - 1);

    const { data: paginatedNews, count: total, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      news: paginatedNews || [],
      total: total || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("🔥 SUPABASE NEWS READ ERROR:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, content, imageUrl, authorId, published, type } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    try {
      const newNews = {
        title,
        content,
        imageUrl: imageUrl || null,
        authorId: authorId || null,
        published: published ? true : false,
        type: type || 'news',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('news').insert(newNews).select().single();
      if (error) throw error;

      return NextResponse.json(
        { id: data.id, message: 'News created successfully' },
        { status: 201 }
      );
    } catch (error: any) {
      console.error("🔥 SUPABASE NEWS WRITE ERROR:", error);
      return NextResponse.json({ error: 'Failed to create news' }, { status: 500 });
    }
  } catch (error: any) {
    console.error("News POST Payload Error:", error);
    return NextResponse.json({ error: 'Failed to parse request payload' }, { status: 500 });
  }
}
