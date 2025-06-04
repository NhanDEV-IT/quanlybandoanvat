const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Dashboard
exports.getDashboard = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
        
        // Lấy tổng doanh thu từ đơn hàng đã hoàn thành
        const completedOrders = await Order.find({ status: 'completed' });
        const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        
        // Lấy 5 sản phẩm bán chạy nhất
        const topProducts = await Product.find()
            .populate('category')
            .sort({ orderCount: -1 })
            .limit(5);
            
        // Lấy 5 đơn hàng mới nhất
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'username');

        res.render('admin/dashboard', {
            totalProducts,
            totalOrders,
            totalUsers,
            totalRevenue,
            topProducts,
            recentOrders
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Có lỗi xảy ra');
        res.redirect('/admin/dashboard');
    }
};

// Quản lý sản phẩm
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.render('admin/products/index', { products });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải danh sách sản phẩm');
        res.redirect('/admin/dashboard');
    }
};

exports.getAddProduct = (req, res) => {
    res.render('admin/products/add');
};

exports.createProduct = async (req, res) => {
    try {
        const { name, description, price, category, stock } = req.body;
        const image = req.file ? req.file.filename : '';

        const newProduct = new Product({
            name,
            description,
            price,
            category,
            image,
            stock: parseInt(stock)
        });

        await newProduct.save();
        req.flash('success_msg', 'Thêm sản phẩm thành công');
        res.redirect('/admin/products');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Có lỗi xảy ra khi thêm sản phẩm');
        res.redirect('/admin/products/add');
    }
};

exports.getEditProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            req.flash('error_msg', 'Không tìm thấy sản phẩm');
            return res.redirect('/admin/products');
        }
        res.render('admin/products/edit', { product });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Có lỗi xảy ra');
        res.redirect('/admin/products');
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { name, description, price, category, stock } = req.body;
        const updateData = {
            name,
            description,
            price,
            category,
            stock: parseInt(stock)
        };

        if (req.file) {
            updateData.image = req.file.filename;
        }

        await Product.findByIdAndUpdate(req.params.id, updateData);
        req.flash('success_msg', 'Cập nhật sản phẩm thành công');
        res.redirect('/admin/products');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Có lỗi xảy ra khi cập nhật sản phẩm');
        res.redirect('/admin/products');
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Xóa sản phẩm thành công');
        res.redirect('/admin/products');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Có lỗi xảy ra khi xóa sản phẩm');
        res.redirect('/admin/products');
    }
};

// Quản lý đơn hàng
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ createdAt: -1 });
        res.render('admin/orders/index', { orders });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải danh sách đơn hàng');
        res.redirect('/admin/dashboard');
    }
};

exports.getOrderDetail = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.product');
        if (!order) {
            req.flash('error_msg', 'Không tìm thấy đơn hàng');
            return res.redirect('/admin/orders');
        }
        res.render('admin/orders/detail', { order });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Có lỗi xảy ra');
        res.redirect('/admin/orders');
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        console.log('Received status:', status);
        
        const order = await Order.findById(req.params.id).populate('items.product');
        console.log('Current order status:', order.status);
        
        if (!order) {
            req.flash('error_msg', 'Không tìm thấy đơn hàng');
            return res.redirect('/admin/orders');
        }

        const oldStatus = order.status;
        console.log('Old status:', oldStatus);
        
        // Nếu đơn hàng được chuyển sang trạng thái hoàn thành
        if (status === 'completed' && oldStatus !== 'completed') {
            console.log('Updating to completed status');
            // Cập nhật số lượng đã bán cho từng sản phẩm
            for (const item of order.items) {
                try {
                    await Product.findByIdAndUpdate(
                        item.product._id,
                        { $inc: { orderCount: item.quantity } },
                        { new: true }
                    );
                } catch (err) {
                    console.error('Error updating product orderCount:', err);
                    // Tiếp tục với sản phẩm tiếp theo nếu có lỗi
                }
            }
        }
        // Nếu đơn hàng từ hoàn thành chuyển sang trạng thái khác
        else if (oldStatus === 'completed' && status !== 'completed') {
            console.log('Updating from completed status');
            // Giảm số lượng đã bán của từng sản phẩm
            for (const item of order.items) {
                try {
                    await Product.findByIdAndUpdate(
                        item.product._id,
                        { 
                            $set: { 
                                orderCount: Math.max(0, (item.product.orderCount || 0) - item.quantity)
                            }
                        },
                        { new: true }
                    );
                } catch (err) {
                    console.error('Error updating product orderCount:', err);
                    // Tiếp tục với sản phẩm tiếp theo nếu có lỗi
                }
            }
        }
        
        // Cập nhật trạng thái đơn hàng
        await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { 
                new: true,
                runValidators: true,
                context: 'query'
            }
        );
        
        console.log('Status updated successfully');
        
        req.flash('success_msg', 'Cập nhật trạng thái đơn hàng thành công');
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Error updating order status:', err);
        req.flash('error_msg', 'Có lỗi xảy ra khi cập nhật trạng thái');
        res.redirect('/admin/orders');
    }
};

