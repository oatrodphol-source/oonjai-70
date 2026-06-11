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

    const body = {
      name: 'โอ๊ค',
      phone: '4354353133',
      type: 'standby',
      peopleCount: '2', // Notice string from frontend input
      bedridden: true,
      elderly: false,
      waterLevel: 'ปานกลาง',
      details: '',
      latitude: undefined, // Or null if no GPS
      longitude: undefined
    };

    const sql = `
      INSERT INTO cases (
        name, phone, type, severity, peopleCount, bedridden, elderly, waterLevel, latitude, longitude, status, details
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `;

    const [result] = await db.execute(sql, [
      body.name || '-',
      body.phone || '-',
      body.type,
      1,
      body.peopleCount,
      body.bedridden ? 1 : 0,
      body.elderly ? 1 : 0,
      body.waterLevel,
      body.latitude || 0,
      body.longitude || 0,
      'pending',
      body.details || null
    ]);
    
    console.log('Inserted ID:', result.insertId);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
