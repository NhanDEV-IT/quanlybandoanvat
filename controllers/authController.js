const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Hiển thị form đăng nhập
exports.getLogin = (req, res) => {
    res.render('auth/login');
};

// Xử lý đăng nhập
exports.postLogin = async (req, res) => {
    const { username, password } = req.body;
    try {
        console.log('Login attempt for username:', username);
        const user = await User.findOne({ username });
        
        if (!user) {
            console.log('User not found');
            req.flash('error_msg', 'Tên đăng nhập hoặc mật khẩu không đúng');
            return res.redirect('/auth/login');
        }

        console.log('Found user:', {
            username: user.username,
            hashedPassword: user.password,
            lastName: user.lastName,
            firstName: user.firstName
        });

        const isMatch = await user.comparePassword(password);
        console.log('Password match result:', isMatch);

        if (!isMatch) {
            console.log('Password does not match');
            req.flash('error_msg', 'Tên đăng nhập hoặc mật khẩu không đúng');
            return res.redirect('/auth/login');
        }

        req.session.user = {
            id: user._id,
            username: user.username,
            fullName: `${user.lastName} ${user.firstName}`,
            role: user.role
        };
        console.log('Session created:', req.session.user);
        req.flash('success_msg', 'Đăng nhập thành công');
        
        // Chuyển hướng dựa vào role
        if (user.role === 'admin') {
            res.redirect('/admin/dashboard');
        } else {
            res.redirect('/');
        }
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error_msg', 'Có lỗi xảy ra, vui lòng thử lại');
        res.redirect('/auth/login');
    }
};

// Hiển thị form đăng ký
exports.getRegister = (req, res) => {
    res.render('auth/register');
};

// Xử lý đăng ký
exports.postRegister = async (req, res) => {
    const { username, password, confirmPassword, lastName, firstName, email, phone } = req.body;

    try {
        console.log('Register attempt:', { username, lastName, firstName, email });
        
        // Kiểm tra các điều kiện
        if (password !== confirmPassword) {
            req.flash('error_msg', 'Mật khẩu xác nhận không khớp');
            return res.redirect('/auth/register');
        }

        if (password.length < 6) {
            req.flash('error_msg', 'Mật khẩu phải có ít nhất 6 ký tự');
            return res.redirect('/auth/register');
        }

        if (username.length < 3 || username.includes(' ')) {
            req.flash('error_msg', 'Tên đăng nhập phải có ít nhất 3 ký tự và không chứa khoảng trắng');
            return res.redirect('/auth/register');
        }

        // Kiểm tra username đã tồn tại
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            req.flash('error_msg', 'Tên đăng nhập đã tồn tại');
            return res.redirect('/auth/register');
        }

        // Kiểm tra email đã tồn tại
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            req.flash('error_msg', 'Email đã được sử dụng');
            return res.redirect('/auth/register');
        }

        // Tạo user mới
        const newUser = new User({
            username,
            password,
            lastName,
            firstName,
            email,
            phone,
            role: 'user'
        });

        await newUser.save();
        console.log('New user created:', {
            username: newUser.username,
            hashedPassword: newUser.password,
            lastName: newUser.lastName,
            firstName: newUser.firstName
        });

        req.flash('success_msg', 'Đăng ký thành công! Vui lòng đăng nhập');
        res.redirect('/auth/login');
    } catch (err) {
        console.error('Registration error:', err);
        req.flash('error_msg', 'Có lỗi xảy ra, vui lòng thử lại');
        res.redirect('/auth/register');
    }
};

// Đăng xuất
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error(err);
        res.redirect('/auth/login');
    });
}; 