const pool = require('../config/db');

const getBaseUrl = (req) => process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}`;

const generateMembershipId = async () => {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT membership_id
     FROM farmers
     WHERE membership_id LIKE $1
     ORDER BY membership_id DESC
     LIMIT 1`,
    [`FH-${year}-%`]
  );

  const lastNumber = result.rows.length
    ? Number(result.rows[0].membership_id.split('-').pop())
    : 0;

  return `FH-${year}-${String(lastNumber + 1).padStart(4, '0')}`;
};

const generateMembershipIdWithClient = async (client) => {
  const year = new Date().getFullYear();
  await client.query('SELECT pg_advisory_xact_lock($1)', [20260001]);
  const result = await client.query(
    `SELECT membership_id
     FROM farmers
     WHERE membership_id LIKE $1
     ORDER BY membership_id DESC
     LIMIT 1`,
    [`FH-${year}-%`]
  );
  const lastNumber = result.rows.length
    ? Number(result.rows[0].membership_id.split('-').pop())
    : 0;
  return `FH-${year}-${String(lastNumber + 1).padStart(4, '0')}`;
};

const buildCardData = (farmer, verificationUrl) => ({
  logo: 'FarmersHub',
  full_name: farmer.full_name,
  farm_name: farmer.farm_name,
  phone: farmer.phone,
  region: farmer.region,
  location: farmer.location,
  membership_id: farmer.membership_id,
  approval_date: farmer.approved_at,
  status: 'Verified',
  verification_url: verificationUrl
});

