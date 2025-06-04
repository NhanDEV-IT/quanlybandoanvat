const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');

// Get all categories
router.get('/', categoryController.getAllCategories);

// Create new category
router.post('/', categoryController.createCategory);

// Get category by ID
router.get('/:id', categoryController.getCategoryById);

// Update category
router.put('/:id', categoryController.updateCategory);

// Delete category
router.delete('/:id', categoryController.deleteCategory);

module.exports = router; 