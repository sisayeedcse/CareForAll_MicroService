const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME || "payment_service";
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

async function createPaymentsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      pledge_id BIGINT NULL,
      campaign_id BIGINT NULL,
      user_id BIGINT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      status ENUM('PENDING','SUCCESS','FAILED') DEFAULT 'PENDING',
      transaction_id VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  await createPaymentsTable();
  console.log("Payment database initialized.");
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
