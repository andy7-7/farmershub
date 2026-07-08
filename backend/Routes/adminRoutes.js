const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../Middleware/authMiddleware');
const {
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
} = require('../controllers/adminController');

router.use(protect, adminOnly);

router.get('/stats', getStats);
router.get('/farmers', getFarmers);
router.get('/animals', getAnimals);
router.get('/membership-cards', getMembershipCards);
router.get('/membership-cards/:membershipId', getMembershipCard);
router.post('/farmers/:id/approve', approveFarmer);
router.put('/farmers/:id', updateFarmerDetails);
router.patch('/animals/:id/moderate', moderateAnimal);
router.patch('/farmers/:id/status', updateFarmerStatus);
router.post('/farmers/:farmerId/regenerate-card', regenerateMembershipCard);

module.exports = router;
