// ไฟล์: app/api/backend/users/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // 🌟 ย้ำว่าต้อง import จาก lib/supabase ของโปรเจกต์คุณ
import bcrypt from 'bcryptjs';

// 🌟 POST: สำหรับสร้างผู้ใช้งานใหม่
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password, name, phone, agency, role, address, province, skills_equipment, id_card_number, latitude, longitude } = body;

        // 1. ตรวจสอบข้อมูลเบื้องต้น
        if (!username || !password || !name || !role) {
            return NextResponse.json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' }, { status: 400 });
        }

        // 2. ตรวจสอบว่า Username นี้มีอยู่แล้วหรือไม่
        const checkTables = ['admins', 'volunteers'];
        for (const table of checkTables) {
            const { data: existingUser } = await supabase.from(table).select('username').eq('username', username).single();
            if (existingUser) {
                return NextResponse.json({ error: 'ชื่อผู้ใช้งาน (Username) นี้ถูกใช้งานแล้ว' }, { status: 400 });
            }
        }

        // 3. 🌟 Hash รหัสผ่าน
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. เลือกตาราง
        const collectionName = role === 'admin' ? 'admins' : 'volunteers';

        // 5. เตรียมข้อมูล
        const insertData: any = {
            username,
            password_hash: hashedPassword, 
            name,
            phone,
            agency: agency || null,
            address: address || null,
            province: province || null,
            skills_equipment: skills_equipment || null,
            id_card_number: id_card_number || null,
            latitude: latitude ? Number(latitude) : null,
            longitude: longitude ? Number(longitude) : null,
            role,
            created_at: new Date().toISOString()
        };

        // 6. บันทึกลง Supabase
        let { error } = await supabase.from(collectionName).insert([insertData]);

        if (error && (error.message?.includes('latitude') || error.message?.includes('longitude'))) {
            delete insertData.latitude;
            delete insertData.longitude;
            const retry = await supabase.from(collectionName).insert([insertData]);
            error = retry.error;
        }

        if (error) {
             console.error("Supabase Insert Error:", error);
             throw error;
        }

        return NextResponse.json({ success: true, message: 'สร้างผู้ใช้งานสำเร็จ' }, { status: 201 });

    } catch (error: any) {
        console.error('Create User API Error:', error);
        return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
    }
}

// 🌟 PUT: สำหรับแก้ไขข้อมูลผู้ใช้งาน
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, password, name, phone, agency, role, username, status, address, province, skills_equipment, id_card_number, latitude, longitude } = body;

        if (!id || !role) {
            return NextResponse.json({ error: 'กรุณาระบุไอดีและสิทธิ์ (Role)' }, { status: 400 });
        }

        const collectionName = role === 'admin' ? 'admins' : 'volunteers';

        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (agency !== undefined) updateData.agency = agency || null;
        if (address !== undefined) updateData.address = address || null;
        if (province !== undefined) updateData.province = province || null;
        if (skills_equipment !== undefined) updateData.skills_equipment = skills_equipment || null;
        if (id_card_number !== undefined) updateData.id_card_number = id_card_number || null;
        if (latitude !== undefined) updateData.latitude = latitude ? Number(latitude) : null;
        if (longitude !== undefined) updateData.longitude = longitude ? Number(longitude) : null;
        if (username !== undefined) updateData.username = username;
        if (status !== undefined) updateData.status = status;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password_hash = await bcrypt.hash(password, salt);
        }

        let { error } = await supabase.from(collectionName).update(updateData).eq('id', id);

        if (error && (error.message?.includes('latitude') || error.message?.includes('longitude'))) {
            delete updateData.latitude;
            delete updateData.longitude;
            const retry = await supabase.from(collectionName).update(updateData).eq('id', id);
            error = retry.error;
        }

        if (error) {
            console.error("Supabase Update Error:", error);
            return NextResponse.json({ error: error.message || 'Supabase Update Error' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'แก้ไขข้อมูลสำเร็จ' });

    } catch (error: any) {
        console.error('Update User API Error:', error);
        return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
    }
}

// 🌟 DELETE: สำหรับลบผู้ใช้งาน
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const role = searchParams.get('role'); 

        if (!id || !role) {
            return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
        }

        const collectionName = role === 'admin' ? 'admins' : 'volunteers';
        const { error } = await supabase.from(collectionName).update({ status: 'deleted' }).eq('id', id);

        if (error) {
            console.error("Supabase Delete Error:", error);
            throw error;
        }

        return NextResponse.json({ success: true, message: 'ลบผู้ใช้งานเรียบร้อย' });

    } catch (error: any) {
        console.error('Delete User API Error:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
    }
}