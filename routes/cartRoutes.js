const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Hiển thị giỏ hàng
router.get('/', async (req, res) => {
    res.render('cart/index');
});

// API để lấy thông tin sản phẩm cho giỏ hàng
router.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router; 