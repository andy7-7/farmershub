const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const {
  profileUpload,
  getMe,
  updateMe,
  getFarmerById
} = require('../controllers/farmerController');

router.get('/me', protect, getMe);
router.put('/me', protect, profileUpload.single('profile_image'), updateMe);
router.get('/:id', getFarmerById);

module.exports = router;