const getStats = async (req, res) => {
  try {
    const [
      farmers,
      pendingFarmers,
      approvedFarmers,
      suspendedFarmers,
      rejectedFarmers,
      totalAnimals,
      soldAnimals,
      activeListings,
      marketplaceValue,
      categories
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM farmers'),
      pool.query("SELECT COUNT(*)::int AS count FROM farmers WHERE account_status = 'pending'"),
      pool.query("SELECT COUNT(*)::int AS count FROM farmers WHERE account_status = 'approved'"),
      pool.query("SELECT COUNT(*)::int AS count FROM farmers WHERE account_status = 'suspended'"),
      pool.query("SELECT COUNT(*)::int AS count FROM farmers WHERE account_status = 'rejected'"),
      pool.query('SELECT COUNT(*)::int AS count FROM animals'),
      pool.query("SELECT COUNT(*)::int AS count FROM animals WHERE status = 'sold'"),
      pool.query("SELECT COUNT(*)::int AS count FROM animals WHERE status = 'available'"),
      pool.query("SELECT COALESCE(SUM(price), 0)::numeric AS value FROM animals WHERE status = 'available'"),
      pool.query(
        `SELECT species, COUNT(*)::int AS count, COALESCE(SUM(price), 0)::numeric AS value
         FROM animals
         GROUP BY species
         ORDER BY count DESC
         LIMIT 8`
      )
    ]);

    res.json({
      stats: {
        totalFarmers: farmers.rows[0].count,
        pendingApprovals: pendingFarmers.rows[0].count,
        approvedMembers: approvedFarmers.rows[0].count,
        suspendedMembers: suspendedFarmers.rows[0].count,
        rejectedMembers: rejectedFarmers.rows[0].count,
        totalAnimals: totalAnimals.rows[0].count,
        soldAnimals: soldAnimals.rows[0].count,
        activeListings: activeListings.rows[0].count,
        marketplaceValue: Number(marketplaceValue.rows[0].value || 0),
        topCategories: categories.rows
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getFarmers = async (req, res) => {
  const { status } = req.query;
  const allowedStatuses = ['pending', 'approved', 'suspended', 'rejected'];
  const params = [];
  const where = [];

  if (status && allowedStatuses.includes(status)) {
    params.push(status);
    where.push(`farmers.account_status = $${params.length}`);
  }

  try {
    const result = await pool.query(
      `SELECT farmers.id, farmers.full_name, farmers.email, farmers.phone,
              farmers.location, farmers.farm_name, farmers.region,
              farmers.membership_id, farmers.role, farmers.account_status,
              farmers.verified, farmers.is_suspicious, farmers.approved_at, farmers.farm_description,
              farmers.profile_image_url, farmers.created_at,
              associations.name AS association_name,
              membership_cards.id AS card_id,
              membership_cards.verification_url,
              COUNT(animals.id)::int AS listings_count
       FROM farmers
       LEFT JOIN associations ON farmers.association_id = associations.id
       LEFT JOIN membership_cards ON membership_cards.farmer_id = farmers.id
       LEFT JOIN animals ON animals.farmer_id = farmers.id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       GROUP BY farmers.id, associations.name, membership_cards.id, membership_cards.verification_url
       ORDER BY
         CASE farmers.account_status
           WHEN 'pending' THEN 1
           WHEN 'approved' THEN 2
           WHEN 'suspended' THEN 3
           ELSE 4
         END,
         farmers.created_at DESC`,
      params
    );
    res.json({ farmers: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAnimals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT animals.*, farmers.full_name AS farmer_name, farmers.membership_id
       FROM animals
       JOIN farmers ON animals.farmer_id = farmers.id
       ORDER BY animals.created_at DESC`
    );
    res.json({ animals: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const moderateAnimal = async (req, res) => {
  const { id } = req.params;
  const { approval_status } = req.body;
  const allowed = ['approved', 'rejected', 'pending'];

  if (!allowed.includes(approval_status)) {
    return res.status(400).json({ message: 'Invalid approval status' });
  }

  try {
    const result = await pool.query(
      `UPDATE animals
       SET approval_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [approval_status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Animal not found' });
    }

    res.json({ message: 'Listing moderation updated', animal: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateFarmerStatus = async (req, res) => {
  const { id } = req.params;
  let { account_status, is_suspicious } = req.body;
  const allowed = ['pending', 'approved', 'suspended', 'rejected'];

  if (account_status === 'active') account_status = 'approved';

  if (account_status === 'approved') {
    return res.status(400).json({
      message: 'Use the approve endpoint so a membership ID and card are generated'
    });
  }

  if (account_status && !allowed.includes(account_status)) {
    return res.status(400).json({ message: 'Invalid account status' });
  }

  try {
    const existing = await pool.query('SELECT * FROM farmers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    const result = await pool.query(
      `UPDATE farmers
       SET account_status = $1,
           verified = CASE WHEN $1 = 'approved' THEN true ELSE false END,
           is_suspicious = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, full_name, email, account_status, verified, is_suspicious`,
      [
        account_status || existing.rows[0].account_status,
        is_suspicious !== undefined ? is_suspicious : existing.rows[0].is_suspicious,
        id
      ]
    );

    res.json({ message: 'Farmer status updated', farmer: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const approveFarmer = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM farmers WHERE id = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Farmer not found' });
    }

    let membershipId = existing.rows[0].membership_id;
    if (!membershipId) {
      let unique = false;
      while (!unique) {
        membershipId = await generateMembershipIdWithClient(client);
        const duplicate = await client.query('SELECT id FROM farmers WHERE membership_id = $1', [membershipId]);
        unique = duplicate.rows.length === 0;
      }
    }

    const farmerResult = await client.query(
      `UPDATE farmers
       SET account_status = 'approved',
           verified = true,
           membership_id = $1,
           approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [membershipId, id]
    );

    const farmer = farmerResult.rows[0];
    const verificationUrl = `${getBaseUrl(req)}/verify/${encodeURIComponent(farmer.membership_id)}`;
    const cardData = buildCardData(farmer, verificationUrl);

    const cardResult = await client.query(
      `INSERT INTO membership_cards (farmer_id, membership_id, verification_url, card_data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (membership_id)
       DO UPDATE SET card_data = EXCLUDED.card_data,
                     verification_url = EXCLUDED.verification_url,
                     regenerated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [farmer.id, farmer.membership_id, verificationUrl, cardData]
    );

    await client.query('COMMIT');
    res.json({ message: 'Farmer approved and card generated', farmer, card: cardResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
};

const updateFarmerDetails = async (req, res) => {
  const { id } = req.params;
  const { full_name, farm_name, phone, email, location, region, farm_description } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM farmers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    const farmer = existing.rows[0];
    const result = await pool.query(
      `UPDATE farmers
       SET full_name = $1,
           farm_name = $2,
           phone = $3,
           email = $4,
           location = $5,
           region = $6,
           farm_description = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, full_name, farm_name, phone, email, location, region, farm_description,
                 membership_id, account_status, approved_at`,
      [
        full_name || farmer.full_name,
        farm_name !== undefined ? farm_name : farmer.farm_name,
        phone !== undefined ? phone : farmer.phone,
        email || farmer.email,
        location !== undefined ? location : farmer.location,
        region !== undefined ? region : farmer.region,
        farm_description !== undefined ? farm_description : farmer.farm_description,
        id
      ]
    );

    res.json({ message: 'Farmer details updated', farmer: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMembershipCards = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT membership_cards.*, farmers.full_name, farmers.farm_name, farmers.phone,
              farmers.region, farmers.location, farmers.account_status, farmers.approved_at
       FROM membership_cards
       JOIN farmers ON farmers.id = membership_cards.farmer_id
       ORDER BY membership_cards.generated_at DESC`
    );
    res.json({ cards: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMembershipCard = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT membership_cards.*, farmers.full_name, farmers.farm_name, farmers.phone,
              farmers.region, farmers.location, farmers.account_status, farmers.approved_at
       FROM membership_cards
       JOIN farmers ON farmers.id = membership_cards.farmer_id
       WHERE membership_cards.membership_id = $1`,
      [req.params.membershipId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Membership card not found' });
    }

    res.json({ card: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const regenerateMembershipCard = async (req, res) => {
  try {
    const farmerResult = await pool.query('SELECT * FROM farmers WHERE id = $1', [req.params.farmerId]);
    if (farmerResult.rows.length === 0 || !farmerResult.rows[0].membership_id) {
      return res.status(404).json({ message: 'Approved farmer with membership ID not found' });
    }

    const farmer = farmerResult.rows[0];
    const verificationUrl = `${getBaseUrl(req)}/verify/${encodeURIComponent(farmer.membership_id)}`;
    const cardData = buildCardData(farmer, verificationUrl);
    const result = await pool.query(
      `INSERT INTO membership_cards (farmer_id, membership_id, verification_url, card_data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (membership_id)
       DO UPDATE SET card_data = EXCLUDED.card_data,
                     verification_url = EXCLUDED.verification_url,
                     regenerated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [farmer.id, farmer.membership_id, verificationUrl, cardData]
    );

    res.json({ message: 'Membership card regenerated', card: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getStats,
  getFarmers,
  getAnimals,
  moderateAnimal,
  updateFarmerStatus,
  approveFarmer,
  updateFarmerDetails,
  getMembershipCards,
  getMembershipCard,
  regenerateMembershipCard
};
