const pool = require('../config/db');

const getMyAssociation = async (req, res) => {
  try {
    const association = await pool.query(
      `SELECT * FROM associations WHERE id = $1`,
      [req.farmer.association_id]
    );

    if (association.rows.length === 0) {
      return res.status(404).json({ message: 'Association not found' });
    }

    const members = await pool.query(
      `SELECT id, full_name, farm_name, region, location, phone,
              membership_id, profile_image_url, account_status, created_at
       FROM farmers
       WHERE association_id = $1 AND account_status = 'approved'
       ORDER BY full_name ASC`,
      [req.farmer.association_id]
    );

    res.json({ association: association.rows[0], members: members.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getMyAssociation };
