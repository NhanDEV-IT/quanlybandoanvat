const Order = require('../../models/Order');

// Lấy danh sách đơn hàng (admin)
exports.getAllOrders = async (req, res) => {
    try {
        const query = {};
        
        // Lọc theo trạng thái
        if (req.query.status) {
            query.status = req.query.status;
        }
        
        // Lọc theo ngày
        if (req.query.date) {
            const startDate = new Date(req.query.date);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(req.query.date);
            endDate.setHours(23, 59, 59, 999);
            
            query.createdAt = {
                $gte: startDate,
                $lte: endDate
            };
        }

        const orders = await Order.find(query).sort({ createdAt: -1 });

        res.render('admin/orders/index', { 
            orders,
            status: req.query.status || '',
            date: req.query.date || ''
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đơn hàng:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải danh sách đơn hàng');
        res.redirect('/admin');
    }
}; 