const STATUS_TO_COLUMN = {
  PENDING: "pending_amount",
  AUTHORIZED: "authorized_amount",
  CAPTURED: "captured_amount",
  FAILED: "failed_amount",
};

function toDecimal(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Number(parsed.toFixed(2));
}

async function ensureRollupRow(db, campaignId) {
  await db.query(
    `INSERT INTO campaign_rollups (campaign_id)
     VALUES (?)
     ON DUPLICATE KEY UPDATE campaign_id = VALUES(campaign_id)`,
    [campaignId]
  );
}

async function syncCampaignCurrentAmount(db, campaignId) {
  await db.query(
    `UPDATE campaigns c
       JOIN campaign_rollups r ON r.campaign_id = c.id
     SET c.current_amount = r.captured_amount
     WHERE c.id = ?`,
    [campaignId]
  );
}

async function applyDelta(db, campaignId, delta = {}) {
  const sets = [];
  const values = [];

  Object.entries(delta).forEach(([column, amount]) => {
    if (amount === 0 || amount === undefined || amount === null) {
      return;
    }
    sets.push(`${column} = ${column} + ?`);
    values.push(amount);
  });

  if (!sets.length) {
    return;
  }

  sets.push("updated_at = NOW()");
  values.push(campaignId);
  await db.query(
    `UPDATE campaign_rollups SET ${sets.join(", ")} WHERE campaign_id = ?`,
    values
  );
}

async function moveAcrossBuckets(db, campaignId, fromStatus, toStatus, amount) {
  const numericAmount = toDecimal(amount);
  if (!numericAmount) {
    return;
  }

  const statements = [];
  const values = [];

  const fromColumn = STATUS_TO_COLUMN[fromStatus];
  const toColumn = STATUS_TO_COLUMN[toStatus];

  if (fromColumn) {
    statements.push(`${fromColumn} = GREATEST(${fromColumn} - ?, 0)`);
    values.push(numericAmount);
  }

  if (toColumn) {
    statements.push(`${toColumn} = ${toColumn} + ?`);
    values.push(numericAmount);
  }

  if (!statements.length) {
    return;
  }

  statements.push("updated_at = NOW()");
  values.push(campaignId);

  await db.query(
    `UPDATE campaign_rollups SET ${statements.join(
      ", "
    )} WHERE campaign_id = ?`,
    values
  );

  if (toColumn === "captured_amount" || fromColumn === "captured_amount") {
    await syncCampaignCurrentAmount(db, campaignId);
  }
}

async function recordDonationHistory(db, entry) {
  const {
    campaign_id,
    pledge_id = null,
    payment_id = null,
    user_id = null,
    amount,
    status,
    source,
    occurred_at = new Date().toISOString(),
    metadata = null,
  } = entry;

  await db.query(
    `INSERT INTO donation_history (
       campaign_id,
       pledge_id,
       payment_id,
       user_id,
       amount,
       status,
       source,
       occurred_at,
       metadata_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      campaign_id,
      pledge_id,
      payment_id,
      user_id,
      toDecimal(amount),
      status,
      source,
      occurred_at,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
}

module.exports = {
  ensureRollupRow,
  syncCampaignCurrentAmount,
  applyDelta,
  moveAcrossBuckets,
  recordDonationHistory,
  STATUS_TO_COLUMN,
  toDecimal,
};
