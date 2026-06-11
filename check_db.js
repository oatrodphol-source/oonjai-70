/* eslint-disable @typescript-eslint/no-require-imports */
const mysql = require('mysql2/promise');

async function checkSchema() {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'oonjai_system',
      port: 3306
    });

    const [rows] = await db.query('SHOW COLUMNS FROM cases');
    console.log("Columns in 'cases' table:");
    console.log(rows);
    try {
      const [aiRows] = await db.query('SHOW COLUMNS FROM ai_settings');
      console.log("Columns in 'ai_settings' table:");
      console.log(aiRows);
    } catch (e) {
      console.log("No ai_settings table");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
