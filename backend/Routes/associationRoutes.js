const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { getMyAssociation } = require('../controllers/associationController');

router.get('/mine', protect, getMyAssociation);

module.exports = router;
