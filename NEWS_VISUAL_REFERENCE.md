# News Management System - Visual Reference Guide

## 🖼️ Admin Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  จัดการข่าวสาร                          [Search...]  🌙  🔔  │  ← Header
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    [สร้างประกาศใหม่] ← Orange Button    │ │  Create Button
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [Search...]   [ทั้งหมด ▼] [10▼]                         │ │  Controls
│  ├─────────────────────────────────────────────────────────┤ │
│  │ ID | หัวข้อข่าว        | เนื้อหา...    | สถานะ | วันที่ | │  Table Header
│  ├─────────────────────────────────────────────────────────┤ │
│  │ 1  | ประกาศเตือน...  | ขอให้ประชาชน... | ✓     | 10/6  │ │ [✏️] [🗑️]  ← Actions
│  │ 2  | จุดอพยพ...      | เทศบาลได้จัดเต... | ✓   | 9/6   │ │ [✏️] [🗑️]
│  │ 3  | หมายเรียก...    | ขอเรียนให้ทราบ... | ✓   | 8/6   │ │ [✏️] [🗑️]
│  ├─────────────────────────────────────────────────────────┤ │
│  │ ◀ 1 ▶  แสดง 1-10 จาก 25                                │ │  Pagination
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  🔒 Secured by OonJai System - การดำเนินการทั้งหมดถูก...   │  Security Note
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Create/Edit News Modal

```
┌──────────────────────────────────────────────┐
│ สร้างข่าวสารใหม่                         [✕]  │  ← Header + Close
├──────────────────────────────────────────────┤
│                                              │
│ หัวข้อข่าว                                   │
│ ┌──────────────────────────────────────────┐ │
│ │ หัวข้อข่าวสาร                            │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ เนื้อหาข่าว                                  │
│ ┌──────────────────────────────────────────┐ │
│ │                                          │ │
│ │ เนื้อหาข่าวสาร...                        │ │
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ URL รูปภาพ (ตัวเลือก)                       │
│ ┌──────────────────────────────────────────┐ │
│ │ https://example.com/image.jpg            │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ☑ เผยแพร่ข่าว                                │
│                                              │
├──────────────────────────────────────────────┤
│              [ยกเลิก]  [💾 บันทึก]          │
└──────────────────────────────────────────────┘
```

---

## ⚠️ Delete Confirmation Modal

```
┌──────────────────────────────────┐
│          ❌                       │  Alert Icon
│                                  │
│     ลบข่าวสาร?                  │  Title
│                                  │
│ คุณต้องการลบข่าว               │  Message
│ "ประกาศเตือนภัยน้ำท่วม..."    │
│ หรือไม่?                        │
│                                  │
│ การกระทำนี้ไม่สามารถยกเลิกได้  │  Warning
│                                  │
├──────────────────────────────────┤
│      [ยกเลิก]  [ลบข่าว]         │
└──────────────────────────────────┘
```

---

## 📱 Client News Feed Layout (Mobile/Desktop)

```
MOBILE (1 column)           TABLET (2 columns)      DESKTOP (3 columns)

┌─────────────────┐        ┌──────────┬──────────┐  ┌─────┬─────┬─────┐
│ ข่าวสารล่าสุด  │        │ NEWS #1  │ NEWS #2  │  │ N1  │ N2  │ N3  │
│ ……………………  │        │          │          │  │     │     │     │
│                 │        ├──────────┼──────────┤  ├─────┼─────┼─────┤
│ ┌─────────────┐ │        │ NEWS #3  │ NEWS #4  │  │ N4  │ N5  │ N6  │
│ │ [NEWS IMG] │ │        │          │          │  └─────┴─────┴─────┘
│ │             │ │        └──────────┴──────────┘
│ │ ประกาศ…   │ │
│ │ ขอให้ประชา │ │    [Load More Button]
│ │ …          │ │
│ │ 10 มิถ…   │ │
│ │ [อ่าน...] │ │
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │
│ │ [NEWS IMG] │ │
│ │ ……………… │
│ └─────────────┘ │
│                 │
│ [Load More ▼]   │
└─────────────────┘
```

---

## 📊 News Card Details (Desktop View)

```
┌────────────────────────────────────┐
│  ┌────────────────────────────────┐ │
│  │      [NEWS IMAGE HERE]         │ │  ← Image (300x200)
│  └────────────────────────────────┘ │
│                                    │
│  [✓ เผยแพร่]  ← Status Badge        │
│                                    │
│  ประกาศเตือนภัยน้ำท่วมฉับพลัน    │  ← Title
│                                    │
│  ขอให้ประชาชนในพื้นที่เสี่ยง      │
│  ริมแม่น้ำเจ้าพระยาเตรียมพร้อม   │  ← Content Preview
│  รับมือระดับน้ำที่อาจเพิ่มสูงขึ้น   │
│                                    │
│  📅 10 มิถุนายน 2026 14:30        │  ← Date
│  👤 ผู้ดูแลระบบ                    │  ← Author
│                                    │
│  [อ่านเพิ่มเติม →]                │  ← Read More Link
└────────────────────────────────────┘
```

---

## 🎯 Button Styles & States

