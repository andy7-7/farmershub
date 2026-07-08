const express = require('express');
const router = express.Router();
const { getVerification } = require('../controllers/verificationController');

router.get('/:membershipId', getVerification);

module.exports = router;
