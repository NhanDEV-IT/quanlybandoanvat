const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/category.model');
const fs = require('fs').promises;
const path = require('path');

// Hàm xử lý đường dẫn ảnh
function processImagePath(image) {
    if (!image) return '/uploads/products/default.jpg';
    if (image.startsWith('http') || image.startsWith('/uploads')) {
        return image;
    }
    return `/uploads/products/${image}`;
}

// Lấy tất cả sản phẩm (công khai)
exports.getAllProducts = async (req, res) => {
    try {
        console.log('\n=== getAllProducts Start ===');
        console.log('Request query:', req.query);
        console.log('Request params:', req.params);

        const { search, sort = '-createdAt' } = req.query;
        const categoryId = req.params.categoryId;
        let query = { isActive: true };

        // Tìm kiếm theo danh mục
        if (categoryId) {
            query.category = categoryId;
            console.log('Filtering by category:', categoryId);
        }

        // Tìm kiếm theo từ khóa
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
            console.log('Searching with query:', search);
        }

        console.log('Final MongoDB query:', JSON.stringify(query, null, 2));

        // Lấy danh sách danh mục
        const categories = await Category.find().sort('name');
        console.log('Categories:', categories.map(c => ({ 
            id: c._id, 
            name: c.name,
            slug: c.slug 
        })));
        
        // Lấy danh mục hiện tại nếu có
        let selectedCategory = null;
        if (categoryId) {
            selectedCategory = await Category.findById(categoryId);
            console.log('Selected category:', selectedCategory);
            if (!selectedCategory) {
                console.log('Category not found');
                req.flash('error_msg', 'Không tìm thấy danh mục');
                return res.redirect('/products');
            }
        }

        // Lấy sản phẩm với populate category
        console.log('Executing product query with sort:', sort);
        const products = await Product.find(query)
            .populate('category')
            .sort(sort)
            .lean(); // Chuyển sang plain object để dễ log

        console.log('Products found:', products.length);
        if (products.length > 0) {
            console.log('Sample product:', JSON.stringify(products[0], null, 2));
        }

        // Xử lý đường dẫn ảnh cho từng sản phẩm
        const processedProducts = products.map(p => {
            const processed = {
                ...p,
                image: processImagePath(p.image)
            };
            console.log('Processed product:', {
                id: processed._id,
                name: processed.name,
                category: processed.category?.name,
                image: processed.image,
                isActive: processed.isActive
            });
            return processed;
        });

        const renderData = {
            products: processedProducts,
            categories,
            selectedCategory,
            searchTerm: search
        };

        console.log('Rendering data:', {
            productsCount: processedProducts.length,
            categoriesCount: categories.length,
            selectedCategory: selectedCategory ? selectedCategory._id : null,
            searchTerm: search || null
        });

        res.render('products/index', renderData);

        console.log('=== getAllProducts End ===\n');
    } catch (error) {
        console.error('Lỗi khi lấy danh sách sản phẩm:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải danh sách sản phẩm');
        res.redirect('/');
    }
};

// Lấy chi tiết sản phẩm (công khai)
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category');
        if (!product || !product.isActive) {
            req.flash('error_msg', 'Không tìm thấy sản phẩm');
            return res.redirect('/products');
        }
        
        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
            isActive: true
        }).limit(4);

        res.render('products/detail', {
            product: {
                ...product.toObject(),
                image: processImagePath(product.image)
            },
            relatedProducts: relatedProducts.map(p => ({
                ...p.toObject(),
                image: processImagePath(p.image)
            }))
        });
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết sản phẩm:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải thông tin sản phẩm');
        res.redirect('/products');
    }
};

