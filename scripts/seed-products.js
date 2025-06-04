const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/category.model');

mongoose.connect('mongodb+srv://nhan123:Nhan123456@cluster0.fsbl6kw.mongodb.net/quanlybandoanvat')
    .then(() => console.log('Đã kết nối MongoDB'))
    .catch(err => console.error('Lỗi kết nối MongoDB:', err));

async function seedProducts() {
    try {
        // Lấy danh sách category
        const categories = await Category.find();
        if (categories.length === 0) {
            console.log('Không tìm thấy danh mục nào. Vui lòng chạy seed-categories.js trước.');
            return;
        }

        // Xóa tất cả sản phẩm cũ
        await Product.deleteMany({});

        // Tạo mảng sản phẩm mẫu
        const products = [
            {
                name: 'Coca Cola',
                description: 'Nước giải khát có gas Coca Cola',
                price: 10000,
                stock: 100,
                category: categories.find(c => c.name === 'Nước giải khát')._id,
                image: '/uploads/products/default.jpg',
                isActive: true
            },
            {
                name: 'Snack Lay\'s',
                description: 'Snack khoai tây Lay\'s vị truyền thống',
                price: 15000,
                stock: 50,
                category: categories.find(c => c.name === 'Snack')._id,
                image: '/uploads/products/default.jpg',
                isActive: true
            },
            {
                name: 'Bánh Oreo',
                description: 'Bánh quy Oreo nhân kem vani',
                price: 20000,
                stock: 75,
                category: categories.find(c => c.name === 'Bánh kẹo')._id,
                image: '/uploads/products/default.jpg',
                isActive: true
            }
        ];

        // Thêm sản phẩm vào database
        const result = await Product.insertMany(products);
        console.log('Đã thêm các sản phẩm:', result);
    } catch (error) {
        console.error('Lỗi khi thêm sản phẩm:', error);
    } finally {
        mongoose.disconnect();
    }
}

seedProducts(); 