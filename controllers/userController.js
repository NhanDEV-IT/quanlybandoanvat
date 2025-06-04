const User = require('../models/User');

// Hiển thị thông tin tài khoản
exports.getProfile = async (req, res) => {
    try {
        if (!req.session.user) {
            req.flash('error_msg', 'Vui lòng đăng nhập');
            return res.redirect('/auth/login');
        }
        
        const user = await User.findById(req.session.user.id);
        if (!user) {
            req.flash('error_msg', 'Không tìm thấy thông tin tài khoản');
            return res.redirect('/');
        }
        res.render('users/profile', { user });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải thông tin tài khoản');
        res.redirect('/');
    }
};

// Hiển thị form chỉnh sửa thông tin
exports.getEditProfile = async (req, res) => {
    try {
        if (!req.session.user) {
            req.flash('error_msg', 'Vui lòng đăng nhập');
            return res.redirect('/auth/login');
        }

        const user = await User.findById(req.session.user.id);
        if (!user) {
            req.flash('error_msg', 'Không tìm thấy thông tin tài khoản');
            return res.redirect('/users/profile');
        }
        res.render('users/edit-profile', { user });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải thông tin tài khoản');
        res.redirect('/users/profile');
    }
};

// Xử lý cập nhật thông tin
exports.updateProfile = async (req, res) => {
    try {
        if (!req.session.user) {
            req.flash('error_msg', 'Vui lòng đăng nhập');
            return res.redirect('/auth/login');
        }

        const { lastName, middleName, firstName, email, phone } = req.body;
        
        // Kiểm tra email đã tồn tại chưa (trừ email hiện tại của user)
        const existingUser = await User.findOne({ 
            email, 
            _id: { $ne: req.session.user.id } 
        });
        
        if (existingUser) {
            req.flash('error_msg', 'Email này đã được sử dụng');
            return res.redirect('/users/profile/edit');
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.session.user.id,
            { lastName, middleName, firstName, email, phone },
            { new: true }
        );

        // Cập nhật thông tin trong session
        req.session.user = {
            id: updatedUser._id,
            username: updatedUser.username,
            role: updatedUser.role
        };
        
        req.flash('success_msg', 'Cập nhật thông tin thành công');
        res.redirect('/users/profile');
    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi cập nhật thông tin');
        res.redirect('/users/profile/edit');
    }
}; 