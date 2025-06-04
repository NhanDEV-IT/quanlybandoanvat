const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middleware/auth');

// Routes đăng nhập
router.get('/login', redirectIfAuthenticated, authController.getLogin);
router.post('/login', redirectIfAuthenticated, authController.postLogin);

// Routes đăng ký
router.get('/register', redirectIfAuthenticated, authController.getRegister);
router.post('/register', redirectIfAuthenticated, authController.postRegister);

// Route đăng xuất
router.get('/logout', authController.logout);

module.exports = router; 