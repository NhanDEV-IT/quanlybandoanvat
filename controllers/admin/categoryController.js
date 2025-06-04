const Category = require('../../models/category.model');

// Hiển thị danh sách danh mục
exports.index = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.render('admin/categories/index', { categories });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách danh mục:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải danh sách danh mục');
        res.redirect('/admin/dashboard');
    }
};

// Hiển thị form thêm danh mục
exports.create = (req, res) => {
    try {
        console.log('Loading create category form');
        res.render('admin/categories/form', { 
            category: null,
            errors: {},
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.error('Error loading create category form:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải form thêm danh mục');
        res.redirect('/admin/categories');
    }
};

// Xử lý thêm danh mục
exports.store = async (req, res) => {
    try {
        console.log('Creating new category:', req.body);
        const { name, description } = req.body;
        
        // Validate
        const errors = {};
        if (!name || name.trim().length < 2) {
            errors.name = 'Tên danh mục phải có ít nhất 2 ký tự';
        }

        // Kiểm tra danh mục đã tồn tại chưa
        if (name) {
            const existingCategory = await Category.findOne({ 
                name: name.trim(),
                _id: { $ne: req.params.id } // Bỏ qua ID hiện tại khi đang sửa
            });
            
            if (existingCategory) {
                errors.name = 'Tên danh mục này đã tồn tại';
            }
        }

        if (Object.keys(errors).length > 0) {
            console.log('Validation errors:', errors);
            return res.render('admin/categories/form', {
                category: { name, description },
                errors,
                csrfToken: req.csrfToken()
            });
        }

        const category = new Category({
            name: name.trim(),
            description: description ? description.trim() : ''
        });

        await category.save();
        
        console.log('Category created successfully:', category);
        req.flash('success_msg', 'Thêm danh mục thành công');
        res.redirect('/admin/categories');
    } catch (error) {
        console.error('Error creating category:', error);
        res.render('admin/categories/form', {
            category: req.body,
            errors: { name: 'Có lỗi xảy ra khi thêm danh mục' },
            csrfToken: req.csrfToken()
        });
    }
};

// Hiển thị form sửa danh mục
exports.edit = async (req, res) => {
    try {
        console.log('Loading edit form for category:', req.params.id);
        
        const category = await Category.findById(req.params.id);
        if (!category) {
            console.log('Category not found');
            req.flash('error_msg', 'Không tìm thấy danh mục');
            return res.redirect('/admin/categories');
        }

        res.render('admin/categories/form', { 
            category: category.toObject(),
            errors: {},
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.error('Error loading category edit form:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải thông tin danh mục');
        res.redirect('/admin/categories');
    }
};

// Xử lý sửa danh mục
exports.update = async (req, res) => {
    try {
        console.log('Updating category:', req.params.id);
        console.log('Request body:', req.body);

        const { name, description } = req.body;
        
        // Validate input
        const errors = {};
        if (!name || name.trim().length < 2) {
            errors.name = 'Tên danh mục phải có ít nhất 2 ký tự';
        }

        if (Object.keys(errors).length > 0) {
            console.log('Validation errors:', errors);
            const category = await Category.findById(req.params.id);
            return res.render('admin/categories/edit', {
                category: { ...category.toObject(), ...req.body },
                errors,
                error_msg: 'Vui lòng kiểm tra lại thông tin'
            });
        }

        const category = await Category.findById(req.params.id);
        if (!category) {
            console.log('Category not found');
            req.flash('error_msg', 'Không tìm thấy danh mục');
            return res.redirect('/admin/categories');
        }

        category.name = name.trim();
        category.description = description ? description.trim() : '';
        await category.save();

        console.log('Category updated successfully');
        req.flash('success_msg', 'Cập nhật danh mục thành công');
        res.redirect('/admin/categories');
    } catch (error) {
        console.error('Error updating category:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi cập nhật danh mục');
        res.redirect(`/admin/categories/${req.params.id}/edit`);
    }
};

// Xử lý xóa danh mục
exports.destroy = async (req, res) => {
    try {
        console.log('Deleting category:', req.params.id);
        console.log('Request type:', req.xhr ? 'AJAX' : 'Regular');
        console.log('Accept header:', req.headers.accept);
        
        const category = await Category.findById(req.params.id);
        if (!category) {
            console.log('Category not found');
            const error = 'Không tìm thấy danh mục';
            if (req.xhr || req.headers.accept.includes('json')) {
                return res.status(404).json({ error });
            }
            req.flash('error_msg', error);
            return res.redirect('/admin/categories');
        }

        // Kiểm tra xem danh mục có sản phẩm không
        const Product = require('../../models/Product');
        const productsCount = await Product.countDocuments({ category: category._id });
        
        if (productsCount > 0) {
            console.log('Category has products:', productsCount);
            const error = 'Không thể xóa danh mục này vì đang có sản phẩm thuộc danh mục';
            if (req.xhr || req.headers.accept.includes('json')) {
                return res.status(400).json({ error });
            }
            req.flash('error_msg', error);
            return res.redirect('/admin/categories');
        }

        await category.deleteOne();
        console.log('Category deleted successfully');

        const message = 'Xóa danh mục thành công';
        if (req.xhr || req.headers.accept.includes('json')) {
            return res.json({ success: true, message });
        }
        
        req.flash('success_msg', message);
        res.redirect('/admin/categories');
    } catch (error) {
        console.error('Error deleting category:', error);
        const errorMessage = 'Có lỗi xảy ra khi xóa danh mục';
        if (req.xhr || req.headers.accept.includes('json')) {
            return res.status(500).json({ error: errorMessage });
        }
        req.flash('error_msg', errorMessage);
        res.redirect('/admin/categories');
    }
}; 