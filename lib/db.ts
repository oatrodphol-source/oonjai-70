import mysql from 'mysql2/promise';

// สร้าง Connection Pool แทนการเปิด connection ใหม่ทุกครั้ง
// เพื่อลด overhead และจัดการ connection อัตโนมัติ
export const db = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'oonjai_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper function เพื่อความสะดวกในการ query
export async function query(sql: string, params: any[] = []) {
  try {
    const [results] = await db.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
