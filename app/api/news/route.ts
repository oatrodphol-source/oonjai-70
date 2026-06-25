import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, orderBy, where } from 'firebase/firestore';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParams = searchParams.get('limit') || '10';
    const offsetParams = searchParams.get('offset') || '0';
    const published = searchParams.get('published');

    const newsRef = collection(db, 'news');
    let q = query(newsRef, orderBy('created_at', 'desc'));

    if (published !== null && published !== undefined) {
      const isPublished = published === 'true';
      q = query(newsRef, where('published', '==', isPublished), orderBy('created_at', 'desc'));
    }

    const querySnapshot = await getDocs(q);
    
    const allNews = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    // In-memory pagination since Firestore pagination with offset requires cursors
    const total = allNews.length;
    const limit = parseInt(limitParams);
    const offset = parseInt(offsetParams);
    const paginatedNews = allNews.slice(offset, offset + limit);

    return NextResponse.json({
      news: paginatedNews,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("🔥 FIREBASE NEWS READ ERROR:", error);
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

      const docRef = await addDoc(collection(db, 'news'), newNews);

      return NextResponse.json(
        { id: docRef.id, message: 'News created successfully' },
        { status: 201 }
      );
    } catch (error: any) {
      console.error("🔥 FIREBASE NEWS WRITE ERROR:", error);
      return NextResponse.json({ error: 'Failed to create news' }, { status: 500 });
    }
  } catch (error: any) {
    console.error("News POST Payload Error:", error);
    return NextResponse.json({ error: 'Failed to parse request payload' }, { status: 500 });
  }
}
