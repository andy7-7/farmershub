const express = require('express');
const router = express.Router();
const { protect, approvedFarmerOnly } = require('../Middleware/authMiddleware');
const {
  upload,
  addAnimal,
  getAllAnimals,
  getAnimalById,
  getMyAnimals,
  updateAnimal,
  markAnimalSold,
  deleteAnimal
} = require('../controllers/animalController');

// Public route
router.get('/', getAllAnimals);
router.get('/my-animals', protect, getMyAnimals);
router.patch('/:id/sold', protect, approvedFarmerOnly, markAnimalSold);
router.get('/:id', getAnimalById);

// Protected routes
router.post('/', protect, approvedFarmerOnly, upload.single('image'), addAnimal);
router.put('/:id', protect, approvedFarmerOnly, upload.single('image'), updateAnimal);
router.delete('/:id', protect, approvedFarmerOnly, deleteAnimal);

module.exports = router;
