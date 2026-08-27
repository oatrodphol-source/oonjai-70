@AGENTS.md
# Project Overview
โปรเจกต์นี้คือระบบคอร์สออนไลน์สร้างด้วย Next.js, TypeScript, Tailwind CSS, Prisma และ SQLite

# Tech Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite

# Folder Structure
- app/ ใช้เก็บ route และ page หลัก
- components/ ใช้เก็บ reusable components
- lib/ ใช้เก็บ helper functions และ database client 
- prisma/ ใช้เก็บ schema และ migration

# Coding Rules
- ใช้ TypeScript ทุกไฟล์
- หลีกเลี่ยง any ถ้าไม่จำเป็น
- แยก component ให้เล็กและอ่านง่าย
- เขียนโค้ดให้อ่านง่ายมากกว่าสั้นเกินไป
- ห้ามลบโค้ดเดิมถ้าไม่เข้าใจหน้าที่ของมัน

# Commands 
- npm run dev สำหรับรันโปรเจกต์
- npm run build สำหรับตรวจ production build
- npx prisma studio สำหรับเปิด database UI
- npx prisma migrate dev สำหรับรัน migration

# Workflow
ก่อนแก้โค้ดให้ทำตามนี้:
1. อ่านไฟล์ที่เกี่ยวข้องก่อน
2. อธิบายแผนการแก้แบบสั้น ๆ
3. แก้เฉพาะไฟล์ที่จำเป็น
4. ตรวจว่าโค้ดไม่กระทบส่วนอื่น
5. สรุปสิ่งที่แก้หลังทำเสร็จ



