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
      event_key CHAR(36) UNIQUE,
      event_type VARCHAR(100),
      payload_json TEXT,
      status ENUM('PENDING','DELIVERED','FAILED') DEFAULT 'PENDING',
      attempts INT DEFAULT 0,
      next_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_error TEXT,
      delivered_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await pool.query(
    `ALTER TABLE outbox_events
       ADD COLUMN IF NOT EXISTS event_key CHAR(36) NULL,
       ADD COLUMN IF NOT EXISTS status ENUM('PENDING','DELIVERED','FAILED') DEFAULT 'PENDING',
       ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0,
       ADD COLUMN IF NOT EXISTS next_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       ADD COLUMN IF NOT EXISTS last_error TEXT,
       ADD COLUMN IF NOT EXISTS delivered_at DATETIME NULL,
       ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
  );

  // Ensure legacy rows get unique event keys before we enforce constraints
  const [missingKeys] = await pool.query(
    "SELECT id FROM outbox_events WHERE event_key IS NULL OR event_key = ''"
  );

  for (const row of missingKeys) {
    await pool.query(
      "UPDATE outbox_events SET event_key = UUID() WHERE id = ?",
      [row.id]
    );
  }

  const [duplicateKeys] = await pool.query(`
    SELECT event_key
      FROM outbox_events
     WHERE event_key IS NOT NULL AND event_key <> ''
  GROUP BY event_key
    HAVING COUNT(*) > 1
  `);

  for (const { event_key } of duplicateKeys) {
    const [rows] = await pool.query(
      "SELECT id FROM outbox_events WHERE event_key = ? ORDER BY id ASC",
      [event_key]
    );

    const [, ...duplicates] = rows;
    for (const duplicate of duplicates) {
      await pool.query(
        "UPDATE outbox_events SET event_key = UUID() WHERE id = ?",
        [duplicate.id]
      );
    }
  }

  await pool.query(
    `ALTER TABLE outbox_events
      MODIFY COLUMN event_key CHAR(36) NOT NULL,
       MODIFY COLUMN event_type VARCHAR(100) NOT NULL,
       MODIFY COLUMN payload_json TEXT NOT NULL`
  );

  await pool.query("ALTER TABLE outbox_events DROP COLUMN IF EXISTS processed");

  try {
    await pool.query(
      "ALTER TABLE outbox_events ADD UNIQUE KEY event_key_unique (event_key)"
    );
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME") {
      throw error;
    }
  }
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
