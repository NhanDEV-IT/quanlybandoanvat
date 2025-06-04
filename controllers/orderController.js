const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// Hiển thị form đặt hàng
exports.getCreateOrder = async (req, res) => {
    try {
        const products = await Product.find({ stock: { $gt: 0 } });

        // Fetch complete user data if user is logged in
        let userData = null;
        if (req.session.user && req.session.user.id) {
            userData = await User.findById(req.session.user.id);
        }

        res.render('orders/create', {
            products,
            user: userData  // Pass the complete user object
        });
    } catch (error) {
        console.error('Lỗi khi tải trang đặt hàng:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải trang đặt hàng');
        res.redirect('/products');
    }
};

// Xử lý đặt hàng
exports.createOrder = async (req, res) => {
    try {
        const { customerName, phoneNumber, address, note, items } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!customerName || !phoneNumber || !address || !items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin'
            });
        }

        // Tính tổng tiền và lấy thông tin sản phẩm
        let totalAmount = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await Product.findById(item.id);
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Không tìm thấy sản phẩm với ID ${item.id}`
                });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm ${product.name} không đủ số lượng`
                });
            }

            totalAmount += product.price * item.quantity;

            // Cập nhật số lượng tồn kho
            product.stock -= item.quantity;
            await product.save();

            // Lưu thông tin sản phẩm đầy đủ
            processedItems.push({
                product: product._id,
                quantity: item.quantity,
                price: product.price,
                name: product.name,
                image: product.image
            });
        }

        // Tạo đơn hàng mới
        const newOrder = new Order({
            customerName,
            phoneNumber,
            address,
            note,
            items: processedItems,
            totalAmount,
            status: 'pending',
            user: req.session.user ? req.session.user.id : null
        });

        await newOrder.save();

        // Đặt flash message
        req.flash('success_msg', 'Đặt hàng thành công! Cảm ơn bạn đã mua hàng.');

        // Trả về response thành công
        return res.status(200).json({
            success: true,
            message: 'Đặt hàng thành công',
            orderId: newOrder._id
        });
    } catch (error) {
        console.error('Lỗi khi đặt hàng:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Có lỗi xảy ra khi đặt hàng'
        });
    }
};

// Lấy danh sách đơn hàng
exports.getAllOrders = async (req, res) => {
    try {
        const query = {};

        // Nếu không phải admin, chỉ hiển thị đơn hàng của user đó
        if (req.session.user.role !== 'admin') {
            query.user = req.session.user.id;
        }

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

        const orders = await Order.find(query)
            .populate('user', 'username firstName lastName')
            .sort({ createdAt: -1 });

        res.render('orders/list', {
            orders,
            query: req.query, // Truyền query params để giữ lại giá trị đã chọn
            userRole: req.session.user.role
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đơn hàng:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải danh sách đơn hàng');
        res.redirect('/');
    }
};

// Lấy chi tiết đơn hàng
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.product')
            .populate('user', 'username lastName firstName');

        if (!order) {
            req.flash('error_msg', 'Không tìm thấy đơn hàng');
            return res.redirect('/orders');
        }

        // Kiểm tra quyền xem đơn hàng
        if (req.session.user.role !== 'admin' &&
            req.session.user.role !== 'staff' &&
            order.user.toString() !== req.session.user.id) {
            req.flash('error_msg', 'Bạn không có quyền xem đơn hàng này');
            return res.redirect('/orders');
        }

        res.render('orders/detail', {
            order,
            userRole: req.session.user.role
        });
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết đơn hàng:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải thông tin đơn hàng');
        res.redirect('/orders');
    }
};

// Cập nhật trạng thái đơn hàng
exports.updateOrderStatus = async (req, res) => {
    try {
        // Kiểm tra quyền
        if (req.session.user.role !== 'admin' && req.session.user.role !== 'staff') {
            req.flash('error_msg', 'Bạn không có quyền thực hiện thao tác này');
            return res.redirect('/orders');
        }

        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];

        if (!validStatuses.includes(status)) {
            req.flash('error_msg', 'Trạng thái không hợp lệ');
            return res.redirect('/orders');
        }

        const order = await Order.findById(req.params.id).populate('items.product');

        if (!order) {
            req.flash('error_msg', 'Không tìm thấy đơn hàng');
            return res.redirect('/orders');
        }

        const oldStatus = order.status;
        order.status = status;

        // Nếu đơn hàng được chuyển sang trạng thái hoàn thành
        if (status === 'completed' && oldStatus !== 'completed') {
            // Cập nhật số lượng đã bán cho từng sản phẩm
            for (const item of order.items) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.orderCount = (product.orderCount || 0) + item.quantity;
                    await product.save();
                }
            }
        }
        // Nếu đơn hàng từ hoàn thành chuyển sang trạng thái khác
        else if (oldStatus === 'completed' && status !== 'completed') {
            // Giảm số lượng đã bán của từng sản phẩm
            for (const item of order.items) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.orderCount = Math.max(0, (product.orderCount || 0) - item.quantity);
                    await product.save();
                }
            }
        }
        // Nếu đơn hàng bị hủy, hoàn lại số lượng sản phẩm vào kho
        if (status === 'cancelled' && oldStatus !== 'cancelled') {
            for (const item of order.items) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.stock += item.quantity;
                    await product.save();
                }
            }
        }
        // Nếu đơn hàng từ trạng thái hủy chuyển sang trạng thái khác
        else if (oldStatus === 'cancelled' && status !== 'cancelled') {
            for (const item of order.items) {
                const product = await Product.findById(item.product);
                if (product) {
                    if (product.stock < item.quantity) {
                        req.flash('error_msg', `Sản phẩm ${product.name} không đủ số lượng trong kho`);
                        return res.redirect(`/orders/${order._id}`);
                    }
                    product.stock -= item.quantity;
                    await product.save();
                }
            }
        }

        await order.save();

        req.flash('success_msg', 'Cập nhật trạng thái đơn hàng thành công');
        res.redirect(`/orders/${order._id}`);
    } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi cập nhật trạng thái đơn hàng');
        res.redirect('/orders');
    }
};

// Hủy đơn hàng
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('items.product');

        if (!order) {
            req.flash('error_msg', 'Không tìm thấy đơn hàng');
            return res.redirect('/orders');
        }

        // Chỉ cho phép hủy đơn hàng ở trạng thái pending
        if (order.status !== 'pending') {
            req.flash('error_msg', 'Không thể hủy đơn hàng này');
            return res.redirect('/orders');
        }

        // Hoàn lại số lượng sản phẩm vào kho
        for (const item of order.items) {
            const product = item.product;
            product.stock += item.quantity;
            await product.save();
        }

        // Cập nhật trạng thái đơn hàng thành cancelled
        order.status = 'cancelled';
        await order.save();

        req.flash('success_msg', 'Đã hủy đơn hàng thành công');
        res.redirect('/orders');
    } catch (error) {
        console.error('Lỗi khi hủy đơn hàng:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi hủy đơn hàng');
        res.redirect('/orders');
    }
}; 