// Quản lý người dùng
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().sort('-createdAt');
        res.render('admin/users/index', { users });
    } catch (error) {
        console.error('Error getting users:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải danh sách người dùng');
        res.redirect('/admin/dashboard');
    }
};

exports.getAddUser = (req, res) => {
    res.render('admin/users/add', { 
        user: null,
        errors: {},
        roles: ['user', 'admin', 'staff']
    });
};

exports.postAddUser = async (req, res) => {
    try {
        console.log('Adding new user...');
        console.log('Request headers:', {
            'content-type': req.headers['content-type'],
            'csrf-token': req.headers['csrf-token'] ? '[PRESENT]' : '[MISSING]',
            'x-csrf-token': req.headers['x-csrf-token'] ? '[PRESENT]' : '[MISSING]'
        });
        console.log('Request body:', {
            ...req.body,
            _csrf: req.body._csrf ? '[PRESENT]' : '[MISSING]',
            password: '[HIDDEN]'
        });

        const { username, email, password, role, firstName, lastName, phone } = req.body;
        
        // Validate input
        const errors = {};
        if (!username || username.trim().length < 3) {
            errors.username = 'Tên người dùng phải có ít nhất 3 ký tự';
        }
        if (!email || !email.includes('@')) {
            errors.email = 'Email không hợp lệ';
        }
        if (!password || password.length < 6) {
            errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        }
        if (!role || !['user', 'admin', 'staff'].includes(role)) {
            errors.role = 'Vai trò không hợp lệ';
        }
        if (!firstName || firstName.trim().length === 0) {
            errors.firstName = 'Vui lòng nhập tên';
        }
        if (!lastName || lastName.trim().length === 0) {
            errors.lastName = 'Vui lòng nhập họ';
        }
        if (!phone || !/^\d{10}$/.test(phone)) {
            errors.phone = 'Số điện thoại không hợp lệ';
        }

        // Kiểm tra username đã tồn tại
        const existingUsername = await User.findOne({ username: username.trim() });
        if (existingUsername) {
            errors.username = 'Tên đăng nhập này đã được sử dụng';
        }

        // Kiểm tra email đã tồn tại
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            errors.email = 'Email này đã được sử dụng';
        }

        if (Object.keys(errors).length > 0) {
            return res.render('admin/users/add', {
                user: req.body,
                errors,
                roles: ['user', 'admin', 'staff']
            });
        }

        // Tạo user mới
        const user = new User({
            username: username.trim(),
            email: email.toLowerCase(),
            password,  // Password sẽ được hash bởi middleware pre save
            role,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim()
        });

        await user.save();
        
        req.flash('success_msg', 'Thêm người dùng mới thành công');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error adding user:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi thêm người dùng');
        res.redirect('/admin/users/add');
    }
};

