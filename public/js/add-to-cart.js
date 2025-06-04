document.addEventListener('DOMContentLoaded', function() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const productId = this.dataset.id;
            const productName = this.dataset.name;
            const productPrice = parseFloat(this.dataset.price);
            const productImage = this.dataset.image;
            
            // Đảm bảo đường dẫn ảnh đầy đủ
            const fullImagePath = productImage.startsWith('http') ? productImage : 
                                productImage.startsWith('/') ? productImage : 
                                '/uploads/products/' + productImage;
            
            // Lấy giỏ hàng hiện tại từ localStorage
            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            
            // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
            const existingItemIndex = cart.findIndex(item => item.id === productId);
            
            if (existingItemIndex > -1) {
                // Nếu sản phẩm đã có trong giỏ, tăng số lượng
                cart[existingItemIndex].quantity += 1;
            } else {
                // Nếu sản phẩm chưa có trong giỏ, thêm mới
                cart.push({
                    id: productId,
                    name: productName,
                    price: productPrice,
                    image: fullImagePath,
                    quantity: 1
                });
            }
            
            // Lưu giỏ hàng vào localStorage
            localStorage.setItem('cart', JSON.stringify(cart));
            
            // Hiển thị thông báo
            const toast = new bootstrap.Toast(document.getElementById('cartToast'));
            document.getElementById('cartToastBody').textContent = 'Đã thêm ' + productName + ' vào giỏ hàng';
            toast.show();
            
            // Cập nhật số lượng sản phẩm trong giỏ hàng trên header
            updateCartCount();
        });
    });
    
    // Hàm cập nhật số lượng sản phẩm trong giỏ hàng
    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'inline-block' : 'none';
        }
    }
    
    // Cập nhật số lượng khi trang được tải
    updateCartCount();
}); 