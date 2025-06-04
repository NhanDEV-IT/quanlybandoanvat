const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const categoryController = require('../controllers/admin/categoryController');
const dashboardController = require('../controllers/admin/dashboardController');
const upload = require('../config/multer');

// Middleware xác thực cho tất cả routes
router.use(isAuthenticated);
router.use(isAdmin);

// Dashboard
router.get('/dashboard', dashboardController.index);

// Quản lý danh mục
router.get('/categories', categoryController.index);
router.get('/categories/create', categoryController.create);
router.post('/categories', categoryController.store);
router.get('/categories/:id/edit', categoryController.edit);
router.put('/categories/:id', categoryController.update);
router.delete('/categories/:id', categoryController.destroy);

// Đảm bảo route PUT và DELETE cho categories cũng được xử lý qua POST
router.post('/categories/:id', function(req, res, next) {
    if (req.body._method === 'PUT') {
        return categoryController.update(req, res, next);
    }
    if (req.body._method === 'DELETE') {
        return categoryController.destroy(req, res, next);
    }
    // Nếu không, báo lỗi method không được hỗ trợ
    res.status(405).json({ error: 'Method not allowed' });
});

// Quản lý sản phẩm
router.get('/products', productController.getAdminProducts);
router.get('/products/create', productController.getCreateProduct);
router.post('/products', upload.single('image'), productController.createProduct);
router.get('/products/:id/edit', productController.getEditProduct);
router.put('/products/:id', upload.single('image'), productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// Đảm bảo route PUT và DELETE cũng được xử lý qua POST
router.post('/products/:id', upload.single('image'), function(req, res, next) {
    if (req.body._method === 'PUT') {
        return productController.updateProduct(req, res, next);
    }
    if (req.body._method === 'DELETE') {
        return productController.deleteProduct(req, res, next);
    }
    // Nếu không, báo lỗi method không được hỗ trợ
    res.status(405).json({ error: 'Method not allowed' });
});

// Quản lý đơn hàng
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', adminController.getOrderDetail);
router.put('/orders/:id/status', adminController.updateOrderStatus);

// Quản lý người dùng
router.get('/users', adminController.getUsers);
router.get('/users/add', adminController.getAddUser);
router.post('/users', adminController.postAddUser);
router.get('/users/edit/:id', adminController.getEditUser);
router.put('/users/:id', adminController.postEditUser);
router.delete('/users/:id', adminController.deleteUser);

// Đảm bảo route PUT và DELETE cho users cũng được xử lý qua POST
router.post('/users/:id', function(req, res, next) {
    if (req.body._method === 'PUT') {
        return adminController.postEditUser(req, res, next);
    }
    if (req.body._method === 'DELETE') {
        return adminController.deleteUser(req, res, next);
    }
    // Nếu không, báo lỗi method không được hỗ trợ
    res.status(405).json({ error: 'Method not allowed' });
});

module.exports = router;