exports.getEditUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error_msg', 'Không tìm thấy người dùng');
            return res.redirect('/admin/users');
        }

        res.render('admin/users/edit', {
            user,
            errors: {},
            roles: ['user', 'admin', 'staff']
        });
    } catch (error) {
        console.error('Error loading user:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải thông tin người dùng');
        res.redirect('/admin/users');
    }
};

exports.postEditUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { email, password, role, firstName, lastName, phone } = req.body;
        
        // Validate input
        const errors = {};
        if (!firstName || firstName.trim().length === 0) {
            errors.firstName = 'Vui lòng nhập tên';
        }
        if (!lastName || lastName.trim().length === 0) {
            errors.lastName = 'Vui lòng nhập họ';
        }
        if (!email || !email.includes('@')) {
            errors.email = 'Email không hợp lệ';
        }
        if (!phone || !/^\d{10}$/.test(phone)) {
            errors.phone = 'Số điện thoại không hợp lệ';
        }
        if (password && password.length < 6) {
            errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        }
        if (!role || !['user', 'admin', 'staff'].includes(role)) {
            errors.role = 'Vai trò không hợp lệ';
        }

        // Kiểm tra user hiện tại
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            req.flash('error_msg', 'Không tìm thấy người dùng');
            return res.redirect('/admin/users');
        }

        // Kiểm tra email đã tồn tại (trừ user hiện tại)
        const existingEmail = await User.findOne({ 
            email: email.toLowerCase(), 
            _id: { $ne: userId } 
        });
        if (existingEmail) {
            errors.email = 'Email này đã được sử dụng';
        }

        // Không cho phép thay đổi vai trò của admin
        if (currentUser.role === 'admin' && role !== 'admin') {
            errors.role = 'Không thể thay đổi vai trò của quản trị viên';
        }

        if (Object.keys(errors).length > 0) {
            return res.render('admin/users/edit', {
                user: {
                    ...currentUser.toObject(),
                    email,
                    role,
                    firstName,
                    lastName,
                    phone
                },
                errors,
                roles: ['user', 'admin', 'staff']
            });
        }

        // Cập nhật thông tin
        const updateData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase(),
            phone: phone.trim()
        };

        // Chỉ cập nhật role nếu user không phải admin
        if (currentUser.role !== 'admin') {
            updateData.role = role;
        }

        // Chỉ cập nhật password nếu có nhập mới
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        await User.findByIdAndUpdate(userId, updateData, { 
            new: true,
            runValidators: true 
        });
        
        req.flash('success_msg', 'Cập nhật người dùng thành công');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error updating user:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi cập nhật người dùng');
        res.redirect(`/admin/users/edit/${req.params.id}`);
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            if (req.xhr || req.headers.accept.includes('json')) {
                return res.status(404).json({ error: 'Không tìm thấy người dùng' });
            }
            req.flash('error_msg', 'Không tìm thấy người dùng');
            return res.redirect('/admin/users');
        }

        // Kiểm tra xem người dùng có đơn hàng không
        const orderCount = await Order.countDocuments({ user: user._id });
        if (orderCount > 0) {
            const error = 'Không thể xóa người dùng này vì đã có đơn hàng';
            if (req.xhr || req.headers.accept.includes('json')) {
                return res.status(400).json({ error });
            }
            req.flash('error_msg', error);
            return res.redirect('/admin/users');
        }

        await user.deleteOne();

        if (req.xhr || req.headers.accept.includes('json')) {
            return res.json({ 
                success: true, 
                message: 'Xóa người dùng thành công' 
            });
        }

        req.flash('success_msg', 'Xóa người dùng thành công');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error deleting user:', error);
        if (req.xhr || req.headers.accept.includes('json')) {
            return res.status(500).json({ error: 'Có lỗi xảy ra khi xóa người dùng' });
        }
        req.flash('error_msg', 'Có lỗi xảy ra khi xóa người dùng');
        res.redirect('/admin/users');
    }
}; 