import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const docRef = doc(db, 'news', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'News not found' },
        { status: 404 }
      );
    }

    const news = { id: docSnap.id, ...docSnap.data() } as any;
    return NextResponse.json({
      ...news,
      published: Boolean(news.published),
    });
  } catch (error: any) {
    console.error("🔥 FIREBASE NEWS READ ERROR:", error);
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
    const { title, content, imageUrl, published } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    try {
      const docRef = doc(db, 'news', id);
      await updateDoc(docRef, {
        title,
        content,
        imageUrl: imageUrl || null,
        published: published ? true : false,
        updated_at: new Date().toISOString()
      });

      return NextResponse.json({ message: 'News updated successfully' });
    } catch (error: any) {
      console.error("🔥 FIREBASE NEWS WRITE ERROR:", error);
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
      const docRef = doc(db, 'news', id);
      await deleteDoc(docRef);

      return NextResponse.json({ message: 'News deleted successfully' });
    } catch (error: any) {
      console.error("🔥 FIREBASE NEWS WRITE ERROR:", error);
      return NextResponse.json({ error: 'Failed to delete news' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Delete news error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
