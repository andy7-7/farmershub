const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/db');

const uploadDir = path.join(__dirname, '..', 'Uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname || '').toLowerCase();
    cb(null, `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const profileUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  }
});

const farmerFields = `
  farmers.id, farmers.full_name, farmers.email, farmers.phone, farmers.location,
  farmers.farm_name, farmers.region, farmers.profile_image_url,
  farmers.farm_description, farmers.membership_id, farmers.role,
  farmers.account_status, farmers.is_suspicious, farmers.created_at,
  associations.name AS association_name
`;

const getMe = async (req, res) => {
  try {
    const profile = await pool.query(
      `SELECT ${farmerFields}
       FROM farmers
       LEFT JOIN associations ON farmers.association_id = associations.id
       WHERE farmers.id = $1`,
      [req.farmer.id]
    );
    const animals = await pool.query(
      'SELECT * FROM animals WHERE farmer_id = $1 ORDER BY created_at DESC',
      [req.farmer.id]
    );
    res.json({ farmer: profile.rows[0], animals: animals.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateMe = async (req, res) => {
  const {
    full_name,
    phone,
    location,
    farm_name,
    region,
    farm_description
  } = req.body;
  const profile_image_url = req.file ? `/uploads/${req.file.filename}` : req.farmer.profile_image_url;

  try {
    const result = await pool.query(
      `UPDATE farmers
       SET full_name = $1,
           phone = $2,
           location = $3,
           farm_name = $4,
           region = $5,
           farm_description = $6,
           profile_image_url = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, full_name, email, phone, location, farm_name, region,
                 profile_image_url, farm_description, membership_id,
                 association_id, role, account_status, is_suspicious`,
      [
        full_name || req.farmer.full_name,
        phone !== undefined ? phone : req.farmer.phone,
        location !== undefined ? location : req.farmer.location,
        farm_name !== undefined ? farm_name : req.farmer.farm_name,
        region !== undefined ? region : req.farmer.region,
        farm_description !== undefined ? farm_description : req.farmer.farm_description,
        profile_image_url,
        req.farmer.id
      ]
    );

    res.json({ message: 'Profile updated successfully', farmer: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getFarmerById = async (req, res) => {
  try {
    const profile = await pool.query(
      `SELECT ${farmerFields}
       FROM farmers
       LEFT JOIN associations ON farmers.association_id = associations.id
       WHERE farmers.id = $1 AND farmers.account_status = 'approved'`,
      [req.params.id]
    );

    if (profile.rows.length === 0) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    const animals = await pool.query(
      `SELECT * FROM animals
       WHERE farmer_id = $1 AND status = 'available' AND approval_status = 'approved'
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({ farmer: profile.rows[0], animals: animals.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { profileUpload, getMe, updateMe, getFarmerById };
