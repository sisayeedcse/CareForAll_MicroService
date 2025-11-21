const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME || "campaign_service";
const DB_PORT = Number(process.env.DB_PORT) || 3306;

let pool;

async function createDatabaseIfNeeded() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    multipleStatements: true,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await connection.end();
}

async function createCampaignsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS campaigns (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      owner_id BIGINT,
      title VARCHAR(255),
      description TEXT,
      goal_amount DECIMAL(12,2),
      current_amount DECIMAL(12,2) DEFAULT 0,
      status ENUM('draft','active','closed') DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await pool.query(createTableSQL);
}

async function createReadModelTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaign_rollups (
      campaign_id BIGINT PRIMARY KEY,
      pending_amount DECIMAL(12,2) DEFAULT 0,
      authorized_amount DECIMAL(12,2) DEFAULT 0,
      captured_amount DECIMAL(12,2) DEFAULT 0,
      failed_amount DECIMAL(12,2) DEFAULT 0,
      total_pledges INT DEFAULT 0,
      total_payments INT DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS donation_history (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      campaign_id BIGINT NOT NULL,
      pledge_id BIGINT NULL,
      payment_id BIGINT NULL,
      user_id BIGINT NULL,
      amount DECIMAL(12,2) NOT NULL,
      status VARCHAR(50),
      source VARCHAR(50),
      occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata_json TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_campaign_id (campaign_id)
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaign_event_log (
      event_id CHAR(36) PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      source_service VARCHAR(100),
      payload_json TEXT,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
}

async function initDb() {
  if (pool) {
    return pool;
  }

  await createDatabaseIfNeeded();

  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  await createCampaignsTable();
  await createReadModelTables();
  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error(
      "Database pool has not been initialized. Call initDb() first."
    );
  }
  return pool;
}

module.exports = {
  initDb,
  getPool,
};
