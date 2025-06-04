const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect('mongodb+srv://nhan123:Nhan123456@cluster0.fsbl6kw.mongodb.net/quanlybandoanvat', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Đã kết nối MongoDB thành công');
    createDefaultAdmin();
})
.catch(err => {
    console.log('Lỗi kết nối MongoDB:', err);
    process.exit(1);
});

async function createDefaultAdmin() {
    try {
        // Kiểm tra xem đã có admin chưa
        const adminExists = await User.findOne({ username: 'admin' });
        if (adminExists) {
            console.log('Tài khoản admin đã tồn tại');
            return;
        }

        // Tạo tài khoản admin mặc định
        const admin = new User({
            username: 'admin',
            password: 'admin123',
            fullName: 'Administrator',
            role: 'admin'
        });

        await admin.save();
        console.log('Đã tạo tài khoản admin mặc định:');
        console.log('Username: admin');
        console.log('Password: admin123');
    } catch (error) {
        console.error('Lỗi khi tạo tài khoản admin:', error);
    } finally {
        mongoose.disconnect();
    }
} 