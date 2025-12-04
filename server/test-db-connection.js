require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 5000,
    });

    console.log('✅ Database connection successful');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection failed:');
    console.error(err && err.message ? err.message : err);
    console.error(err);
    process.exit(1);
  }
})();
