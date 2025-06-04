// Middleware kiểm tra đăng nhập
exports.isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash('error_msg', 'Vui lòng đăng nhập để tiếp tục');
    res.redirect('/auth/login');
};

// Middleware kiểm tra quyền admin
exports.isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    req.flash('error_msg', 'Bạn không có quyền truy cập trang này');
    res.redirect('/');
};

// Middleware chuyển hướng nếu đã đăng nhập
exports.redirectIfAuthenticated = (req, res, next) => {
    if (req.session.user) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }
        return res.redirect('/');
    }
    next();
}; 