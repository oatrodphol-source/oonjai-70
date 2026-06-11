/* eslint-disable @typescript-eslint/no-require-imports */
const mysql = require('mysql2/promise');

async function createAiSettingsTable() {
  try {
    const db = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'oonjai_system',
      port: 3306
    });

    console.log('Creating ai_settings table...');
    const sql = `
      CREATE TABLE IF NOT EXISTS ai_settings (
        id INT PRIMARY KEY DEFAULT 1,
        waterLevelHigh INT DEFAULT 5,
        waterLevelMedium INT DEFAULT 3,
        peopleCountMany INT DEFAULT 5,
        peopleCountFew INT DEFAULT 2,
        bedridden INT DEFAULT 4,
        elderly INT DEFAULT 2,
        severityFactor INT DEFAULT 2,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await db.execute(sql);
    
    // Insert default values if not exists
    const checkSql = `SELECT * FROM ai_settings WHERE id = 1`;
    const [rows] = await db.execute(checkSql);
    
    if (rows.length === 0) {
      console.log('Inserting default ai_settings...');
      const insertSql = `
        INSERT INTO ai_settings (id, waterLevelHigh, waterLevelMedium, peopleCountMany, peopleCountFew, bedridden, elderly, severityFactor)
        VALUES (1, 5, 3, 5, 2, 4, 2, 2)
      `;
      await db.execute(insertSql);
    }

    console.log('Table ai_settings created successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createAiSettingsTable();
