const Product = require('../../models/Product');
const Order = require('../../models/Order');
const User = require('../../models/User');

exports.index = async (req, res) => {
    try {
        // Lấy tổng số sản phẩm
        const totalProducts = await Product.countDocuments();
        
        // Lấy tổng số đơn hàng
        const totalOrders = await Order.countDocuments();
        
        // Lấy tổng số người dùng (không tính admin)
        const totalUsers = await User.countDocuments({ role: 'user' });
        
        // Lấy tổng doanh thu từ đơn hàng đã hoàn thành
        const orders = await Order.find({ status: 'completed' });
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        
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
    } catch (error) {
        console.error('Lỗi dashboard:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải dữ liệu dashboard');
        res.redirect('/admin/products');
    }
}; 