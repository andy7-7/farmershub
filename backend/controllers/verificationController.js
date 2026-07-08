const pool = require('../config/db');

const getVerification = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT full_name, farm_name, membership_id, region, location, account_status, approved_at
       FROM farmers
       WHERE membership_id = $1`,
      [req.params.membershipId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        verified: false,
        status: 'Not Found',
        message: 'Membership ID was not found'
      });
    }

    const farmer = result.rows[0];
    res.json({
      verified: farmer.account_status === 'approved',
      status: farmer.account_status === 'approved' ? 'Verified' : farmer.account_status,
      farmer
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const renderVerificationPage = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT full_name, farm_name, membership_id, region, location, account_status, approved_at
       FROM farmers
       WHERE membership_id = $1`,
      [req.params.membershipId]
    );

    const farmer = result.rows[0];
    const found = Boolean(farmer);
    const verified = found && farmer.account_status === 'approved';
    const status = !found ? 'Not Found' : verified ? 'Verified' : farmer.account_status;

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FarmersHub Verification</title>
  <style>
    body { margin:0; min-height:100vh; display:grid; place-items:center; background:#031614; color:#f3fffb; font-family:Arial,sans-serif; }
    .card { width:min(92vw,520px); padding:32px; border:1px solid rgba(67,242,143,.36); border-radius:24px; background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.04)); box-shadow:0 26px 90px rgba(0,0,0,.48),0 0 70px rgba(40,220,232,.14); backdrop-filter:blur(24px); }
    .badge { display:inline-flex; padding:8px 14px; border-radius:999px; background:${verified ? 'rgba(67,242,143,.14)' : 'rgba(255,95,111,.14)'}; color:${verified ? '#9dffc4' : '#ffd5da'}; font-weight:800; }
    h1 { margin:18px 0 8px; font-size:34px; }
    p { color:rgba(227,255,248,.72); line-height:1.6; }
    strong { color:#fff; }
  </style>
</head>
<body>
  <main class="card">
    <div class="badge">${status}</div>
    <h1>${found ? farmer.full_name : 'Membership Not Found'}</h1>
    <p><strong>Farm:</strong> ${found ? farmer.farm_name || 'Not set' : '-'}</p>
    <p><strong>Membership ID:</strong> ${req.params.membershipId}</p>
    <p><strong>Region:</strong> ${found ? farmer.region || 'Not set' : '-'}</p>
    <p><strong>Location:</strong> ${found ? farmer.location || 'Not set' : '-'}</p>
    <p>This page verifies FarmersHub association membership status in real time.</p>
  </main>
</body>
</html>`);
  } catch (error) {
    res.status(500).send('Verification error');
  }
};

module.exports = { getVerification, renderVerificationPage };
