const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const {
  upload,
  addAnimal,
  getAllAnimals,
  getAnimalById,
  getMyAnimals,
  updateAnimal,
  deleteAnimal
} = require('../controllers/animalController');

// Public route
router.get('/', getAllAnimals);
router.get('/my-animals', protect, getMyAnimals);
router.get('/:id', getAnimalById);

// Protected routes
router.post('/', protect, upload.single('image'), addAnimal);
router.put('/:id', protect, upload.single('image'), updateAnimal);
router.delete('/:id', protect, deleteAnimal);

module.exports = router;
