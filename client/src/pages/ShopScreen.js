
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Search, Filter, LogIn, LogOut, User, ArrowLeft, History, Key, Sliders } from 'lucide-react'; // Thêm icon Key
import { getProducts, getCategories } from '../services/api';
import { formatCurrency, normalizeSearchableValue } from '../utils/helpers';

// Component ShopScreen nhận props để xử lý giao diện
export const ShopScreen = ({ setPath, isLoggedIn, currentUser, onLogout }) => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('none'); // 'asc' | 'desc' | 'none'
    const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in' | 'out'
    const [attrFilters, setAttrFilters] = useState({ size: '', color: '', material: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [cartCount, setCartCount] = useState(0);
    const [showCart, setShowCart] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [showQuickCheckout, setShowQuickCheckout] = useState(false);
    const [quickCheckoutItem, setQuickCheckoutItem] = useState(null);
    const [quickCheckoutQty, setQuickCheckoutQty] = useState(1);
    const [quickSelectedSize, setQuickSelectedSize] = useState('');
    const [quickSelectedColor, setQuickSelectedColor] = useState('');

    // Tải dữ liệu (Giữ nguyên logic cũ)
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodData, catData] = await Promise.all([
                    getProducts(),
                    getCategories().catch(() => [])
                ]);
                setProducts(prodData.filter(p => p.isActive));
                setCategories(catData);
                // init cart count from localStorage
                try {
                    const existing = JSON.parse(localStorage.getItem('cart') || '[]');
                    setCartCount(existing.length);
                } catch (e) {
                    setCartCount(0);
                }
            } catch (error) {
                console.error("Lỗi tải dữ liệu shop:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
        // listen for cart updates from other pages/components
        const onCartUpdated = () => {
            try {
                const existing = JSON.parse(localStorage.getItem('cart') || '[]');
                setCartCount(existing.length);
            } catch (e) {
                setCartCount(0);
            }
        };
        const onOpenCart = () => openCart();
        const onQuickBuy = (e) => {
            const item = e && e.detail ? e.detail : null;
            if (!item) return;
            // initialize size/color selections if available
            const prod = item;
            const sizes = (prod.sizes || prod.size || '').toString().split(',').map(s=>s.trim()).filter(Boolean);
            const colors = (prod.colors || prod.color || '').toString().split(',').map(s=>s.trim()).filter(Boolean);
            setQuickSelectedSize(sizes.length ? (item.size || sizes[0]) : '');
            setQuickSelectedColor(colors.length ? (item.color || colors[0]) : '');
            setQuickCheckoutItem({...item, _sizes: sizes, _colors: colors});
            setQuickCheckoutQty(item.qty || 1);
            setShowQuickCheckout(true);
        };
        window.addEventListener('cartUpdated', onCartUpdated);
        window.addEventListener('openCart', onOpenCart);
        window.addEventListener('quickBuy', onQuickBuy);
        return () => {
            window.removeEventListener('cartUpdated', onCartUpdated);
            window.removeEventListener('openCart', onOpenCart);
            window.removeEventListener('quickBuy', onQuickBuy);
        };
    }, []);

    const filteredProducts = useMemo(() => {
        let list = products.filter(p => {
            const matchCat = selectedCategory === 'All' || p.category_id === parseInt(selectedCategory);
            const q = normalizeSearchableValue(searchTerm);
            const matchSearch = !q || normalizeSearchableValue(p.name).includes(q) || normalizeSearchableValue(p.id || p.product_id || '').includes(q);
            // attributes filtering (support CSV in p.sizes / p.colors or single values)
            const prodSizes = (p.sizes || p.size || '').toString().split(',').map(s=>s.trim()).filter(Boolean).map(s=>s.toLowerCase());
            const prodColors = (p.colors || p.color || '').toString().split(',').map(s=>s.trim()).filter(Boolean).map(s=>s.toLowerCase());
            const prodMaterial = (p.material || '').toString().trim().toLowerCase();
            const matchSize = !attrFilters.size || prodSizes.includes(String(attrFilters.size).toLowerCase());
            const matchColor = !attrFilters.color || prodColors.includes(String(attrFilters.color).toLowerCase());
            const matchMaterial = !attrFilters.material || (prodMaterial && prodMaterial === String(attrFilters.material).toLowerCase());
            // stock filter
            const inStock = (p.stockQuantity || p.stock_quantity || 0) > 0;
            const matchStock = stockFilter === 'all' || (stockFilter === 'in' && inStock) || (stockFilter === 'out' && !inStock);

            return matchCat && matchSearch && matchSize && matchColor && matchMaterial && matchStock;
        });

        // sorting
        if (sortOrder === 'asc') {
            list = list.sort((a, b) => (Number(a.price || a.price) || 0) - (Number(b.price || b.price) || 0));
        } else if (sortOrder === 'desc') {
            list = list.sort((a, b) => (Number(b.price || b.price) || 0) - (Number(a.price || a.price) || 0));
        }

        return list;
    }, [products, selectedCategory, searchTerm, sortOrder, stockFilter, attrFilters]);

    const getProductReviews = (prod) => {
        let revs = [];
        if (prod.reviews && Array.isArray(prod.reviews)) revs = revs.concat(prod.reviews);
        try {
            const fromStorage = JSON.parse(localStorage.getItem(`reviews_${prod.id}`) || '[]');
            if (Array.isArray(fromStorage) && fromStorage.length) revs = revs.concat(fromStorage);
        } catch (e) {}
        return revs;
    };

    const avgFor = (prod) => {
        const r = getProductReviews(prod);
        if (!r.length) return null;
        const avg = r.reduce((s, it) => s + (Number(it.rating)||0), 0) / r.length;
        return avg;
    };

    const handleAddToCart = (product) => {
        try {
            const sizes = (product.sizes || product.size || '').toString().split(',').map(s=>s.trim()).filter(Boolean);
            const colors = (product.colors || product.color || '').toString().split(',').map(s=>s.trim()).filter(Boolean);
            // If product has options, open quick checkout modal to choose
            if (sizes.length || colors.length) {
                setQuickSelectedSize(sizes.length ? sizes[0] : '');
                setQuickSelectedColor(colors.length ? colors[0] : '');
                setQuickCheckoutItem({ id: product.id, name: product.name, price: product.price, _sizes: sizes, _colors: colors });
                setQuickCheckoutQty(1);
                setShowQuickCheckout(true);
                return;
            }

            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const item = {
                id: product.id,
                name: product.name,
                price: product.price,
                qty: 1,
            };
            cart.push(item);
            localStorage.setItem('cart', JSON.stringify(cart));
            setCartCount(cart.length);
            try { window.dispatchEvent(new Event('cartUpdated')); } catch (e) {}
        } catch (e) {
            console.error('Failed to add to cart', e);
        }
    };

    const handleBuyNow = (product) => {
        // Open quick-checkout modal for this single product without changing saved cart
        const sizes = (product.sizes || product.size || '').toString().split(',').map(s=>s.trim()).filter(Boolean);
        const colors = (product.colors || product.color || '').toString().split(',').map(s=>s.trim()).filter(Boolean);
        setQuickSelectedSize(sizes.length ? sizes[0] : '');
        setQuickSelectedColor(colors.length ? colors[0] : '');
        setQuickCheckoutItem({ id: product.id, name: product.name, price: product.price, _sizes: sizes, _colors: colors });
        setQuickCheckoutQty(1);
        setShowQuickCheckout(true);
    };

    const closeQuickCheckout = () => {
        setShowQuickCheckout(false);
        setQuickCheckoutItem(null);
        setQuickCheckoutQty(1);
    };

    const confirmQuickCheckout = () => {
        // Placeholder for checkout flow for the single item
        closeQuickCheckout();
        alert('Chuyển đến trang thanh toán cho sản phẩm này (chức năng chưa có).');
    };

    const quickAddToCart = () => {
        // Add the current quick item to persistent cart (user choice)
        try {
            const existing = JSON.parse(localStorage.getItem('cart') || '[]');
            const toAdd = { 
                id: quickCheckoutItem.id,
                name: quickCheckoutItem.name,
                price: quickCheckoutItem.price,
                qty: quickCheckoutQty,
                size: quickSelectedSize || null,
                color: quickSelectedColor || null,
            };
            existing.push(toAdd);
            localStorage.setItem('cart', JSON.stringify(existing));
            setCartCount(existing.length);
            window.dispatchEvent(new Event('cartUpdated'));
            closeQuickCheckout();
        } catch (e) { console.error('quickAddToCart failed', e); }
    };

    const openCart = () => {
        try {
            const existing = JSON.parse(localStorage.getItem('cart') || '[]');
            setCartItems(existing);
        } catch (e) {
            setCartItems([]);
        }
        setShowCart(true);
    };

    const closeCart = () => setShowCart(false);

    const updateCartItem = (index, newItem) => {
        const copy = [...cartItems];
        copy[index] = newItem;
        setCartItems(copy);
        localStorage.setItem('cart', JSON.stringify(copy));
        setCartCount(copy.length);
        window.dispatchEvent(new Event('cartUpdated'));
    };

    const removeCartItem = (index) => {
        const copy = [...cartItems];
        copy.splice(index, 1);
        setCartItems(copy);
        localStorage.setItem('cart', JSON.stringify(copy));
        setCartCount(copy.length);
        window.dispatchEvent(new Event('cartUpdated'));
    };

    const cartTotal = cartItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            
            {/* HEADER LINH HOẠT */}
            <header className="bg-white shadow-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    
                    {/* Logo & Back */}
                    <div className="flex items-center cursor-pointer" onClick={() => setPath(isLoggedIn ? '/shop' : '/')}>
                        {/* Nếu chưa đăng nhập thì hiện nút Back về Gateway, nếu đã đăng nhập thì click logo reload trang shop */}
                        {!isLoggedIn && <ArrowLeft className="w-6 h-6 text-gray-500 mr-2" />}
                        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            AuraStore
                        </span>
                    </div>

                    {/* Search Bar (Desktop) */}
                    <div className="hidden md:block flex-1 max-w-xl mx-8">
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm sản phẩm..." 
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                        </div>
                    </div>

                    {/* ACTIONS KHI ĐÃ / CHƯA ĐĂNG NHẬP */}
                    <div className="flex items-center space-x-4">
                        
                        {/* Giỏ hàng (Luôn hiện) */}
                        <div onClick={openCart} className="relative cursor-pointer p-2 hover:bg-gray-100 rounded-full">
                            <ShoppingCart className="w-6 h-6 text-gray-700" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                    {cartCount}
                                </span>
                            )}
                        </div>

                        {isLoggedIn ? (
                            // --- GIAO DIỆN ĐÃ ĐĂNG NHẬP (KHÁCH HÀNG) ---
                            <>
                                {/* Nút Lịch sử mua hàng */}
                                <button 
                                    onClick={() => alert("Chức năng xem đơn hàng cũ đang phát triển!")} // Hoặc setPath('/my-orders')
                                    className="hidden sm:flex items-center text-gray-600 hover:text-indigo-600 font-medium transition"
                                    title="Lịch sử mua hàng"
                                >
                                    <History className="w-5 h-5 mr-1" />
                                    <span className="hidden lg:inline">Đơn hàng</span>
                                </button>

                                {/* Thông tin User & Logout */}
                                <div className="flex items-center space-x-2 pl-3 border-l border-gray-200">
                                    <button 
                                                    onClick={() => setPath('/profile')} 
                                                    title="Hồ sơ cá nhân" 
                                                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition duration-150"
                                                >
                                                    <User className="w-5 h-5 text-gray-500" />
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-sm font-medium text-gray-800">{currentUser?.fullName || 'Guest'}</p>
                                                        <p className="text-xs text-blue-600 font-semibold">{currentUser?.roleName || 'Chưa đăng nhập'}</p>
                                                    </div>
                                                </button>

                                    {/* Nút Đăng xuất */}
                                    <button 
                                        onClick={onLogout}
                                        title="Đăng xuất"
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            // --- GIAO DIỆN CHƯA ĐĂNG NHẬP (KHÁCH VÃNG LAI) ---
                            <button 
                                onClick={() => setPath('/login')}
                                className="flex items-center px-5 py-2 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition shadow-sm hover:shadow-md"
                            >
                                <LogIn className="w-4 h-4 mr-2" /> 
                                Đăng nhập/ Đăng ký
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* --- BODY (Giữ nguyên phần hiển thị sản phẩm) --- */}
            <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
                
                {/* SIDEBAR DANH MỤC */}
                <aside className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white p-4 rounded-xl shadow-sm sticky top-16 h-[calc(100vh-4rem)] flex flex-col">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                            <Filter className="w-5 h-5 mr-2" /> Danh mục
                        </h3>
                        <ul className="space-y-1 overflow-y-auto flex-1 custom-scrollbar">
                            <li>
                                <button onClick={() => setSelectedCategory('All')} className={`w-full text-left px-3 py-2 rounded-md transition ${selectedCategory === 'All' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                                    Tất cả sản phẩm
                                </button>
                            </li>
                            {categories.map(cat => (
                                <li key={cat.category_id}>
                                    <button onClick={() => setSelectedCategory(cat.category_id)} className={`w-full text-left px-3 py-2 rounded-md transition ${selectedCategory === cat.category_id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                                            {cat.category_name}
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {/* Filters: price sort, stock status, attributes */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center"><Sliders className="w-4 h-4 mr-2 text-gray-500"/> Bộ lọc nâng cao</h4>

                            <div className="mb-3">
                                <label className="block text-xs text-gray-500 mb-1">Sắp xếp theo giá</label>
                                <select value={sortOrder} onChange={(e)=>setSortOrder(e.target.value)} className="w-full py-1.5 px-2 rounded-md border border-gray-200 text-sm">
                                    <option value="none">Mặc định</option>
                                    <option value="asc">Giá: Thấp → Cao</option>
                                    <option value="desc">Giá: Cao → Thấp</option>
                                </select>
                            </div>

                            <div className="mb-3">
                                <label className="block text-xs text-gray-500 mb-1">Trạng thái kho</label>
                                <div className="flex gap-2">
                                    <button onClick={()=>setStockFilter('all')} className={`text-sm px-2 py-1 rounded ${stockFilter==='all'?'bg-indigo-50 text-indigo-700':'bg-gray-100 text-gray-700'}`}>Tất cả</button>
                                    <button onClick={()=>setStockFilter('in')} className={`text-sm px-2 py-1 rounded ${stockFilter==='in'?'bg-indigo-50 text-indigo-700':'bg-gray-100 text-gray-700'}`}>Còn hàng</button>
                                    <button onClick={()=>setStockFilter('out')} className={`text-sm px-2 py-1 rounded ${stockFilter==='out'?'bg-indigo-50 text-indigo-700':'bg-gray-100 text-gray-700'}`}>Hết hàng</button>
                                </div>
                            </div>

                            <div className="mb-2">
                                <label className="block text-xs text-gray-500 mb-1">Kích cỡ</label>
                                <select value={attrFilters.size} onChange={(e)=>setAttrFilters({...attrFilters,size:e.target.value})} className="w-full py-1.5 px-2 rounded-md border border-gray-200 text-sm">
                                    <option value="">Tất cả</option>
                                    <option value="S">S</option>
                                    <option value="M">M</option>
                                    <option value="L">L</option>
                                    <option value="XL">XL</option>
                                </select>
                            </div>

                            <div className="mb-2">
                                <label className="block text-xs text-gray-500 mb-1">Màu sắc</label>
                                <select value={attrFilters.color} onChange={(e)=>setAttrFilters({...attrFilters,color:e.target.value})} className="w-full py-1.5 px-2 rounded-md border border-gray-200 text-sm">
                                    <option value="">Tất cả</option>
                                    <option value="Đỏ">Đỏ</option>
                                    <option value="Xanh">Xanh</option>
                                    <option value="Đen">Đen</option>
                                    <option value="Trắng">Trắng</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Chất liệu</label>
                                <select value={attrFilters.material} onChange={(e)=>setAttrFilters({...attrFilters,material:e.target.value})} className="w-full py-1.5 px-2 rounded-md border border-gray-200 text-sm">
                                    <option value="">Tất cả</option>
                                    <option value="Cotton">Cotton</option>
                                    <option value="Polyester">Polyester</option>
                                    <option value="Len">Len</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* GRID SẢN PHẨM */}
                <main className="flex-1">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        {selectedCategory === 'All' ? 'Sản phẩm nổi bật' : categories.find(c => c.category_id === selectedCategory)?.category_name}
                    </h2>

                    {isLoading ? (
                        <div className="text-center py-20 text-gray-500">Đang tải sản phẩm...</div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl shadow-sm">
                            <p className="text-gray-500">Không tìm thấy sản phẩm nào.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredProducts.map(product => (
                                <div 
                                    key={product.id} 
                                    onClick={(e) => {
                                        // Nếu click vào button bên trong thì bỏ qua
                                        if (e.target.closest('button')) return;

                                        // Nếu sản phẩm có kích thước/màu sắc -> mở Quick Checkout để chọn tuỳ chọn
                                        const rawSizes = (product.sizes || product.size || '').toString();
                                        const rawColors = (product.colors || product.color || '').toString();
                                        const sizes = rawSizes.split(',').map(s=>s.trim()).filter(Boolean);
                                        const colors = rawColors.split(',').map(s=>s.trim()).filter(Boolean);

                                        if (sizes.length || colors.length) {
                                            setQuickSelectedSize(sizes.length ? sizes[0] : '');
                                            setQuickSelectedColor(colors.length ? colors[0] : '');
                                            setQuickCheckoutItem({ id: product.id, name: product.name, price: product.price, _sizes: sizes, _colors: colors });
                                            setQuickCheckoutQty(1);
                                            setShowQuickCheckout(true);
                                            return;
                                        }

                                        // Ngược lại: điều hướng đến trang chi tiết
                                        const productId = product.id || product.product_id;
                                        if (productId) {
                                            console.log('🛒 Navigating to product:', productId);
                                            setPath(`/product/${encodeURIComponent(productId)}`);
                                        } else {
                                            console.error('❌ Product ID is missing:', product);
                                            alert('Lỗi: Không tìm thấy ID sản phẩm');
                                        }
                                    }}
                                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer hover:border-[#D4AF37]"
                                >
                                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                                        <img 
                                            src={`https://placehold.co/400x300/eef2ff/4f46e5?text=${encodeURIComponent(product.name.substring(0, 20))}`} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">{product.categoryName || 'Sản phẩm'}</div>
                                            <div className={`text-xs font-medium px-2 py-1 rounded-full ${((product.stockQuantity||product.stock_quantity||0)>0)?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                                                {(product.stockQuantity||product.stock_quantity||0)>0?`Còn ${(product.stockQuantity||product.stock_quantity)}`:'Hết'}
                                            </div>
                                        </div>
                                        <h3 className="text-gray-900 font-semibold text-base line-clamp-2 mb-2 flex-grow group-hover:text-[#D4AF37] transition-colors" title={product.name}>
                                            {product.name}
                                        </h3>
                                        <div className="flex items-center mb-3">
                                            <span className="text-sm text-yellow-500 font-semibold">{(avgFor(product)||0).toFixed ? (avgFor(product)?avgFor(product).toFixed(1):'—') : '—'}</span>
                                            <span className="text-xs text-gray-400 ml-2">{getProductReviews(product).length ? `(${getProductReviews(product).length})` : ''}</span>
                                        </div>
                                        <div className="mt-auto">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xl font-bold text-[#D4AF37]">{formatCurrency(product.price)}</span>
                                            </div>

                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddToCart(product);
                                                    }} 
                                                    className="flex-1 text-sm px-3 py-2 h-10 flex items-center justify-center rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-white hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
                                                >
                                                    Thêm vào giỏ
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleBuyNow(product);
                                                    }} 
                                                    className="flex-1 text-sm px-3 py-2 h-10 flex items-center justify-center rounded-lg bg-gray-900 text-white hover:bg-gray-800 transform hover:scale-105 transition-all duration-200 font-medium"
                                                >
                                                    Mua ngay
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

                        {/* Quick Checkout Modal (single-item purchase, does NOT modify persistent cart) */}
                        {showQuickCheckout && quickCheckoutItem && (
                            <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
                                <div className="fixed inset-0 bg-black opacity-50" onClick={closeQuickCheckout} />
                                <div className="relative bg-white w-full max-w-md rounded-lg shadow-lg p-4 z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-semibold">Mua ngay - {quickCheckoutItem.name}</h3>
                                        <button onClick={closeQuickCheckout} className="text-gray-500 hover:text-gray-700">Đóng</button>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium">{quickCheckoutItem.name}</div>
                                            <div className="text-sm text-gray-500">{formatCurrency(quickCheckoutItem.price)}</div>
                                        </div>

                                                    {/* Option selectors (size/color) if available */}
                                                    {quickCheckoutItem._sizes && quickCheckoutItem._sizes.length > 0 && (
                                                        <div>
                                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Kích cỡ</label>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {quickCheckoutItem._sizes.map(s => (
                                                                    <button key={s} onClick={()=>setQuickSelectedSize(s)} className={`px-3 py-1 rounded border ${quickSelectedSize===s? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-gray-200 text-gray-700'}`}>
                                                                        {s}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {quickCheckoutItem._colors && quickCheckoutItem._colors.length > 0 && (
                                                        <div>
                                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Màu sắc</label>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {quickCheckoutItem._colors.map(c => (
                                                                    <button key={c} onClick={()=>setQuickSelectedColor(c)} className={`px-3 py-1 rounded border ${quickSelectedColor===c? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-gray-200 text-gray-700'}`}>
                                                                        {c}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        <label className="text-sm">Số lượng</label>
                                                        <input type="number" value={quickCheckoutQty} min={1} className="w-20 border rounded px-2 py-1" onChange={(e)=>setQuickCheckoutQty(Math.max(1, Number(e.target.value) || 1))} />
                                                    </div>

                                        <div className="flex items-center justify-between pt-3 border-t">
                                            <div className="font-semibold">Tổng tạm tính</div>
                                            <div className="font-semibold text-lg text-red-600">{formatCurrency((Number(quickCheckoutItem.price)||0) * quickCheckoutQty)}</div>
                                        </div>

                                        <div className="flex justify-end gap-2 mt-4">
                                            <button onClick={quickAddToCart} className="px-4 py-2 border rounded">Thêm vào giỏ hàng</button>
                                            <button onClick={confirmQuickCheckout} className="px-4 py-2 bg-indigo-600 text-white rounded">Thanh toán cho món này</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

            {/* Cart Modal */}
            {showCart && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
                    <div className="fixed inset-0 bg-black opacity-50" onClick={closeCart} />
                    <div className="relative bg-white w-full max-w-2xl rounded-lg shadow-lg p-4 z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Giỏ hàng</h3>
                            <button onClick={closeCart} className="text-gray-500 hover:text-gray-700">Đóng</button>
                        </div>

                        {cartItems.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">Giỏ hàng trống</div>
                        ) : (
                            <div className="space-y-3">
                                        {cartItems.map((it, idx) => (
                                            <div key={idx} className="flex items-center justify-between border rounded p-3">
                                                <div>
                                                    <div className="font-medium">{it.name}</div>
                                                    <div className="text-sm text-gray-500">{formatCurrency(it.price)} x {it.qty}</div>
                                                    {it.size && <div className="text-sm text-gray-600 mt-1">Kích cỡ: <span className="font-medium">{it.size}</span></div>}
                                                    {it.color && <div className="text-sm text-gray-600">Màu sắc: <span className="font-medium">{it.color}</span></div>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input type="number" value={it.qty} min={1} className="w-16 border rounded px-2 py-1 text-center" onChange={(e)=>{
                                                        const newQty = Math.max(1, Number(e.target.value) || 1);
                                                        updateCartItem(idx, {...it, qty: newQty});
                                                    }} />
                                                    <div className="text-sm font-medium">{formatCurrency((Number(it.price)||0) * (Number(it.qty)||0))}</div>
                                                    <button onClick={()=>removeCartItem(idx)} className="text-sm text-red-600 ml-2">Xóa</button>
                                                </div>
                                            </div>
                                        ))}

                                <div className="flex items-center justify-between pt-3 border-t">
                                    <div className="font-semibold">Tổng</div>
                                    <div className="font-semibold text-lg text-red-600">{formatCurrency(cartTotal)}</div>
                                </div>

                                <div className="flex justify-end gap-2 mt-4">
                                    <button onClick={closeCart} className="px-4 py-2 border rounded">Tiếp tục mua</button>
                                    <button onClick={()=>alert('Chức năng thanh toán chưa được triển khai')} className="px-4 py-2 bg-indigo-600 text-white rounded">Thanh toán</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
