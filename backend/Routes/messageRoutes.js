const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { createMessage, getMyMessages } = require('../controllers/messageController');

router.post('/', protect, createMessage);
router.get('/mine', protect, getMyMessages);

module.exports = router;
