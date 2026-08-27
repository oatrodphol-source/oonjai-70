/* eslint-disable @typescript-eslint/no-require-imports */
const mysql = require('mysql2/promise');

async function createTable() {
  try {
    const db = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'oonjai_system',
      port: 3306
    });

    console.log('Dropping existing cases table...');
    await db.execute('SET FOREIGN_KEY_CHECKS = 0');
    await db.execute('DROP TABLE IF EXISTS cases');
    await db.execute('SET FOREIGN_KEY_CHECKS = 1');

    const sql = `
      CREATE TABLE cases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL COMMENT 'ชื่อ-นามสกุล',
        phone VARCHAR(20) NOT NULL COMMENT 'เบอร์โทรศัพท์',
        type VARCHAR(100) NOT NULL COMMENT 'ประเภทภัยพิบัติ',
        peopleCount INT DEFAULT 1 COMMENT 'จำนวนผู้ประสบภัย',
        waterLevel VARCHAR(50) COMMENT 'ระดับน้ำ',
        bedridden BOOLEAN DEFAULT FALSE COMMENT 'มีผู้ป่วยติดเตียง',
        elderly BOOLEAN DEFAULT FALSE COMMENT 'มีเด็ก/ผู้สูงอายุ',
        latitude DECIMAL(10,8) COMMENT 'ละติจูด',
        longitude DECIMAL(11,8) COMMENT 'ลองจิจูด',
        image_url VARCHAR(255) NULL COMMENT 'ที่เก็บรูปภาพ',
        details TEXT NULL COMMENT 'ข้อมูลเพิ่มเติม / หมายเหตุ',
        status ENUM('pending', 'traveling', 'assisting', 'completed', 'cancelled') DEFAULT 'pending' COMMENT 'สถานะ',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'เวลาแจ้งเหตุ',
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    console.log('Creating new cases table...');
    await db.execute(sql);
    console.log('Table cases created successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
createTable();
