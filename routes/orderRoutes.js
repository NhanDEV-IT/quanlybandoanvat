const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { isAuthenticated } = require('../middleware/auth');

// Trang thành công sau khi đặt hàng (phải đặt trước route có :id)
router.get('/success', isAuthenticated, (req, res) => {
    const success_msg = req.flash('success_msg');
    res.render('orders/success', { success_msg });
});

// Routes đặt hàng - yêu cầu đăng nhập
router.get('/create', isAuthenticated, orderController.getCreateOrder);
router.post('/create', isAuthenticated, orderController.createOrder);

// Route hủy đơn hàng
router.post('/:id/cancel', isAuthenticated, orderController.cancelOrder);

// Routes xem đơn hàng - yêu cầu đăng nhập
router.get('/', isAuthenticated, orderController.getAllOrders);
router.get('/:id', isAuthenticated, orderController.getOrderById);
router.post('/:id/status', isAuthenticated, orderController.updateOrderStatus);

module.exports = router; 