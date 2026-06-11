-- Initialize roles table with default roles
INSERT IGNORE INTO roles (name, description, permissions) VALUES
('admin', 'ผู้ดูแลระบบ - สิทธิ์เต็ม', JSON_OBJECT(
  'view_data', true,
  'edit_user', true,
  'manage_cases', true,
  'view_logs', true,
  'manage_roles', true,
  'delete_user', true
)),
('rescue', 'ทีมช่วยเหลือ - สิทธิ์จำกัด', JSON_OBJECT(
  'view_data', true,
  'edit_user', false,
  'manage_cases', true,
  'view_logs', true,
  'manage_roles', false,
  'delete_user', false
)),
('victim', 'ผู้ใช้ทั่วไป - สิทธิ์พื้นฐาน', JSON_OBJECT(
  'view_data', true,
  'edit_user', false,
  'manage_cases', false,
  'view_logs', false,
  'manage_roles', false,
  'delete_user', false
));

-- Insert sample activity logs for demonstration
INSERT INTO user_activity_log (user_id, action, ip_address, status) VALUES
(1, 'Created User "rescuer1"', '192.168.1.1', 'success'),
(1, 'Edited User "admin"', '192.168.1.1', 'success'),
(2, 'Logged in', '192.168.1.50', 'success'),
(1, 'Deleted Role "super_admin"', '192.168.1.1', 'success'),
(2, 'Updated Case Status', '192.168.1.50', 'success');
