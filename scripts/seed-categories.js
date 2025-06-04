const mongoose = require('mongoose');
const Category = require('../models/category.model');

mongoose.connect('mongodb+srv://nhan123:Nhan123456@cluster0.fsbl6kw.mongodb.net/quanlybandoanvat')
    .then(() => console.log('Đã kết nối MongoDB'))
    .catch(err => console.error('Lỗi kết nối MongoDB:', err));

const categories = [
    {
        name: 'Bánh kẹo',
        description: 'Các loại bánh kẹo, snack ngọt'
    },
    {
        name: 'Nước giải khát',
        description: 'Các loại nước uống giải khát'
    },
    {
        name: 'Snack',
        description: 'Các loại snack mặn'
    },
    {
        name: 'Khác',
        description: 'Các sản phẩm khác'
    }
];

async function seedCategories() {
    try {
        // Xóa tất cả danh mục cũ
        console.log('Xóa danh mục cũ...');
        await Category.deleteMany({});
        
        // Thêm từng danh mục một để đảm bảo middleware hoạt động đúng
        console.log('Thêm danh mục mới...');
        const results = [];
        for (const category of categories) {
            const newCategory = new Category(category);
            const result = await newCategory.save();
            results.push(result);
        }
        
        console.log('Đã thêm các danh mục:', results);
    } catch (error) {
        console.error('Lỗi khi thêm danh mục:', error);
    } finally {
        await mongoose.disconnect();
    }
}

// Thêm .catch để xem lỗi nếu có
seedCategories().catch(console.error); 