const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token, access denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      `SELECT id, full_name, email, phone, location, farm_name, region,
              profile_image_url, farm_description, membership_id,
              association_id, role, account_status, is_suspicious
       FROM farmers
       WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Farmer account no longer exists' });
    }

    if (result.rows[0].role !== 'admin' && result.rows[0].account_status !== 'approved') {
      return res.status(403).json({ message: 'Farmer account is not approved yet' });
    }

    req.farmer = result.rows[0];
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.farmer || req.farmer.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { protect, adminOnly };
