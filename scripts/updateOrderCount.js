const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
require('dotenv').config();

// Kết nối database
const MONGODB_URI = process.env.MONGODB_URI || 'your_mongodb_atlas_uri_here';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('Đã kết nối thành công với MongoDB!');
    try {
        // Reset tất cả orderCount về 0
        await Product.updateMany({}, { orderCount: 0 });
        
        // Lấy tất cả đơn hàng đã hoàn thành
        const completedOrders = await Order.find({ status: 'completed' })
            .populate('items.product');
            
        console.log(`Tìm thấy ${completedOrders.length} đơn hàng đã hoàn thành`);
        
        // Tạo map để lưu số lượng đã bán của mỗi sản phẩm
        const productCounts = new Map();
        
        // Tính toán số lượng đã bán cho mỗi sản phẩm
        for (const order of completedOrders) {
            for (const item of order.items) {
                const productId = item.product._id.toString();
                const currentCount = productCounts.get(productId) || 0;
                productCounts.set(productId, currentCount + item.quantity);
            }
        }
        
        // Cập nhật orderCount cho từng sản phẩm
        for (const [productId, count] of productCounts) {
            await Product.findByIdAndUpdate(productId, { orderCount: count });
            console.log(`Đã cập nhật sản phẩm ${productId}: ${count} đã bán`);
        }
        
        console.log('Cập nhật hoàn tất!');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Lỗi khi cập nhật:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
})
.catch(err => {
    console.error('Lỗi kết nối MongoDB:', err.message);
    process.exit(1);
}); 