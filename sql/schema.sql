-- OonJai System Database Schema

CREATE TABLE IF NOT EXISTS user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'rescue', 'victim') DEFAULT 'victim',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rescuer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    agency_name VARCHAR(255) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS victim (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    address TEXT,
    medical_condition TEXT,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dispatcher_admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    level INT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT, -- สามารถเป็น null ได้ถ้าแจ้งผ่าน line โดยยังไม่ผูกบัญชี
    reporter_name VARCHAR(255) NOT NULL,
    reporter_phone VARCHAR(20) NOT NULL,
    incident_type VARCHAR(100) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_text TEXT,
    status ENUM('wait', 'accepted', 'in_progress', 'completed', 'cancelled') DEFAULT 'wait',
    severity_level INT DEFAULT 1, -- 1-5
    rescuer_id INT, -- ใครรับเคส
    cancel_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES user(id) ON DELETE SET NULL,
    FOREIGN KEY (rescuer_id) REFERENCES user(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT,
    user_id INT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    device_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS incidentreport (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT,
    people_count INT DEFAULT 1,
    water_level VARCHAR(50),
    bedridden_count INT DEFAULT 0,
    elderly_count INT DEFAULT 0,
    image_url TEXT,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS statusupdate (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    user_id INT, -- ใครเป็นคนอัพเดท
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS geolocation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    calculated_score DECIMAL(5, 2),
    suggested_severity INT,
    factors_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS heatmap (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    intensity INT DEFAULT 1,
    type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_id INT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reportform (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    rescuer_id INT NOT NULL,
    summary TEXT,
    outcome VARCHAR(100), -- ส่งศูนย์พักพิง / ช่วยเหลือเบื้องต้น / ส่ง รพ.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (rescuer_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS help (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    status ENUM('success', 'failure') DEFAULT 'success',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
);
);

CREATE TABLE IF NOT EXISTS log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS frontend (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usermanagement (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    target_user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL, -- เช่น change_role, suspend
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES user(id) ON DELETE CASCADE
);
