const { getPool } = require('../config/db');

const idempotencyMiddleware = async (req, res, next) => {
  const key = req.headers['idempotency-key'];

  if (!key) return next(); // If no key, proceed normally

  try {
    const pool = getPool();
    
    // 1. Check if key exists
    const [rows] = await pool.query(
      'SELECT response_json, status_code FROM idempotency_keys WHERE api_key = ?', 
      [key]
    );

    if (rows.length > 0) {
      console.log(`[Idempotency] HIT: Serving cached response for ${key}`);
      return res.status(rows[0].status_code).json(JSON.parse(rows[0].response_json));
    }

    // 2. Hijack res.json to save the response BEFORE sending it back
    const originalSend = res.json;
    res.json = function (body) {
      if (res.statusCode < 500) {
        // Save to DB (Fire and forget promise)
        pool.query(
          'INSERT INTO idempotency_keys (api_key, response_json, status_code) VALUES (?, ?, ?)',
          [key, JSON.stringify(body), res.statusCode]
        ).catch(err => console.error("Failed to save idempotency key", err));
      }
      originalSend.call(this, body);
    };

    next();
  } catch (error) {
    console.error("Idempotency Error:", error);
    next();
  }
};

module.exports = idempotencyMiddleware;