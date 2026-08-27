import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const { data: news, error } = await supabase.from('news').select('*').eq('id', id).single();

    if (error || !news) {
      return NextResponse.json(
        { error: 'News not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...news,
      published: Boolean(news.published),
    });
  } catch (error: any) {
    console.error("🔥 SUPABASE NEWS READ ERROR:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();
    const { title, content, imageUrl, published, type } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    try {
      const { error } = await supabase.from('news').update({
        title,
        content,
        imageUrl: imageUrl || null,
        published: published ? true : false,
        type: type || 'news',
        updated_at: new Date().toISOString()
      }).eq('id', id);
      
      if (error) throw error;

      // Auto-trigger LINE Broadcast for urgent announcements when published
      const isUrgent = (type === 'announcement' || type === 'ประกาศด่วน') && Boolean(published);
      if (isUrgent) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://oonjai-70-6yo4.vercel.app');
        fetch(`${baseUrl}/api/line/broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, imageUrl })
        }).catch(err => console.error('[Auto LINE Broadcast Error]', err));
      }

      return NextResponse.json({ message: 'News updated successfully' });
    } catch (error: any) {
      console.error("🔥 SUPABASE NEWS WRITE ERROR:", error);
      return NextResponse.json({ error: 'Failed to update news' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Update news error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    try {
      const { error } = await supabase.from('news').delete().eq('id', id);
      if (error) throw error;

      return NextResponse.json({ message: 'News deleted successfully' });
    } catch (error: any) {
      console.error("🔥 SUPABASE NEWS WRITE ERROR:", error);
      return NextResponse.json({ error: 'Failed to delete news' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Delete news error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
