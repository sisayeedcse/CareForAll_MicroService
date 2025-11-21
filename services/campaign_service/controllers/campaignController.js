const { getPool } = require('../config/db');

const VALID_STATUSES = ['draft', 'active', 'closed'];

function parseAmount(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const num = Number(value);
  if (Number.isNaN(num)) {
    return NaN;
  }

  return Number(num.toFixed(2));
}

async function fetchCampaignOwner(campaignId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT owner_id FROM campaigns WHERE id = ?', [campaignId]);
  return rows[0];
}

async function createCampaign(req, res) {
  const pool = getPool();
  const { title, description, goal_amount } = req.body;
  const ownerId = req.user?.id;

  if (!ownerId) {
    return res.status(401).json({ message: 'Missing authenticated user context' });
  }

  if (!title || !description || goal_amount === undefined) {
    return res.status(400).json({ message: 'title, description, and goal_amount are required' });
  }

  const parsedGoal = parseAmount(goal_amount);
  if (Number.isNaN(parsedGoal) || parsedGoal <= 0) {
    return res.status(400).json({ message: 'goal_amount must be a positive number' });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO campaigns (owner_id, title, description, goal_amount)
       VALUES (?, ?, ?, ?)`,
      [ownerId, title, description, parsedGoal]
    );

    const [rows] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Failed to create campaign:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getCampaigns(req, res) {
  const pool = getPool();

  try {
    const [rows] = await pool.query('SELECT * FROM campaigns ORDER BY created_at DESC');
    return res.json(rows);
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getCampaignById(req, res) {
  const pool = getPool();
  const { id } = req.params;

  try {
    const [rows] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('Failed to fetch campaign:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateCampaign(req, res) {
  const pool = getPool();
  const { id } = req.params;
  const ownerId = req.user?.id;
  const { title, description, goal_amount, status } = req.body;

  if (!ownerId) {
    return res.status(401).json({ message: 'Missing authenticated user context' });
  }

  try {
    const existing = await fetchCampaignOwner(id);
    if (!existing) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (existing.owner_id !== ownerId) {
      return res.status(403).json({ message: 'You do not own this campaign' });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (goal_amount !== undefined) {
      const parsedGoal = parseAmount(goal_amount);
      if (Number.isNaN(parsedGoal) || parsedGoal <= 0) {
        return res.status(400).json({ message: 'goal_amount must be a positive number' });
      }
      updates.push('goal_amount = ?');
      values.push(parsedGoal);
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      updates.push('status = ?');
      values.push(status);
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    values.push(id, ownerId);
    await pool.query(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = ? AND owner_id = ?`, values);

    const [rows] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    return res.json(rows[0]);
  } catch (error) {
    console.error('Failed to update campaign:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteCampaign(req, res) {
  const pool = getPool();
  const { id } = req.params;
  const ownerId = req.user?.id;

  if (!ownerId) {
    return res.status(401).json({ message: 'Missing authenticated user context' });
  }

  try {
    const existing = await fetchCampaignOwner(id);
    if (!existing) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (existing.owner_id !== ownerId) {
      return res.status(403).json({ message: 'You do not own this campaign' });
    }

    await pool.query('DELETE FROM campaigns WHERE id = ? AND owner_id = ?', [id, ownerId]);
    return res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Failed to delete campaign:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
};
