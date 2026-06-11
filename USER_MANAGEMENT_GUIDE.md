# User Management Dashboard - Implementation Guide

## Overview
A professional, fully-featured user management dashboard for the OonJai system with an Anti-gravity IDE aesthetic, built with Next.js, TypeScript, and Tailwind CSS.

## Features Implemented

### 1. **User Management Table**
- Display all users with comprehensive information:
  - User ID (ไอดีผู้ใช้)
  - Username (ชื่อผู้ใช้งาน)
  - Email (อีเมล)
  - Phone (เบอร์โทรศัพท์)
  - Role (สิทธิ์การใช้งาน) with color-coded badges
  - Status (สถานะ) with status indicators
  - Created Date (สร้างเมื่อ)
  
- Advanced table controls:
  - **Search/Filter**: Search by username, email, or phone
  - **Role Filter**: Filter by admin, rescue, or victim roles
  - **Pagination**: Show 10, 25, 50, or all rows per page
  - **Action Buttons**: Edit (orange) and Delete (red) for each user

### 2. **Create User Modal**
- Form to create new users with:
  - Username (required)
  - Email (required, unique validation)
  - Phone (optional)
  - Password (required, hashed on backend)
  - Role selection (Admin, Rescue, or Victim)
  - Error handling with user-friendly messages

### 3. **Edit User Modal**
- Edit existing users:
  - View and edit all user information
  - Change user role and status
  - Update password (optional)
  - Show/hide password toggle
  - Status indicators (active, inactive, suspended)
  - Green "Save Changes" button for confirmation

### 4. **Role and Permission Management**
- Grid/list view of all roles
- Create new custom roles with granular permissions:
  - View Data (ดูข้อมูล)
  - Edit User (แก้ไขผู้ใช้)
  - Manage Cases (จัดการเคส)
  - View Logs (ดูบันทึก)
  - Manage Roles (จัดการสิทธิ์)
  - Delete User (ลบผู้ใช้)
- Visual permission matrix with toggle checkboxes
- Edit and delete buttons for each role (system roles cannot be deleted)
- Permission count badge for quick overview

### 5. **User Activity Log**
- Displays recent user activities:
  - Timestamp (เวลา)
  - User ID (ผู้ใช้)
  - Action (การกระทำ)
  - IP Address
  - Status (success/failure)
- Color-coded status badges
- Automatically updates
- Shows up to 20 most recent activities

### 6. **Security Features**
- "Secured by OonJai System" note
- All actions logged in activity log
- Password hashing with bcryptjs
- Email uniqueness validation
- Role-based permission system
- Delete confirmation dialogs

## API Endpoints

### Users (`/api/users`)
- **GET**: Fetch users with pagination, search, and role filtering
  - Query params: `search`, `limit`, `offset`, `role`
- **POST**: Create new user
  - Body: `{ name, email, phone, password, role }`
- **PUT**: Update user
  - Body: `{ id, name, email, phone, role, status, password (optional) }`
- **DELETE**: Delete user
  - Query param: `id`

### User Activity Log (`/api/users/activity`)
- **GET**: Fetch activity logs with pagination
  - Query params: `limit`, `offset`
- **POST**: Log user activity
  - Body: `{ user_id, action, ip_address, status }`

### Roles (`/api/users/roles`)
- **GET**: Fetch all roles
- **POST**: Create new role
  - Body: `{ name, description, permissions }`
- **PUT**: Update role
  - Body: `{ id, name, description, permissions }`
- **DELETE**: Delete role (system roles protected)
  - Query param: `id`

## Database Tables

### user
- id, name, email, phone, password_hash, role, status, created_at, updated_at

### roles
- id, name, description, permissions (JSON), created_at, updated_at

### user_activity_log
- id, user_id, action, ip_address, status, timestamp

## Setup Instructions

### 1. Database Setup
Execute the SQL schema from `sql/schema.sql`:
```sql
mysql -u root -p oonjai_system < sql/schema.sql
```

### 2. Seed Initial Data
Execute seed data for roles and sample logs:
```sql
mysql -u root -p oonjai_system < sql/seed_user_management.sql
```

### 3. Environment Configuration
Ensure your `.env.local` has:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=oonjai_system
DB_PORT=3306
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Access the Dashboard
Navigate to `http://localhost:3000/(backend)/users`

## Design Highlights

### Anti-gravity IDE Aesthetic
- Clean, minimalist design with ample white space
- Precise alignment and structured data presentation
- Professional dark theme integration
- Clear visual hierarchy

### Responsive Design
- Mobile-friendly layout
- Adaptable table controls
- Touch-friendly buttons and inputs
- Works on tablets and desktops

### Dark Mode Support
- Full dark mode compatibility
- `dark:` Tailwind utility classes throughout
- Consistent color palette

### Accessibility
- Thai language support throughout
- English column headers with Thai translations
- Semantic HTML structure
- Clear button labels and form fields

## User Flows

### Managing Users
1. View all users in the main table
2. Search/filter users as needed
3. Click Edit icon to modify user details
4. Click Delete icon to remove users
5. Changes are saved and reflected in activity log

### Managing Roles
1. View all roles in the grid layout
2. Click "Create New Role" to add custom roles
3. Select permissions from the matrix
4. Edit existing roles or delete custom roles
5. System roles (admin, rescue, victim) are protected

### Monitoring Activity
1. View the User Activity Log section
2. See recent user actions with timestamps
3. Check IP addresses and success/failure status
4. Activity is automatically logged for all user operations

## Key Components

- **UserTable.tsx**: Main user data table with pagination and filters
- **EditUserModal.tsx**: Modal for editing user information
- **RoleManagement.tsx**: Role and permission management interface
- **UserActivityLog.tsx**: Activity log display component
- **Users page.tsx**: Main page integrating all components

## Notes

- All passwords are hashed using bcryptjs before storage
- Activity log entries are automatically created for user operations
- System roles (admin, rescue, victim) cannot be deleted
- Search is case-insensitive and works across multiple fields
- Email must be unique in the system

## Future Enhancements

- Export user data to CSV/Excel
- Bulk user operations
- Advanced filtering with date ranges
- Activity log search and filtering
- Role-based dashboards
- User import from external sources
- Two-factor authentication
