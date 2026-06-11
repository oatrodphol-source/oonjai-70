import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Received LINE Webhook payload:', JSON.stringify(body, null, 2));

    // Loop through the events sent by LINE
    if (body.events && Array.isArray(body.events)) {
      for (const event of body.events) {
        // Identify location messages
        if (event.type === 'message' && event.message && event.message.type === 'location') {
          const { latitude, longitude, address, title } = event.message;
          const userId = event.source?.userId || 'Unknown';
          
          console.log(`Processing location from LINE: ${latitude}, ${longitude}`);

          // Insert into cases table
          // Note: 'name' and 'phone' are required fields in the cases table schema
          const sql = `
            INSERT INTO cases 
            (name, phone, type, latitude, longitude, status, details) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          
          await query(sql, [
            'LINE User', // Placeholder since LINE doesn't provide name in this payload
            'Unknown',   // Placeholder
            'แจ้งผ่าน LINE', 
            latitude, 
            longitude, 
            'pending',
            `พิกัด: ${title || address || 'ไม่ระบุ'}\nLINE User ID: ${userId}`
          ]);
          
          console.log(`Successfully created new case from LINE Webhook.`);
        }
      }
    }

    // ALWAYS return a 200 OK status immediately so the LINE server knows the webhook was received successfully
    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('LINE Webhook processing error:', error);
    // Return 200 even on error to prevent LINE from repeatedly retrying and blocking the queue
    return NextResponse.json({ message: 'OK' }, { status: 200 });
  }
}
