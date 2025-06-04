const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Tự động tạo slug từ name trước khi lưu
categorySchema.pre('save', async function(next) {
    if (this.isModified('name')) {
        // Tạo slug từ tên
        let slug = slugify(this.name, {
            lower: true,      // Chuyển thành chữ thường
            strict: true,     // Chỉ giữ lại ký tự và số
            locale: 'vi'      // Hỗ trợ tiếng Việt
        });
        
        // Kiểm tra xem slug đã tồn tại chưa
        let count = 0;
        let uniqueSlug = slug;
        while (true) {
            const existingCategory = await this.constructor.findOne({ 
                slug: uniqueSlug,
                _id: { $ne: this._id } // Bỏ qua document hiện tại khi update
            });
            if (!existingCategory) break;
            count++;
            uniqueSlug = `${slug}-${count}`;
        }
        
        this.slug = uniqueSlug;
    }
    next();
});

// Middleware cho insertMany
categorySchema.pre('insertMany', async function(next, docs) {
    try {
        // Xử lý từng document
        for (const doc of docs) {
            let slug = slugify(doc.name, {
                lower: true,
                strict: true,
                locale: 'vi'
            });
            
            // Kiểm tra và tạo slug duy nhất
            let count = 0;
            let uniqueSlug = slug;
            while (true) {
                const existingCategory = await mongoose.model('Category').findOne({ slug: uniqueSlug });
                if (!existingCategory) break;
                count++;
                uniqueSlug = `${slug}-${count}`;
            }
            
            doc.slug = uniqueSlug;
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Category', categorySchema); 