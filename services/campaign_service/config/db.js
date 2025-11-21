const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT = 3306,
} = process.env;

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
  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Call initDb() first.');
  }
  return pool;
}

module.exports = {
  initDb,
  getPool,
};
