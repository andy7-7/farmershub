const pool = require('../config/db');

const createMessage = async (req, res) => {
  const { animal_id, seller_id, buyer_name, buyer_phone, buyer_email, message } = req.body;

  if (!seller_id || !message) {
    return res.status(400).json({ message: 'Seller and message are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO messages
        (animal_id, seller_id, buyer_id, buyer_name, buyer_phone, buyer_email, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        animal_id || null,
        seller_id,
        req.farmer?.id || null,
        buyer_name || req.farmer?.full_name || null,
        buyer_phone || req.farmer?.phone || null,
        buyer_email || req.farmer?.email || null,
        message
      ]
    );

    res.status(201).json({ message: 'Message sent successfully', contact: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyMessages = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT messages.*, animals.name AS animal_name
       FROM messages
       LEFT JOIN animals ON messages.animal_id = animals.id
       WHERE messages.seller_id = $1 OR messages.buyer_id = $1
       ORDER BY messages.created_at DESC`,
      [req.farmer.id]
    );

    res.json({ messages: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createMessage, getMyMessages };
