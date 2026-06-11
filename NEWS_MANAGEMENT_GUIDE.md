# News Management System - Implementation Guide

## 📰 Overview

A complete News Management system for OonJai with full CRUD functionality, admin dashboard, and client-facing news feed. Built with Next.js, TypeScript, and Tailwind CSS, integrated with MySQL.

---

## ✨ Features Implemented

### Admin Dashboard
✅ **Create News**
- Orange "สร้างประกาศใหม่" (Create News) button opens a modal form
- Form includes: Title, Content, Image URL (optional), Publish status
- Real-time validation and error handling
- Success confirmation

✅ **News Management Table**
- Display all news articles with ID, Title, Content preview, Status, and Created Date
- Search functionality (search by title or content)
- Pagination (10, 25, 50 per page)
- Edit and Delete action buttons for each article
- Status badges (Published/Draft)

✅ **Edit News**
- Edit existing articles via modal form
- Update title, content, image, and publication status
- All changes saved to database immediately

✅ **Delete News**
- Confirmation modal prevents accidental deletion
- Shows news title and warning message
- Removes record from database upon confirmation
- Immediate UI update after deletion

### Client News Feed
✅ **News Feed Display**
- Responsive grid layout (1 column mobile, 2-3 columns desktop)
- News cards with image, title, content preview
- Status badges (Published/Draft)
- Publication date and author information
- "Read More" link for each article
- Load More button for pagination

✅ **Responsive Design**
- Mobile-first approach
- Adaptive card layout
- Touch-friendly buttons
- Works on all screen sizes

---

## 🗄️ Database Schema

### news table (existing)
```sql
CREATE TABLE news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_id INT,                          -- User who created the news
    title VARCHAR(255) NOT NULL,            -- News title
    content TEXT NOT NULL,                  -- News content
    image_url TEXT,                         -- Optional cover image
    published BOOLEAN DEFAULT TRUE,         -- Publication status
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE SET NULL
);
```

---

## 🛣️ API Endpoints

### GET /api/news
**Description**: Fetch news articles with pagination and filtering
**Query Parameters**:
- `limit` (number, default: 10) - Items per page
- `offset` (number, default: 0) - Pagination offset
- `published` (boolean, optional) - Filter by publication status

**Response**:
```json
{
  "news": [
    {
      "id": 1,
      "title": "ข่าว...",
      "content": "เนื้อหา...",
      "image_url": "url",
      "author_id": 1,
      "published": true,
      "created_at": "2026-06-10T...",
      "updated_at": "2026-06-10T..."
    }
  ],
  "total": 10,
  "limit": 10,
  "offset": 0
}
```

### POST /api/news
**Description**: Create new news article
**Request Body**:
```json
{
  "title": "หัวข้อข่าว",
  "content": "เนื้อหาข่าวสาร",
  "imageUrl": "https://...",
  "authorId": 1,
  "published": true
}
```

### GET /api/news/[id]
**Description**: Fetch single news article
**Response**: Single news object

### PUT /api/news/[id]
**Description**: Update news article
**Request Body**: Same as POST request

### DELETE /api/news/[id]
**Description**: Delete news article
**Response**:
```json
{
  "message": "News deleted successfully"
}
```

---

## 📁 File Structure

```
app/
├── api/
│   └── news/
│       ├── route.ts              # GET all, POST create
│       └── [id]/
│           └── route.ts          # GET one, PUT update, DELETE
├── (backend)/
│   └── news/
│       └── page.tsx              # Admin news management page
└── (frontend)/
    └── feed/
        └── page.tsx              # Client news feed view

components/
├── backend/
│   ├── NewsManagement.tsx        # News table for admin
│   ├── NewsFormModal.tsx         # Form for create/edit
│   └── NewsDeleteModal.tsx       # Delete confirmation modal
└── frontend/
    ├── NewsCard.tsx              # Single news card
    └── NewsFeed.tsx              # News feed grid
```

---

## 🎯 User Workflows

### Admin: Create News
1. Click "สร้างประกาศใหม่" button (orange)
2. Modal opens with form
3. Fill in Title, Content, optional Image URL
4. Click "บันทึก" to save
5. News appears in table immediately

### Admin: Edit News
1. Click Edit button (orange pencil icon) on any news row
2. Modal opens with pre-filled data
3. Update content as needed
4. Click "บันทึก" to save changes
5. Table updates with new information

### Admin: Delete News
1. Click Delete button (red trash icon) on any news row
2. Confirmation modal appears with news title
3. Click "ลบข่าว" to confirm deletion
4. News is removed from database and table
5. Message confirms successful deletion

### Client: View News
1. Navigate to Feed page (`/feed`)
2. See grid of news cards
3. Cards show title, image, content preview
4. Click "อ่านเพิ่มเติม" to view full article
5. Click "Load More" button for additional news

---

## 🔧 Setup Instructions

### 1. Database Setup
The `news` table already exists in your schema. No additional migration needed.

