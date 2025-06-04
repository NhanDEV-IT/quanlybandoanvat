const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const productController = require('../controllers/productController');
const upload = require('../config/multer');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/category/:categoryId', productController.getAllProducts);
router.get('/detail/:id', productController.getProductById);

// Admin routes
router.get('/admin', isAuthenticated, isAdmin, productController.getAdminProducts);
router.get('/admin/create', isAuthenticated, isAdmin, productController.getCreateProduct);
router.post('/admin', isAuthenticated, isAdmin, upload.single('image'), productController.createProduct);
router.get('/admin/:id/edit', isAuthenticated, isAdmin, productController.getEditProduct);
router.put('/admin/:id', isAuthenticated, isAdmin, upload.single('image'), productController.updateProduct);
router.delete('/admin/:id', isAuthenticated, isAdmin, productController.deleteProduct);

module.exports = router; 