// Lấy danh sách sản phẩm (trang admin)
exports.getAdminProducts = async (req, res) => {
    try {
        const { search, sort = '-createdAt' } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const products = await Product.find(query)
            .populate('category')
            .sort(sort);

        res.render('admin/products/index', {
            products: products.map(p => ({
                ...p.toObject(),
                image: processImagePath(p.image)
            })),
            searchTerm: search,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách sản phẩm:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải danh sách sản phẩm');
        res.redirect('/admin/dashboard');
    }
};

// Hiển thị form tạo sản phẩm
exports.getCreateProduct = async (req, res) => {
    try {
        const categories = await Category.find().sort('name');
        res.render('admin/products/create', {
            categories,
            product: null,
            errors: {},
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (error) {
        console.error('Lỗi khi tải form tạo sản phẩm:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải form');
        res.redirect('/admin/products');
    }
};

// Hàm xử lý xóa file ảnh
async function deleteImage(imagePath) {
    try {
        if (!imagePath || imagePath === '/uploads/products/default.jpg') return;
        const fullPath = path.join(process.cwd(), 'public', imagePath);
        await fs.unlink(fullPath);
    } catch (error) {
        console.error('Lỗi khi xóa file ảnh:', error);
    }
}

// Xử lý tạo sản phẩm mới
exports.createProduct = async (req, res) => {
    try {
        const { name, description, price, category, stock, discount } = req.body;
        
        // Validate input
        const errors = {};
        if (!name || name.trim().length < 2) {
            errors.name = 'Tên sản phẩm phải có ít nhất 2 ký tự';
        }
        if (!description || description.trim().length === 0) {
            errors.description = 'Mô tả không được để trống';
        }
        if (!price || price <= 0) {
            errors.price = 'Giá phải lớn hơn 0';
        }
        if (!stock || stock < 0) {
            errors.stock = 'Số lượng không được âm';
        }
        if (!category) {
            errors.category = 'Vui lòng chọn danh mục';
        }

        // Nếu có lỗi, render lại form với thông báo lỗi
        if (Object.keys(errors).length > 0) {
            const categories = await Category.find().sort('name');
            return res.render('admin/products/create', {
                product: req.body,
                categories,
                errors,
                success_msg: req.flash('success_msg'),
                error_msg: 'Vui lòng kiểm tra lại thông tin'
            });
        }

        const imagePath = req.file 
            ? '/uploads/products/' + req.file.filename 
            : '/uploads/products/default.jpg';

        const product = new Product({
            name: name.trim(),
            description: description.trim(),
            price: parseFloat(price),
            stock: parseInt(stock),
            category,
            discount: parseInt(discount) || 0,
            image: imagePath
        });

        await product.save();
        req.flash('success_msg', 'Thêm sản phẩm mới thành công');
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Lỗi khi tạo sản phẩm:', error);
        if (req.file) {
            await deleteImage('/uploads/products/' + req.file.filename);
        }
        req.flash('error_msg', 'Có lỗi xảy ra khi tạo sản phẩm');
        res.redirect('/admin/products/create');
    }
};

// Hiển thị form chỉnh sửa
exports.getEditProduct = async (req, res) => {
    try {
        console.log('Edit Product ID:', req.params.id);
        
        const [product, categories] = await Promise.all([
            Product.findById(req.params.id).populate('category'),
            Category.find().sort('name')
        ]);

        if (!product) {
            console.log('Product not found');
            req.flash('error_msg', 'Không tìm thấy sản phẩm');
            return res.redirect('/admin/products');
        }

        console.log('Rendering edit form with product:', {
            id: product._id,
            name: product.name
        });

        res.render('admin/products/edit', {
            product: {
                ...product.toObject(),
                _id: product._id.toString(), // Ensure ID is a string
                image: processImagePath(product.image)
            },
            categories,
            errors: {},
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (error) {
        console.error('Lỗi khi tải form chỉnh sửa:', error);
        req.flash('error_msg', 'Có lỗi xảy ra khi tải thông tin sản phẩm');
        res.redirect('/admin/products');
    }
};

// Xử lý cập nhật sản phẩm
exports.updateProduct = async (req, res) => {
    try {
        console.log('\n=== Update Product Start ===');
        console.log('Request Method:', req.method);
        console.log('Original Method:', req.originalMethod);
        console.log('Request Headers:', req.headers);
        console.log('Request Body:', {
            ...req.body,
            _csrf: '***hidden***'  // Hide CSRF token in logs
        });
        console.log('Request Params:', req.params);
        console.log('Request File:', req.file);

        const { name, description, price, category, stock, discount } = req.body;
        
        // Validate input
        const errors = {};
        if (!name || name.trim().length < 2) errors.name = 'Tên sản phẩm phải có ít nhất 2 ký tự';
        if (!description || description.trim().length === 0) errors.description = 'Mô tả không được để trống';
        if (!price || price <= 0) errors.price = 'Giá phải lớn hơn 0';
        if (!stock || stock < 0) errors.stock = 'Số lượng không được âm';
        if (!category) errors.category = 'Vui lòng chọn danh mục';

        console.log('Validation Results:', {
            hasErrors: Object.keys(errors).length > 0,
            errors
        });

        if (Object.keys(errors).length > 0) {
            console.log('Validation failed, rendering form with errors');
            const categories = await Category.find().sort('name');
            return res.render('admin/products/edit', {
                product: { 
                    _id: req.params.id,
                    name, description, price, category, stock, discount,
                    image: req.file ? `/uploads/products/${req.file.filename}` : undefined
                },
                categories,
                errors,
                error_msg: 'Vui lòng kiểm tra lại thông tin'
            });
        }

        console.log('Finding existing product:', req.params.id);
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            console.log('Product not found');
            req.flash('error_msg', 'Không tìm thấy sản phẩm');
            return res.redirect('/admin/products');
        }

        const updateData = {
            name: name.trim(),
            description: description.trim(),
            price: parseFloat(price),
            stock: parseInt(stock),
            category,
            discount: parseInt(discount) || 0
        };

        console.log('Update data:', updateData);

        if (req.file) {
            console.log('New image file:', req.file.filename);
            if (product.image && product.image !== '/uploads/products/default.jpg') {
                console.log('Deleting old image:', product.image);
                await deleteImage(product.image);
            }
            updateData.image = '/uploads/products/' + req.file.filename;
        }

        console.log('Updating product in database...');
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        console.log('Product updated successfully:', updatedProduct);
        req.flash('success_msg', 'Cập nhật sản phẩm thành công');
        
        console.log('=== Update Product End ===\n');
        return res.redirect('/admin/products');
    } catch (error) {
        console.error('Error in updateProduct:', {
            message: error.message,
            stack: error.stack,
            body: req.body,
            file: req.file
        });

        if (req.file) {
            await deleteImage('/uploads/products/' + req.file.filename);
        }

        req.flash('error_msg', 'Có lỗi xảy ra khi cập nhật sản phẩm');
        res.redirect(`/admin/products/${req.params.id}/edit`);
    }
};

// Xử lý xóa sản phẩm
exports.deleteProduct = async (req, res) => {
    try {
        console.log('Deleting product:', req.params.id);
        
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            console.log('Product not found');
            return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        }

        // Kiểm tra xem sản phẩm có trong đơn hàng nào không
        const orders = await Order.find({ 'items.product': product._id });
        if (orders.length > 0) {
            console.log('Product is in orders, setting isActive to false');
            // Nếu có, chỉ đánh dấu là không còn hoạt động
            product.isActive = false;
            await product.save();
        } else {
            console.log('Product is not in any order, deleting completely');
            // Nếu không, xóa hoàn toàn
            if (product.image && product.image !== '/uploads/products/default.jpg') {
                await deleteImage(product.image);
            }
            await product.deleteOne();
        }

        console.log('Product deleted successfully');
        return res.json({ message: 'Xóa sản phẩm thành công' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Có lỗi xảy ra khi xóa sản phẩm' });
    }
}; 