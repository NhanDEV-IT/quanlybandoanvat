const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/auth');

// Tất cả các routes này đều yêu cầu đăng nhập
router.use(isAuthenticated);

// Xem thông tin tài khoản
router.get('/profile', userController.getProfile);

// Chỉnh sửa thông tin tài khoản
router.get('/profile/edit', userController.getEditProfile);
router.post('/profile/update', userController.updateProfile);

module.exports = router; 