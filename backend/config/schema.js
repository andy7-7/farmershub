const pool = require('./db');

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS associations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(160) NOT NULL UNIQUE,
      description TEXT,
      region VARCHAR(120),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO associations (name, description, region)
    VALUES ('Ghana Farmers Animal Traders Association', 'Default association for verified farmer members.', 'Ghana')
    ON CONFLICT (name) DO NOTHING;

    CREATE TABLE IF NOT EXISTS farmers (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(160) NOT NULL,
      email VARCHAR(160) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(60),
      location VARCHAR(160),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS farm_name VARCHAR(180);
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS region VARCHAR(120);
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS farm_description TEXT;
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS membership_id VARCHAR(80);
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS association_id INTEGER REFERENCES associations(id) ON DELETE SET NULL;
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'farmer';
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS account_status VARCHAR(30) DEFAULT 'active';
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false;
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE farmers ALTER COLUMN account_status SET DEFAULT 'pending';

    UPDATE farmers
    SET association_id = (SELECT id FROM associations WHERE name = 'Ghana Farmers Animal Traders Association' LIMIT 1)
    WHERE association_id IS NULL;

    UPDATE farmers SET role = 'farmer' WHERE role IS NULL;
    UPDATE farmers SET account_status = 'approved' WHERE account_status = 'active';
    UPDATE farmers SET account_status = 'pending' WHERE account_status IS NULL;
    UPDATE farmers SET is_suspicious = false WHERE is_suspicious IS NULL;
    UPDATE farmers
    SET role = 'admin'
    WHERE id = (SELECT id FROM farmers ORDER BY created_at ASC LIMIT 1)
      AND NOT EXISTS (SELECT 1 FROM farmers WHERE role = 'admin');

    CREATE UNIQUE INDEX IF NOT EXISTS farmers_membership_id_unique
    ON farmers (membership_id)
    WHERE membership_id IS NOT NULL AND membership_id <> '';

    CREATE TABLE IF NOT EXISTS animals (
      id SERIAL PRIMARY KEY,
      farmer_id INTEGER REFERENCES farmers(id) ON DELETE CASCADE,
      name VARCHAR(160) NOT NULL,
      species VARCHAR(120) NOT NULL,
      breed VARCHAR(120),
      age NUMERIC,
      price NUMERIC NOT NULL,
      description TEXT,
      image_url TEXT,
      status VARCHAR(30) DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE animals ADD COLUMN IF NOT EXISTS health_status VARCHAR(120) DEFAULT 'Healthy';
    ALTER TABLE animals ADD COLUMN IF NOT EXISTS animal_location VARCHAR(160);
    ALTER TABLE animals ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'approved';
    ALTER TABLE animals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE animals ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP;

    UPDATE animals SET status = 'available' WHERE status IS NULL;
    UPDATE animals SET approval_status = 'approved' WHERE approval_status IS NULL;
    UPDATE animals SET health_status = 'Healthy' WHERE health_status IS NULL;

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      animal_id INTEGER REFERENCES animals(id) ON DELETE SET NULL,
      seller_id INTEGER REFERENCES farmers(id) ON DELETE CASCADE,
      buyer_id INTEGER REFERENCES farmers(id) ON DELETE SET NULL,
      buyer_name VARCHAR(160),
      buyer_phone VARCHAR(60),
      buyer_email VARCHAR(160),
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sold_records (
      id SERIAL PRIMARY KEY,
      animal_id INTEGER REFERENCES animals(id) ON DELETE SET NULL,
      farmer_id INTEGER REFERENCES farmers(id) ON DELETE SET NULL,
      sale_price NUMERIC,
      sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS membership_cards (
      id SERIAL PRIMARY KEY,
      farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
      membership_id VARCHAR(80) NOT NULL UNIQUE,
      verification_url TEXT NOT NULL,
      card_data JSONB,
      generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      regenerated_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      farmer_id INTEGER UNIQUE REFERENCES farmers(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO admin_users (farmer_id)
    SELECT id FROM farmers WHERE role = 'admin'
    ON CONFLICT (farmer_id) DO NOTHING;
  `);
};

module.exports = { ensureSchema };
