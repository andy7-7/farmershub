const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'Uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Image upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  }
});

const animalSelect = `
  animals.*,
  farmers.full_name AS farmer_name,
  farmers.phone,
  farmers.location AS farmer_location,
  farmers.farm_name,
  farmers.region,
  farmers.profile_image_url,
  farmers.membership_id,
  associations.name AS association_name
`;

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const addAnimal = async (req, res) => {
  const {
    name,
    species,
    type,
    breed,
    age,
    price,
    health_status,
    animal_location,
    location,
    description
  } = req.body;

  const animalType = species || type;
  const animalAge = parseNumber(age);
  const animalPrice = parseNumber(price);
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const farmer_id = req.farmer.id;

  if (!name || !animalType || animalPrice === null) {
    return res.status(400).json({ message: 'Animal name, type, and price are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO animals
        (farmer_id, name, species, breed, age, price, description, image_url,
         health_status, animal_location, status, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'available', 'approved')
       RETURNING *`,
      [
        farmer_id,
        name,
        animalType,
        breed || null,
        animalAge,
        animalPrice,
        description || null,
        image_url,
        health_status || 'Healthy',
        animal_location || location || req.farmer.location || null
      ]
    );
    res.status(201).json({
      message: 'Animal listed successfully',
      animal: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllAnimals = async (req, res) => {
  const {
    search,
    type,
    species,
    breed,
    location,
    health_status,
    minPrice,
    maxPrice,
    minAge,
    maxAge,
    status = 'available'
  } = req.query;

  const where = ['animals.approval_status = $1'];
  const params = ['approved'];
  let index = params.length + 1;

  if (status !== 'all') {
    where.push(`animals.status = $${index++}`);
    params.push(status);
  }
  if (search) {
    where.push(`(animals.name ILIKE $${index} OR animals.species ILIKE $${index} OR animals.breed ILIKE $${index} OR animals.description ILIKE $${index})`);
    params.push(`%${search}%`);
    index++;
  }
  if (type || species) {
    where.push(`animals.species ILIKE $${index++}`);
    params.push(`%${type || species}%`);
  }
  if (breed) {
    where.push(`animals.breed ILIKE $${index++}`);
    params.push(`%${breed}%`);
  }
  if (location) {
    where.push(`(animals.animal_location ILIKE $${index} OR farmers.location ILIKE $${index} OR farmers.region ILIKE $${index})`);
    params.push(`%${location}%`);
    index++;
  }
  if (health_status) {
    where.push(`animals.health_status ILIKE $${index++}`);
    params.push(`%${health_status}%`);
  }
  if (parseNumber(minPrice) !== null) {
    where.push(`animals.price >= $${index++}`);
    params.push(parseNumber(minPrice));
  }
  if (parseNumber(maxPrice) !== null) {
    where.push(`animals.price <= $${index++}`);
    params.push(parseNumber(maxPrice));
  }
  if (parseNumber(minAge) !== null) {
    where.push(`animals.age >= $${index++}`);
    params.push(parseNumber(minAge));
  }
  if (parseNumber(maxAge) !== null) {
    where.push(`animals.age <= $${index++}`);
    params.push(parseNumber(maxAge));
  }

  try {
    const result = await pool.query(
      `SELECT ${animalSelect}
       FROM animals
       JOIN farmers ON animals.farmer_id = farmers.id
       LEFT JOIN associations ON farmers.association_id = associations.id
       WHERE farmers.account_status = 'approved' AND ${where.join(' AND ')}
       ORDER BY animals.created_at DESC`,
      params
    );
    res.json({ animals: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAnimalById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${animalSelect}
       FROM animals
       JOIN farmers ON animals.farmer_id = farmers.id
       LEFT JOIN associations ON farmers.association_id = associations.id
       WHERE animals.id = $1 AND farmers.account_status = 'approved'`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Animal not found' });
    }

    res.json({ animal: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyAnimals = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM animals WHERE farmer_id = $1 ORDER BY created_at DESC',
      [req.farmer.id]
    );
    res.json({ animals: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateAnimal = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    species,
    type,
    breed,
    age,
    price,
    health_status,
    animal_location,
    location,
    description,
    status
  } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM animals WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Animal not found' });
    }

    const animal = existing.rows[0];
    if (animal.farmer_id !== req.farmer.id && req.farmer.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this listing' });
    }

    const image_url = req.file ? `/uploads/${req.file.filename}` : animal.image_url;
    const nextStatus = status || animal.status;
    const soldAt = nextStatus === 'sold' && animal.status !== 'sold' ? new Date() : animal.sold_at;

    const result = await pool.query(
      `UPDATE animals
       SET name = $1,
           species = $2,
           breed = $3,
           age = $4,
           price = $5,
           description = $6,
           image_url = $7,
           health_status = $8,
           animal_location = $9,
           status = $10,
           sold_at = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        name || animal.name,
        species || type || animal.species,
        breed !== undefined ? breed : animal.breed,
        parseNumber(age) !== null ? parseNumber(age) : animal.age,
        parseNumber(price) !== null ? parseNumber(price) : animal.price,
        description !== undefined ? description : animal.description,
        image_url,
        health_status || animal.health_status,
        animal_location || location || animal.animal_location,
        nextStatus,
        soldAt,
        id
      ]
    );

    if (nextStatus === 'sold' && animal.status !== 'sold') {
      await pool.query(
        `INSERT INTO sold_records (animal_id, farmer_id, sale_price)
         VALUES ($1, $2, $3)`,
        [id, animal.farmer_id, result.rows[0].price]
      );
    }

    res.json({ message: 'Animal updated successfully', animal: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteAnimal = async (req, res) => {
  const { id } = req.params;
  try {
    const params = req.farmer.role === 'admin' ? [id] : [id, req.farmer.id];
    const query = req.farmer.role === 'admin'
      ? 'DELETE FROM animals WHERE id = $1 RETURNING *'
      : 'DELETE FROM animals WHERE id = $1 AND farmer_id = $2 RETURNING *';

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Animal not found or not authorized' });
    }
    res.json({ message: 'Animal deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  upload,
  addAnimal,
  getAllAnimals,
  getAnimalById,
  getMyAnimals,
  updateAnimal,
  deleteAnimal
};
