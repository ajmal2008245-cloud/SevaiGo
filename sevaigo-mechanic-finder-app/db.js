const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL connection pool configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'login_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper function to test MySQL connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database:', process.env.DB_NAME || 'login_db');
    connection.release();
    return true;
  } catch (error) {
    console.warn('⚠️ MySQL connection notice:', error.message);
    return false;
  }
}

// Helper to auto-create database and users table in MySQL if needed
async function initMySQLSchema() {
  try {
    const rootConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'login_db'}\`;`);
    await rootConn.end();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('✅ MySQL schema initialized (users table ready in login_db)');
    return true;
  } catch (err) {
    console.warn('⚠️ Could not auto-initialize MySQL schema (is MySQL/XAMPP running?):', err.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  initMySQLSchema,
};
