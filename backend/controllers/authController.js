const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const publicFarmerFields = `
  id, full_name, email, phone, location, farm_name, region,
  profile_image_url, farm_description, membership_id,
  association_id, role, account_status, is_suspicious
`;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const issueToken = (farmer) => jwt.sign(
  { id: farmer.id, email: farmer.email, role: farmer.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// REGISTER
const register = async (req, res) => {
  const {
    full_name,
    email,
    password,
    phone,
    location,
    farm_name,
    region,
    farm_description,
    association_name
  } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({
      message: 'Full name, email, and password are required'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const cleanEmail = normalizeEmail(email);

  try {
    const userExists = await pool.query(
      'SELECT id FROM farmers WHERE email = $1',
      [cleanEmail]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const associationName = String(association_name || 'Ghana Farmers Animal Traders Association').trim();
    const association = await pool.query(
      `INSERT INTO associations (name)
       VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [associationName]
    );

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO farmers
        (full_name, email, password, phone, location, farm_name, region,
         farm_description, membership_id, association_id, role, account_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, 'farmer', 'pending')
       RETURNING ${publicFarmerFields}`,
      [
        full_name,
        cleanEmail,
        hashedPassword,
        phone || null,
        location || null,
        farm_name || null,
        region || location || null,
        farm_description || null,
        association.rows[0].id
      ]
    );

    res.status(201).json({
      message: 'Farmer registered successfully',
      farmer: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// LOGIN
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM farmers
       WHERE email = $1`,
      [normalizeEmail(email)]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const farmer = result.rows[0];
    const isMatch = await bcrypt.compare(password, farmer.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (farmer.role !== 'admin' && farmer.account_status !== 'approved') {
      return res.status(403).json({ message: 'This farmer account is awaiting admin approval' });
    }

    const safeFarmer = {};
    publicFarmerFields.replace(/\s/g, '').split(',').forEach((field) => {
      safeFarmer[field] = farmer[field];
    });

    res.json({
      message: 'Login successful',
      token: issueToken(farmer),
      farmer: safeFarmer
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM farmers WHERE email = $1', [normalizeEmail(email)]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid admin credentials' });
    }

    const farmer = result.rows[0];
    const isMatch = await bcrypt.compare(password, farmer.password);
    if (!isMatch || farmer.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const safeFarmer = {};
    publicFarmerFields.replace(/\s/g, '').split(',').forEach((field) => {
      safeFarmer[field] = farmer[field];
    });

    res.json({
      message: 'Admin login successful',
      token: issueToken(farmer),
      farmer: safeFarmer
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { register, login, adminLogin };