### Create Button (Orange)
```
[สร้างประกาศใหม่] ← Normal state (#ff6600)
  ↓
[สร้างประกาศใหม่] ← Hover state (#e65c00)
  ↓
[สร้างประกาศใหม่] ← Loading state (disabled)
```

### Table Action Buttons
```
Row: ID | Title | Content | Status | Date | [✏️] [🗑️]

[✏️] Edit   → Orange, hover background
[🗑️] Delete → Red, hover background
```

### Modal Buttons
```
[ยกเลิก]     → Gray secondary button
[💾 บันทึก]  → Green success button
[ลบข่าว]     → Red danger button
```

---

## 📲 Responsive Behavior

### Mobile (< 768px)
- Single column cards
- Full-width buttons
- Hamburger menu (if needed)
- Touch-friendly spacing
- Larger tap targets (44px minimum)

### Tablet (768px - 1024px)
- 2 column grid
- Side-by-side layouts where possible
- Slightly larger fonts
- Balanced spacing

### Desktop (> 1024px)
- 3 column grid for news
- Multi-column tables
- Optimal reading width
- Enhanced hover effects

---

## 🎨 Color Palette

| Element | Color | Hex | Use |
|---------|-------|-----|-----|
| Primary | Orange | #ff6600 | Buttons, accents |
| Danger | Red | #ef4444 | Delete, warnings |
| Success | Green | #10b981 | Published status |
| Warning | Yellow | #f59e0b | Draft status |
| Text | Dark Gray | #1f2937 | Body text |
| Light | Light Gray | #f3f4f6 | Backgrounds |
| Dark | Dark Blue | #0b1325 | Dark theme bg |

---

## 📐 Typography

```
Headings
├── H1: 28px Bold (Page titles)
├── H2: 24px Bold (Section titles)
├── H3: 20px Bold (Card titles)
└── H4: 16px Semi-bold (Labels)

Body
├── Regular: 16px Regular (Body text)
├── Small: 14px Regular (Form labels)
└── Tiny: 12px Regular (Timestamps)

Monospace
└── 14px (Code, IDs, technical info)
```

---

## 📋 Data Table Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Header Row (Dark background)                                    │
├─────────────────────────────────────────────────────────────────┤
│ Data Row 1 (Light background, hover highlight)  [Edit] [Delete] │
├─────────────────────────────────────────────────────────────────┤
│ Data Row 2 (Light background, hover highlight)  [Edit] [Delete] │
├─────────────────────────────────────────────────────────────────┤
│ Data Row 3 (Light background, hover highlight)  [Edit] [Delete] │
├─────────────────────────────────────────────────────────────────┤
│ Pagination: ◀ 1 2 3 ▶  |  Showing 1-10 of 50                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 User Interaction Flow

### Create News Flow
```
User
  ↓
Click "สร้างประกาศใหม่" button
  ↓
Modal opens (empty form)
  ↓
Fill title, content, image (optional)
  ↓
Check "เผยแพร่ข่าว" checkbox
  ↓
Click "บันทึก"
  ↓
Submit to POST /api/news
  ↓
Success message + Modal closes
  ↓
Table refreshes with new article
  ↓
Display in feed immediately
```

### Edit News Flow
```
User
  ↓
Click Edit button (pencil icon)
  ↓
Modal opens with pre-filled data
  ↓
Modify any field
  ↓
Click "บันทึก"
  ↓
Submit to PUT /api/news/[id]
  ↓
Table updates with new data
  ↓
Confirmation displayed
```

### Delete News Flow
```
User
  ↓
Click Delete button (trash icon)
  ↓
Delete Modal appears
  ↓
Shows title + warning message
  ↓
User clicks "ลบข่าว"
  ↓
Submit to DELETE /api/news/[id]
  ↓
Record removed from database
  ↓
Table refreshes
  ↓
News disappears from list
```

---

## 🖥️ Screen Resolution Testing

| Device | Width | Layout |
|--------|-------|--------|
| iPhone SE | 375px | 1 column, mobile nav |
| iPad Mini | 768px | 2 columns, side nav |
| iPad Pro | 1024px | 3 columns, side nav |
| Desktop | 1440px | 3 columns, optimal width |
| Wide | 1920px | 3 columns + extra padding |

---

## ⌨️ Keyboard Navigation

```
Tab Order:
1. Search input
2. Role filter dropdown
3. Rows per page dropdown
4. First action button (Edit/Delete)
5. Pagination buttons
6. Create button (top of page)

Enter: Activate button/modal
Esc: Close modal
```

---

## 🎭 Component States

### Button States
```
Normal   → Visible, clickable
Hover    → Color change, shadow
Active   → Pressed appearance
Disabled → Opacity 50%, no pointer
Loading  → Shows spinner or text
```

### Form States
```
Empty    → Placeholder text visible
Filled   → User input visible
Error    → Red border, error message
Success  → Green checkmark, message
Loading  → Spinner, submit disabled
```

### Table States
```
Empty    → "No data found" message
Loading  → Loading spinner
Filtered → Results matching search
Sorted   → By date descending
Paginated → Page 1, 2, 3...
```

---

**Last Updated**: June 10, 2026
**Version**: 1.0
**Status**: ✅ Production Ready
