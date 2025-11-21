const mysql = require('mysql2/promise');
require('dotenv').config();

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;

let pool;

async function initDB() {
  try {
    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD || '',
      database: DB_NAME,
      port: DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();
    
    console.log('Connected to MySQL.');

    // 1. Create Pledges Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pledges (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        campaign_id BIGINT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status ENUM('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED') DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 2. Create Idempotency Table (The Shield against double charges)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        api_key VARCHAR(255) UNIQUE NOT NULL, 
        response_json TEXT,
        status_code INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 3. Create Outbox Table (The Guarantee for data consistency)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS outbox_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(100),
        payload_json TEXT,
        processed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    console.log('All tables initialized successfully.');
    connection.release();

  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

function getPool() {
  if (!pool) throw new Error('Database not initialized.');
  return pool;
}

module.exports = { initDB, getPool };