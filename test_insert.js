/* eslint-disable @typescript-eslint/no-require-imports */
const mysql = require('mysql2/promise');

async function test() {
  try {
    const db = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'oonjai_system',
      port: 3306
    });

    const sql = 'INSERT INTO cases (userId, type, severity, victimCount, bedridden, elderlyOrChild, waterLevel, lat, lng, status, additionalInfo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

    const [result] = await db.execute(sql, [
      1, 'evacuation', 1, 1, 1, 0, 'low', 0, 0, 'pending', 'test details'
    ]);
    console.log('Inserted ID:', result.insertId);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
