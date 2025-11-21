const mysql = require("mysql2/promise");
require("dotenv").config();

const {
  DB_HOST = "localhost",
  DB_USER = "root",
  DB_PASSWORD = "",
  DB_NAME = "pledge_service",
  DB_PORT = 3306,
} = process.env;

let pool;

async function createDatabaseIfNeeded() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: Number(DB_PORT) || 3306,
    multipleStatements: true,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await connection.end();
}

async function createTables() {
  // reuse pool to ensure consistent connection settings
  await pool.query(`
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      api_key VARCHAR(255) UNIQUE NOT NULL,
      response_json TEXT,
      status_code INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS outbox_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      event_type VARCHAR(100),
      payload_json TEXT,
      processed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
}

async function initDB() {
  if (pool) {
    return pool;
  }

  try {
    await createDatabaseIfNeeded();

    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: Number(DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    await createTables();
    console.log("Connected to MySQL and ensured pledge tables exist.");
    return pool;
  } catch (err) {
    console.error("Error initializing database:", err);
    process.exit(1);
  }
}

function getPool() {
  if (!pool) throw new Error("Database not initialized.");
  return pool;
}

module.exports = { initDB, getPool };
