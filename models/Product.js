const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên sản phẩm là bắt buộc'],
        trim: true,
        minlength: [2, 'Tên sản phẩm phải có ít nhất 2 ký tự']
    },
    description: {
        type: String,
        required: [true, 'Mô tả sản phẩm là bắt buộc'],
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Giá sản phẩm là bắt buộc'],
        min: [0, 'Giá sản phẩm không được âm']
    },
    stock: {
        type: Number,
        required: [true, 'Số lượng tồn kho là bắt buộc'],
        min: [0, 'Số lượng tồn kho không được âm'],
        default: 0
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Danh mục sản phẩm là bắt buộc']
    },
    image: {
        type: String,
        default: '/uploads/products/default.jpg'
    },
    discount: {
        type: Number,
        min: [0, 'Giảm giá không được âm'],
        max: [100, 'Giảm giá không được vượt quá 100%'],
        default: 0
    },
    orderCount: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function() {
    if (!this.discount) return this.price;
    return this.price * (1 - this.discount/100);
});

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(this.price);
});

// Virtual for formatted discounted price
productSchema.virtual('formattedDiscountedPrice').get(function() {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(this.discountedPrice);
});

// Pre-save middleware to ensure discount is a number
productSchema.pre('save', function(next) {
    if (this.discount === '') {
        this.discount = 0;
    }
    next();
});

// Static method to get active products
productSchema.statics.getActiveProducts = function() {
    return this.find({ isActive: true }).sort('-createdAt');
};

// Static method to get products by category
productSchema.statics.getByCategory = function(categoryId) {
    return this.find({ 
        category: categoryId,
        isActive: true 
    }).sort('-createdAt');
};

// Instance method to check if product is in stock
productSchema.methods.isInStock = function() {
    return this.stock > 0;
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 