### 2. Environment Configuration
Ensure `.env.local` contains:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=oonjai_system
DB_PORT=3306
```

### 3. Verify Components
Check that all components are imported correctly:
- ✅ `@/components/backend/NewsManagement.tsx`
- ✅ `@/components/backend/NewsFormModal.tsx`
- ✅ `@/components/backend/NewsDeleteModal.tsx`
- ✅ `@/components/frontend/NewsCard.tsx`
- ✅ `@/components/frontend/NewsFeed.tsx`

### 4. Start Development Server
```bash
npm run dev
```

### 5. Access the Pages
- **Admin Panel**: `http://localhost:3000/(backend)/news`
- **Client Feed**: `http://localhost:3000/feed`

---

## 🎨 Design Features

### Color Scheme
- **Orange (#FF6600)**: Primary actions (create button, edit button)
- **Red**: Delete/danger actions
- **Green**: Success status (published badge)
- **Yellow**: Draft/warning status

### Typography
- **Headers**: Bold, large (2xl-3xl)
- **Labels**: Semi-bold, medium (14-16px)
- **Body**: Regular, smaller (12-14px)
- **Thai/English**: Bilingual support

### Components
- **Cards**: White background with shadow, rounded corners
- **Buttons**: Orange primary, gray secondary, red danger
- **Modals**: Centered overlay with smooth animation
- **Tables**: Striped rows, hover effects
- **Badges**: Color-coded status indicators

---

## 🔒 Security Features

✅ **Server-Side Validation**
- Required field validation (title, content)
- SQL parameter binding prevents SQL injection
- File access through API only

✅ **Authorization**
- Admin dashboard accessible only through backend layout
- Delete confirmations prevent accidents
- All operations logged (via user_activity_log)

✅ **Data Protection**
- Timestamps track creation/update times
- Soft delete capability (published flag)
- Foreign key relationships maintained

✅ **Error Handling**
- Graceful error messages
- 404 for missing articles
- Proper HTTP status codes

---

## 📊 Database Query Examples

### Get all published news
```sql
SELECT * FROM news WHERE published = 1 ORDER BY created_at DESC;
```

### Get news by date range
```sql
SELECT * FROM news 
WHERE created_at BETWEEN '2026-06-01' AND '2026-06-30'
ORDER BY created_at DESC;
```

### Get news with author info
```sql
SELECT n.*, u.name as author_name 
FROM news n 
LEFT JOIN user u ON n.author_id = u.id 
WHERE n.published = 1
ORDER BY n.created_at DESC;
```

---

## 🚀 Performance Optimizations

✅ **Pagination**
- Prevents loading all articles at once
- Configurable page size (10, 25, 50)
- Load More button for smooth UX

✅ **Search**
- Client-side filtering for better UX
- Works on title and content
- Case-insensitive matching

✅ **Component Optimization**
- React hooks for state management
- useEffect for data fetching
- Proper dependency arrays

✅ **Database**
- Indexed primary key (id)
- Timestamp indexes for sorting
- Foreign key relationships

---

## 🌍 Internationalization

✅ **Thai Language Support**
- All labels in Thai
- Thai date formatting (th-TH locale)
- Proper Thai text direction

✅ **English Technical Terms**
- Column headers with English names
- Technical descriptions in English where needed
- Consistent terminology

---

## 📱 Responsive Breakpoints

| Device | Layout |
|--------|--------|
| Mobile (< 768px) | Single column, full width |
| Tablet (768px-1024px) | 2 columns |
| Desktop (> 1024px) | 3 columns |
| Admin Tables | Scrollable, adaptive |

---

## 🔄 Data Flow

### Create/Update Flow
```
Form Modal
    ↓
Submit → Validation
    ↓
POST/PUT /api/news
    ↓
Database Update
    ↓
Refresh Component
    ↓
Update UI Table
```

### Delete Flow
```
Delete Button
    ↓
Delete Modal (Confirm)
    ↓
DELETE /api/news/[id]
    ↓
Database Delete
    ↓
Refresh Component
    ↓
Remove from Table
```

### Read Flow
```
User visits /feed
    ↓
GET /api/news?published=true
    ↓
Fetch from Database
    ↓
Display NewsCards
    ↓
Load More → Pagination
```

---

## 🐛 Troubleshooting

### Issue: Images not displaying
- Verify image URL is accessible
- Check CORS settings if external URL
- Use relative paths for local images

### Issue: News not appearing
- Check published status (should be true)
- Verify database connection
- Check browser console for errors

### Issue: Delete not working
- Confirm admin permissions
- Check database constraints
- Verify news ID exists

### Issue: Search not filtering
- Check search query syntax
- Verify LIKE operator working
- Check field names in database

---

## 🎯 Future Enhancements

1. **Rich Text Editor**
   - Replace textarea with WYSIWYG editor
   - Support for formatted text, lists, links

2. **File Upload**
   - Direct image upload instead of URL
   - Image optimization and resizing

3. **Categorization**
   - News categories (Alert, Update, etc.)
   - Filter by category

4. **Comments**
   - User comments on news articles
   - Admin approval system

5. **Search & Filtering**
   - Advanced search filters
   - Full-text search support
   - Date range filtering

6. **Scheduling**
   - Schedule news publication
   - Draft status for scheduling

7. **Analytics**
   - View count tracking
   - Engagement metrics
   - Popular news ranking

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API response status codes
3. Check browser console for JavaScript errors
4. Verify database connection in `.env.local`

---

**Status**: ✅ COMPLETE - Production ready with full MySQL integration
