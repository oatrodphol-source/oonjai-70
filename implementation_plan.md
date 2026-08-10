# Implementation Plan: Centralized Admin Settings & AI Upgrades

## 🎯 เป้าหมาย (Goal)
เพื่อยกระดับระบบหลังบ้านให้แอดมินสามารถจัดการการเชื่อมต่อ LINE, การตั้งค่าระบบโดยรวม, และการตั้งค่า AI ได้อย่างสมบูรณ์แบบโดยไม่ต้องเข้าไปแก้ไข Source Code อีกต่อไป

---

## 💡 ไอเดียและข้อเสนอแนะสำหรับการพัฒนา (Proposed Ideas)

### 1. หน้าจัดการ LINE SOS (LINE Settings Management)
**URL:** `/admin/line-settings`
**แนวคิด (Ideas):**
- **ฟอร์มตั้งค่าการเชื่อมต่อ:** มีช่องให้ใส่ `Channel Access Token` และ `Channel Secret`
- **Webhook URL Display:** แสดง URL (เช่น `https://yourdomain.com/api/webhook/line`) พร้อมปุ่ม Copy เพื่อให้แอดมินเอาไปแปะใน LINE Developers Console ได้ง่ายๆ
- **ระบบข้อความตอบกลับอัตโนมัติ (Auto-Reply Templates):** มีช่องให้ตั้งค่าข้อความเมื่อมีคนทักมา (เช่น "รับแจ้งเหตุแล้ว กำลังประสานงานกู้ภัย...")
- **ปุ่ม Test Connection:** ลองส่งข้อความทดสอบเข้า LINE ของแอดมินเพื่อเช็คว่าตั้งค่าถูกต้องหรือไม่

### 2. หน้าจัดการระบบทั้งหมด (Global System Management)
**URL:** `/admin/system-settings`
**แนวคิด (Ideas):**
- **หน้าเดียวจัดการได้ครบ (Centralized Dashboard):** รวบรวมตัวแปรของระบบไว้ที่นี่
- **Maintenance Mode:** ปุ่มสวิตช์เปิด/ปิด "โหมดซ่อมบำรุง" หากเปิดไว้ หน้าบ้านผู้ใช้ทั่วไปจะขึ้นประกาศว่าระบบปิดปรับปรุง
- **ข้อมูลการติดต่อฉุกเฉิน:** ให้แอดมินเปลี่ยนเบอร์โทรสายด่วนกลาง (เช่น เปลี่ยนจาก 1669 เป็นเบอร์ท้องถิ่น)
- **การจำกัดการมองเห็น (Visibility Limits):** ตั้งค่าว่าแผนที่ความร้อน (Heatmap) ให้แสดงเคสย้อนหลังกี่วัน

### 3. อัปเกรดหน้า AI Trigger & Triage (AI Settings Upgrade)
**URL:** `/ai-trigger` (หน้าเดิมแต่เพิ่มฟีเจอร์)
**แนวคิด (Ideas):**
- **AI Provider Selection:** เพิ่ม Dropdown ให้เลือกว่าจะใช้ AI ค่ายไหน (เช่น `OpenAI (ChatGPT)`, `Google Gemini`, หรือ `Anthropic Claude`) เผื่อกรณีที่ค่ายใดค่ายหนึ่ง API ล่ม หรือต้องการลดต้นทุน
- **API Key Management:** ช่องกรอก API Key แบบซ่อนรหัส (Password input) 
- **System Prompt Tuning:** ช่อง Textarea ขนาดใหญ่ให้แอดมินสามารถแก้ไข "ชุดคำสั่ง (Prompt)" ที่สั่งให้ AI ตัดสินใจระดับความรุนแรงได้เอง โดยไม่ต้องแก้ในโค้ด (เช่น "ถ้าเป็นเคสน้ำท่วมสูงเกิน 1 เมตร ให้ตีเป็นระดับ 5 ทันที")
- **ส่วนน้ำหนักคะแนนเดิม:** ยังคงเอาไว้ตามปกติ (Weights setting)

---

## 🛠 แผนการดำเนินการ (Implementation Plan)

### ระยะที่ 1: การเตรียมฐานข้อมูล (Database Preparation)
1. **[NEW] `system_settings` Table:** สร้างโครงสร้างตารางใหม่ (หรือเพิ่มใน MySQL `query` เดิม) สำหรับเก็บค่า Configuration โดยใช้รูปแบบ Key-Value หรือ Column-based เพื่อให้เซฟค่า LINE และ System ได้
2. **[MODIFY] `ai_settings` Table:** เพิ่มคอลัมน์ `ai_provider`, `ai_api_key`, `ai_system_prompt` เข้าไปในตาราง `ai_settings` (ใน MySQL)

### ระยะที่ 2: สร้างหน้า UI ฝั่ง Frontend
1. **[MODIFY] `Sidebar.tsx`:** เพิ่มเมนู "จัดการ LINE SOS" และ "ตั้งค่าระบบ" ในแถบเมนูด้านซ้าย (มองเห็นเฉพาะ Admin)
2. **[NEW] `/admin/line-settings/page.tsx`:** สร้างหน้าจัดการ LINE พร้อมฟอร์มเชื่อมต่อ API
3. **[NEW] `/admin/system-settings/page.tsx`:** สร้างหน้าจัดการระบบ (Maintenance, Contact Info)
4. **[MODIFY] `/ai-trigger/page.tsx`:** เพิ่มส่วนการตั้งค่า AI Provider และ Prompt Editor

### ระยะที่ 3: เชื่อมต่อ API Route
1. **[NEW] `/api/settings/route.ts`:** สำหรับดึงและอัปเดตข้อมูล System & LINE
2. **[MODIFY] `/api/ai-triage/route.ts`:** ให้อ่านและเขียนค่า API Key / Provider ได้

---

> [!IMPORTANT]
> **User Review Required (รอการอนุมัติจากคุณ):**
> นี่คือไอเดียทั้งหมดตามที่คุณรีเควสมาครับ หากคุณเห็นด้วยกับรูปแบบนี้ (ฟีเจอร์ LINE, System, และอัปเกรด AI) สามารถกด **Proceed** เพื่อให้ผมเริ่มแก้ฐานข้อมูลและสร้างหน้าต่าง UI ได้เลยครับ หรือถ้าอยากเพิ่มลดส่วนไหน แจ้งมาได้เลยครับ!
