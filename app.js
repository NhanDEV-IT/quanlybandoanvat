require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const methodOverride = require('method-override');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const multer = require('./config/multer');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const requestLogger = require('./middleware/requestLogger');

const app = express();

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quanlybandoanvat', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Đã kết nối MongoDB thành công'))
.catch(err => console.log('Lỗi kết nối MongoDB:', err));

// Cấu hình Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

// Parse cookies trước session
app.use(cookieParser());

// Cấu hình Session
app.set('trust proxy', 1); // ⚠️ Quan trọng

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none', // ⚠️ Cho phép frontend nhận cookie
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));
// Parse request body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Method Override - đặt trước CSRF
app.use(methodOverride(function (req, res) {
    // Lưu method gốc vào req để logging
    req.originalMethod = req.method;

    // Kiểm tra method trong query string
    if (req.query && req.query._method) {
        const method = req.query._method.toUpperCase();
        console.log('Method override from query:', method);
        return method;
    }

    // Kiểm tra method trong form data
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        const method = req.body._method.toUpperCase();
        console.log('Method override from body:', method);
        delete req.body._method;
        return method;
    }
}));

// Thêm middleware để log request details
app.use((req, res, next) => {
    console.log('\n=== Request Details ===');
    console.log('Time:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('Original Method:', req.originalMethod);
    console.log('URL:', req.url);
    console.log('Query:', req.query);
    console.log('Body:', {
        ...req.body,
        _csrf: req.body._csrf ? '[HIDDEN]' : undefined
    });
    console.log('Headers:', {
        'content-type': req.headers['content-type'],
        'csrf-token': req.headers['csrf-token'] ? '[HIDDEN]' : undefined,
        'x-csrf-token': req.headers['x-csrf-token'] ? '[HIDDEN]' : undefined
    });
    next();
});

app.use(flash());

// CSRF Protection - chạy sau khi đã xử lý method override
app.use(csrf({ 
    cookie: true,
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    value: (req) => {
        return (
            (req.body && req.body._csrf) || 
            (req.query && req.query._csrf) || 
            (req.headers && (
                req.headers['csrf-token'] || 
                req.headers['x-csrf-token'] ||
                req.headers['x-xsrf-token']
            ))
        );
    }
}));

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Biến toàn cục cho views
app.use((req, res, next) => {
    // Flash messages
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    
    // User data
    res.locals.user = req.session.user || null;
    
    // CSRF token cho tất cả views
    res.locals.csrfToken = req.csrfToken();
    
    next();
});

// Error handler cho CSRF
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        console.error('CSRF Error:', {
            url: req.url,
            method: req.method,
            originalMethod: req.originalMethod,
            headers: {
                'content-type': req.headers['content-type']
            }
        });
        req.flash('error_msg', 'Phiên làm việc đã hết hạn, vui lòng thử lại');
        return res.redirect('back');
    }
    next(err);
});

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');

// Định tuyến trang chủ
app.get('/', (req, res) => {
    res.render('home');
});

// Sử dụng routes theo thứ tự ưu tiên
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes); // Admin routes phải đứng trước product routes
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/cart', cartRoutes);
app.use('/users', userRoutes);

// Xử lý lỗi 404
app.use((req, res) => {
    console.log('404 Error:', req.originalUrl);
    res.status(404).render('404', { 
        url: req.originalUrl,
        error: 'Không tìm thấy trang'
    });
});

// Xử lý lỗi 500
app.use((err, req, res, next) => {
    console.error('500 Error:', err);
    
    // Nếu là lỗi validation của mongoose
    if (err.name === 'ValidationError') {
        const errors = {};
        for (let field in err.errors) {
            errors[field] = err.errors[field].message;
        }
        console.log('Validation Errors:', errors);
        req.flash('error_msg', 'Vui lòng kiểm tra lại thông tin nhập vào');
        return res.redirect('back');
    }

    // Nếu là lỗi multer
    if (err.code === 'LIMIT_FILE_SIZE') {
        console.log('File Size Error:', err);
        req.flash('error_msg', 'File quá lớn. Kích thước tối đa là 5MB');
        return res.redirect('back');
    }

    // Các lỗi khác
    res.status(500).render('error', {
        error: process.env.NODE_ENV === 'development' ? err : 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
    });
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
});