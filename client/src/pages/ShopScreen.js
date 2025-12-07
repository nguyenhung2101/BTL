
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Search, LogIn, LogOut, User, ArrowLeft, History } from 'lucide-react';
import { getProducts, getCategories } from '../services/api';
import { formatCurrency, normalizeSearchableValue } from '../utils/helpers';

// Component ShopScreen nhận props để xử lý giao diện
export const ShopScreen = ({ setPath, isLoggedIn, currentUser, onLogout }) => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder] = useState('none'); // 'asc' | 'desc' | 'none'
    const [stockFilter] = useState('all'); // 'all' | 'in' | 'out'
    const [attrFilters] = useState({ size: '', color: '', material: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [cartCount, setCartCount] = useState(0);
    const [showCart, setShowCart] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [showQuickCheckout, setShowQuickCheckout] = useState(false);
    const [quickCheckoutItem, setQuickCheckoutItem] = useState(null);
    const [quickCheckoutQty, setQuickCheckoutQty] = useState(1);
    const [showAddedModal, setShowAddedModal] = useState(false);
    const [addedProduct, setAddedProduct] = useState(null);
    const [showSelectModal, setShowSelectModal] = useState(false);
    const [selectProduct, setSelectProduct] = useState(null);
    const [selectSize, setSelectSize] = useState('');
    const [selectColor, setSelectColor] = useState('');
    const [selectQty, setSelectQty] = useState(1);
    const [goCheckoutAfterAdd, setGoCheckoutAfterAdd] = useState(false);

    // Fallback hình ảnh cho sản phẩm (khi backend chưa có image_url)
    // Map ảnh fallback theo product_id và category, để luôn có ảnh nếu DB chưa đủ dữ liệu
    const imageCatalog = useMemo(() => ({
        // ví dụ ánh xạ id sản phẩm -> url ảnh (thay bằng id thực trong DB của bạn)
        PRD1: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=60',
        PRD2: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=60',
        PRD3: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=60',
        PRD4: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=60',
        PRD5: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=60',
    }), []);

    const defaultImages = useMemo(() => ({
        chairs: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=60',
        sofa: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=60',
        table: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=60',
        decor: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=60',
        fashion: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=60',
    }), []);

    const placeholder = 'https://placehold.co/400x300/eef2ff/ff5c00?text=No+Image';
    const getProductImage = (product) => {
        if (product?.image_url) return product.image_url; // từ DB product_images
        if (product?.id && imageCatalog[product.id]) return imageCatalog[product.id];
        if (product?.category_id && defaultImages[product.category_id]) return defaultImages[product.category_id];
        return placeholder;
    };

    // Tải dữ liệu (Giữ nguyên logic cũ)
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodData, catData] = await Promise.all([
                    getProducts(),
                    getCategories().catch(() => [])
                ]);
                const normalized = (prodData || []).map(p => {
                    const variants = Array.isArray(p.variants) ? p.variants : [];
                    const stockQty = variants.reduce((s, v) => s + (Number(v.stock_quantity) || 0), 0);
                    const price = (variants[0]?.price) ?? p.base_price ?? p.price ?? 0;
                    const imageUrl = p.image_url || variants[0]?.image_url;
                    const colors = [...new Set(variants.map(v => v.color).filter(Boolean))].join(',');
                    const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))].join(',');
                    return {
                        ...p,
                        id: p.product_id || p.id,
                        category_id: p.category_id,
                        price,
                        image_url: imageUrl,
                        stock_quantity: stockQty,
                        stockQuantity: stockQty,
                        colors,
                        sizes,
                        isActive: p.isActive ?? true,
                    };
                });
                setProducts(normalized.filter(p => p.isActive));
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
            setQuickCheckoutItem(item);
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

    const startAddToCart = (product) => {
        const variants = Array.isArray(product.variants) ? product.variants : [];
        const firstVariant = variants[0] || {};
        setSelectProduct(product);
        setSelectSize(firstVariant.size || product.size || '');
        setSelectColor(firstVariant.color || product.color || '');
        setSelectQty(1);
        setGoCheckoutAfterAdd(false);
        setShowSelectModal(true);
    };

    const handleBuyNow = (product) => {
        const variants = Array.isArray(product.variants) ? product.variants : [];
        const firstVariant = variants[0] || {};
        setSelectProduct(product);
        setSelectSize(firstVariant.size || product.size || '');
        setSelectColor(firstVariant.color || product.color || '');
        setSelectQty(1);
        setGoCheckoutAfterAdd(true);
        setShowSelectModal(true);
    };

    const closeSelectModal = () => {
        setShowSelectModal(false);
        setGoCheckoutAfterAdd(false);
    };

    const confirmAddToCart = () => {
        if (!selectProduct) return;
        try {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const variants = Array.isArray(selectProduct.variants) ? selectProduct.variants : [];
            const norm = (val) => String(val || '').trim().toLowerCase();
            const targetSize = norm(selectSize);
            const targetColor = norm(selectColor);
            const matched = variants.find(v => (
                (!targetSize || norm(v.size) === targetSize) && (!targetColor || norm(v.color) === targetColor)
            )) || variants.find(v => norm(v.size) === targetSize || norm(v.color) === targetColor) || variants[0] || {};

            const price = matched.price ?? selectProduct.price;
            const normalizedSize = (selectSize || matched.size || '').trim();
            const normalizedColor = (selectColor || matched.color || '').trim();
            const item = {
                id: selectProduct.id,
                name: selectProduct.name,
                price,
                qty: Number(selectQty) || 1,
                image_url: getProductImage(selectProduct),
                size: normalizedSize,
                color: normalizedColor,
                variantId: matched.variant_id || matched.variantId || null,
            };

            const existingIndex = cart.findIndex(
                (it) => it.id === item.id && (it.size || '') === normalizedSize && (it.color || '') === normalizedColor
            );

            if (existingIndex >= 0) {
                const existingItem = cart[existingIndex];
                const updatedQty = (Number(existingItem.qty) || 0) + (Number(selectQty) || 1);
                const updatedItem = { ...existingItem, ...item, qty: updatedQty };
                cart[existingIndex] = updatedItem;
                setAddedProduct(updatedItem);
            } else {
                cart.push(item);
                setAddedProduct(item);
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            setCartCount(cart.length);
            setShowSelectModal(false);
            if (goCheckoutAfterAdd) {
                setGoCheckoutAfterAdd(false);
                setPath('/checkout');
            } else {
                setShowAddedModal(true);
                setGoCheckoutAfterAdd(false);
            }
            // notify others
            try { window.dispatchEvent(new Event('cartUpdated')); } catch (e) {}
        } catch (e) {
            console.error('Failed to add to cart', e);
        }
    };

    const closeQuickCheckout = () => {
        setShowQuickCheckout(false);
        setQuickCheckoutItem(null);
        setQuickCheckoutQty(1);
    };

    const confirmQuickCheckout = () => {
        closeQuickCheckout();
        setPath('/checkout');
    };

    const quickAddToCart = () => {
        // Add the current quick item to persistent cart (user choice)
        try {
            const existing = JSON.parse(localStorage.getItem('cart') || '[]');
            const normalizedSize = (quickCheckoutItem?.size || '').trim();
            const normalizedColor = (quickCheckoutItem?.color || '').trim();
            const toAdd = { ...quickCheckoutItem, qty: Number(quickCheckoutQty) || 1, size: normalizedSize, color: normalizedColor, variantId: quickCheckoutItem?.variantId || quickCheckoutItem?.variant_id || null };

            const duplicateIndex = existing.findIndex(
                (it) => it.id === toAdd.id && (it.size || '') === normalizedSize && (it.color || '') === normalizedColor
            );

            if (duplicateIndex >= 0) {
                const current = existing[duplicateIndex];
                const mergedQty = (Number(current.qty) || 0) + (Number(toAdd.qty) || 1);
                existing[duplicateIndex] = { ...current, ...toAdd, qty: mergedQty };
            } else {
                existing.push(toAdd);
            }

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
    const goCheckout = () => {
        closeCart();
        setPath('/checkout');
    };

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
    const flashItems = filteredProducts.slice(0, 8);
    const suggestionItems = filteredProducts.slice(0, 24);

    const selectVariants = useMemo(() => Array.isArray(selectProduct?.variants) ? selectProduct.variants : [], [selectProduct]);
    const sizeOptions = useMemo(() => [...new Set(selectVariants.map(v => v.size).filter(Boolean))], [selectVariants]);
    const colorOptions = useMemo(() => [...new Set(selectVariants.map(v => v.color).filter(Boolean))], [selectVariants]);

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

            {/* --- BODY (Trang chủ kiểu Shopee) --- */}
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Hero + khuyến mãi */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1400&q=60')] bg-cover" />
                        <div className="relative z-10 flex flex-col gap-3">
                            <div className="text-xs uppercase tracking-[0.3em] font-semibold">Siêu sale</div>
                            <div className="text-3xl font-bold leading-tight">Đấu giá rẻ vô địch • Freeship 0đ</div>
                            <div className="text-sm text-orange-50">Deal hot giờ vàng • Voucher hoàn xu • Hỗ trợ giao nhanh</div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">Mua 2 giảm 10%</span>
                                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">Freeship Extra</span>
                                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">Quà tặng kèm</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-rows-2 gap-4">
                        <div className="rounded-2xl bg-white shadow p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500">Chỉ trên app</p>
                                <p className="text-base font-semibold text-gray-900">Giảm đến 50%</p>
                            </div>
                            <div className="text-orange-500 text-lg font-bold">12.12</div>
                        </div>
                        <div className="rounded-2xl bg-white shadow p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500">Deal ngân hàng</p>
                                <p className="text-base font-semibold text-gray-900">Hoàn tiền 15%</p>
                            </div>
                            <div className="text-red-500 text-lg font-bold">Săn ngay</div>
                        </div>
                    </div>
                </div>

                {/* Danh mục nhanh */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-800">Danh mục</h3>
                        <button onClick={()=>setSelectedCategory('All')} className="text-xs text-orange-600 font-semibold">Xem tất cả</button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                        {categories.slice(0,10).map((cat, idx) => (
                            <button
                                key={cat.category_id}
                                onClick={()=>setSelectedCategory(cat.category_id)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${selectedCategory===cat.category_id?'border-orange-400 bg-orange-50':'border-gray-100 hover:border-orange-200 hover:bg-orange-50/60'}`}
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-amber-200 flex items-center justify-center text-lg font-bold text-orange-600">{(cat.category_name||'')[0]}</div>
                                <span className="text-xs text-gray-700 text-center line-clamp-2">{cat.category_name}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Flash sale */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold">FLASH SALE</span>
                            <span className="text-sm text-gray-600">Nhanh tay kẻo lỡ</span>
                        </div>
                        <button className="text-xs text-orange-600 font-semibold" onClick={()=>setSelectedCategory('All')}>Xem thêm</button>
                    </div>
                    {isLoading ? (
                        <div className="text-sm text-gray-500 text-center py-4">Đang tải...</div>
                    ) : flashItems.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-4">Chưa có sản phẩm</div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {flashItems.map(item => {
                                const stockQty = item.stock_quantity || item.stockQuantity || 0;
                                const isOutOfStock = stockQty <= 0;
                                const statusText = (item.status || '').toLowerCase();
                                const isDiscontinued = item.isActive === false || ['inactive','stopped','ngung','ngừng','ngừng bán','discontinued'].includes(statusText);
                                const disabled = isOutOfStock || isDiscontinued;
                                return (
                                    <div
                                        key={item.id}
                                        className={`border border-gray-100 rounded-xl p-3 transition ${disabled ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}`}
                                        onClick={()=>setPath(`/product/${item.id}`)}
                                    >
                                        <div className="relative h-32 rounded-lg overflow-hidden bg-gray-50">
                                            <img src={getProductImage(item)} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                            <span className="absolute top-2 left-2 bg-red-500 text-white text-[11px] font-semibold px-2 py-0.5 rounded">GIẢM 50%</span>
                                            {disabled && (
                                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center text-xs font-semibold text-red-600">
                                                    {isDiscontinued ? 'Ngừng bán' : 'Hết hàng'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-2 text-sm font-semibold text-gray-900 line-clamp-2">{item.name}</div>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-red-600 font-bold text-base">{formatCurrency(item.price)}</span>
                                            <button
                                                disabled={disabled}
                                                onClick={(e)=>{e.stopPropagation(); if(disabled) return; startAddToCart(item);}}
                                                className={`text-xs px-2 py-1 rounded ${disabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-orange-500 text-white'}`}
                                            >
                                                Mua
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Gợi ý hôm nay */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800">Gợi ý hôm nay</h3>
                        <div className="flex gap-2 text-xs text-gray-500">
                            <span className="px-2 py-1 rounded bg-gray-100">Giá tốt</span>
                            <span className="px-2 py-1 rounded bg-gray-100">Bán chạy</span>
                            <span className="px-2 py-1 rounded bg-gray-100">Xu hướng</span>
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="text-center text-gray-500 py-10">Đang tải sản phẩm...</div>
                    ) : suggestionItems.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">Không tìm thấy sản phẩm.</div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {suggestionItems.map(product => {
                                const stockQty = product.stock_quantity || product.stockQuantity || 0;
                                const isOutOfStock = stockQty <= 0;
                                const statusText = (product.status || '').toLowerCase();
                                const isDiscontinued = product.isActive === false || ['inactive','stopped','ngung','ngừng','ngừng bán','discontinued'].includes(statusText);
                                const disabled = isOutOfStock || isDiscontinued;
                                return (
                                    <div
                                        key={product.id}
                                        className={`border border-gray-100 rounded-xl transition bg-white ${disabled ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}`}
                                        onClick={()=>setPath(`/product/${product.id}`)}
                                    >
                                        <div className="h-40 bg-gray-50 rounded-t-xl overflow-hidden relative">
                                            <img src={getProductImage(product)} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                                            {disabled && (
                                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center text-xs font-semibold text-red-600">
                                                    {isDiscontinued ? 'Ngừng bán' : 'Hết hàng'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 space-y-2">
                                            <div className="text-xs text-gray-500 line-clamp-1">{product.categoryName || 'Sản phẩm'}</div>
                                            <div className="text-sm font-semibold text-gray-900 line-clamp-2 h-10">{product.name}</div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-red-600 font-bold">{formatCurrency(product.price)}</span>
                                                <span className="text-[11px] text-gray-500">Đã bán {Math.max(1, stockQty % 200)}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    disabled={disabled}
                                                    onClick={(e)=>{e.stopPropagation(); if(disabled) return; startAddToCart(product);}}
                                                    className={`flex-1 text-xs px-2 py-1 rounded font-semibold ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white transition'}`}
                                                >
                                                    Thêm giỏ
                                                </button>
                                                <button
                                                    disabled={disabled}
                                                    onClick={(e)=>{e.stopPropagation(); if(disabled) return; handleBuyNow(product);}}
                                                    className={`flex-1 text-xs px-2 py-1 rounded font-semibold ${disabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600 transition'}`}
                                                >
                                                    Mua ngay
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* Modal chọn size/màu/số lượng trước khi thêm giỏ */}
            {showSelectModal && selectProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/50" onClick={closeSelectModal} />
                    <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-5 z-10">
                        <div className="flex items-start gap-4">
                            <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-50 border">
                                <img src={getProductImage(selectProduct)} alt={selectProduct.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-500">Thêm vào giỏ</div>
                                <div className="font-semibold text-gray-900 line-clamp-2">{selectProduct.name}</div>
                                <div className="text-red-600 font-bold text-base mt-1">{formatCurrency(selectProduct.price)}</div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Màu sắc</div>
                                {colorOptions.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {colorOptions.map(c => (
                                            <button key={c} onClick={()=>setSelectColor(c)} className={`px-3 py-1 rounded-full border text-xs ${selectColor===c?'border-orange-500 bg-orange-50 text-orange-700':'border-gray-200 text-gray-700 hover:border-orange-200'}`}>{c}</button>
                                        ))}
                                    </div>
                                ) : <div className="text-gray-400">Không có màu</div>}
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Kích cỡ</div>
                                {sizeOptions.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {sizeOptions.map(s => (
                                            <button key={s} onClick={()=>setSelectSize(s)} className={`px-3 py-1 rounded-full border text-xs ${selectSize===s?'border-orange-500 bg-orange-50 text-orange-700':'border-gray-200 text-gray-700 hover:border-orange-200'}`}>{s}</button>
                                        ))}
                                    </div>
                                ) : <div className="text-gray-400">Không có size</div>}
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Số lượng</div>
                                <div className="flex items-center gap-2">
                                    <button onClick={()=>setSelectQty(Math.max(1, selectQty-1))} className="px-3 py-1 border rounded">-</button>
                                    <input type="number" min={1} value={selectQty} onChange={(e)=>setSelectQty(Math.max(1, Number(e.target.value)||1))} className="w-16 text-center border rounded py-1" />
                                    <button onClick={()=>setSelectQty(selectQty+1)} className="px-3 py-1 border rounded">+</button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
                            <button onClick={closeSelectModal} className="px-4 py-2 border rounded-md">Huỷ</button>
                            <button onClick={confirmAddToCart} className="px-4 py-2 bg-orange-500 text-white rounded-md">{goCheckoutAfterAdd ? 'Mua ngay' : 'Thêm vào giỏ'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal thông tin sản phẩm vừa thêm */}
            {showAddedModal && addedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/50" onClick={()=>setShowAddedModal(false)} />
                    <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-5 z-10">
                        <div className="flex items-start gap-4">
                            <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-50 border">
                                <img src={addedProduct.image_url} alt={addedProduct.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-emerald-600 font-semibold mb-1">Đã thêm vào giỏ</div>
                                <div className="font-semibold text-gray-900 line-clamp-2">{addedProduct.name}</div>
                                <div className="text-xs text-gray-600 mt-1 space-y-1">
                                    <div>Giá: <span className="font-semibold text-red-600">{formatCurrency(addedProduct.price)}</span></div>
                                    <div>Size: <span className="font-medium">{addedProduct.size || '—'}</span> • Màu: <span className="font-medium">{addedProduct.color || '—'}</span></div>
                                    <div>Số lượng: <span className="font-medium">{addedProduct.qty}</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
                            <button onClick={()=>setShowAddedModal(false)} className="px-4 py-2 border rounded-md">Tiếp tục mua</button>
                            <button onClick={()=>{setShowAddedModal(false);openCart();}} className="px-4 py-2 bg-orange-500 text-white rounded-md">Xem giỏ hàng</button>
                            <button onClick={()=>{setShowAddedModal(false);setPath('/checkout');}} className="px-4 py-2 bg-emerald-600 text-white rounded-md">Thanh toán</button>
                        </div>
                    </div>
                </div>
            )}

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
                                            <button onClick={confirmQuickCheckout} className="px-4 py-2 bg-indigo-600 text-white rounded">Thanh toán sản phẩm này</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

            {/* Cart Modal */}
            {showCart && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
                    <div className="fixed inset-0 bg-black opacity-50" onClick={closeCart} />
                    <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-5 z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-orange-50 text-orange-600 shadow-inner">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Giỏ hàng</h3>
                                    <p className="text-xs text-gray-500">Kiểm tra lại sản phẩm trước khi thanh toán</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span className="px-3 py-1 rounded-full bg-gray-100 font-medium">{cartItems.length} sản phẩm</span>
                                <button onClick={closeCart} className="text-gray-500 hover:text-gray-700">Đóng</button>
                            </div>
                        </div>

                        {cartItems.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">Giỏ hàng trống</div>
                        ) : (
                            <div className="space-y-4">
                                <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
                                    <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,0.8fr] text-xs text-gray-500 px-3 py-2 border-b border-gray-100 font-semibold uppercase tracking-wide">
                                        <div>Sản phẩm</div>
                                        <div className="text-center">Đơn giá</div>
                                        <div className="text-center">Số lượng</div>
                                        <div className="text-center">Số tiền</div>
                                        <div className="text-center">Thao tác</div>
                                    </div>
                                    {cartItems.map((it, idx) => (
                                        <div key={idx} className="rounded-xl border border-gray-100 bg-white shadow-sm">
                                            <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,0.8fr] items-center px-3 py-3 gap-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                                                        <img
                                                            src={it.image_url || getProductImage(it) || `https://placehold.co/160x160/eef2ff/4f46e5?text=${encodeURIComponent(it.name?.substring(0, 8) || 'SP')}`}
                                                            alt={it.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="space-y-2 min-w-0">
                                                        <div className="font-semibold text-gray-900 line-clamp-2">{it.name}</div>
                                                        <div className="text-[11px] text-gray-600 flex flex-wrap gap-2">
                                                            <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">Phân loại: {it.color || '—'}{it.size ? `, ${it.size}` : ''}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-center text-sm text-gray-800">{formatCurrency(it.price)}</div>
                                                <div className="flex items-center justify-center">
                                                    <div className="flex items-center border border-gray-200 rounded-full overflow-hidden bg-white">
                                                        <button
                                                            onClick={()=>{
                                                                const newQty = Math.max(1, (Number(it.qty)||1) - 1);
                                                                updateCartItem(idx, {...it, qty: newQty});
                                                            }}
                                                            className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            type="number"
                                                            value={it.qty}
                                                            min={1}
                                                            className="w-14 border-0 text-center text-sm focus:outline-none"
                                                            onChange={(e)=>{
                                                                const newQty = Math.max(1, Number(e.target.value) || 1);
                                                                updateCartItem(idx, {...it, qty: newQty});
                                                            }}
                                                        />
                                                        <button
                                                            onClick={()=>{
                                                                const newQty = (Number(it.qty)||1) + 1;
                                                                updateCartItem(idx, {...it, qty: newQty});
                                                            }}
                                                            className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-center text-sm font-semibold text-red-600">{formatCurrency((Number(it.price)||0) * (Number(it.qty)||0))}</div>
                                                <div className="text-center">
                                                    <button onClick={()=>removeCartItem(idx)} className="text-sm text-red-600 hover:text-red-700">Xóa</button>
                                                </div>
                                            </div>

                                            {/* Mobile layout */}
                                            <div className="md:hidden p-3 space-y-3">
                                                <div className="flex gap-3">
                                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                                                        <img
                                                            src={it.image_url || getProductImage(it) || `https://placehold.co/160x160/eef2ff/4f46e5?text=${encodeURIComponent(it.name?.substring(0, 8) || 'SP')}`}
                                                            alt={it.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="font-semibold text-gray-900 line-clamp-2">{it.name}</div>
                                                        <div className="text-[11px] text-gray-600">
                                                            Phân loại: <span className="font-medium">{it.color || '—'}{it.size ? `, ${it.size}` : ''}</span>
                                                        </div>
                                                        <div className="text-sm text-gray-800">{formatCurrency(it.price)}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center border border-gray-200 rounded-full overflow-hidden bg-white">
                                                        <button
                                                            onClick={()=>{
                                                                const newQty = Math.max(1, (Number(it.qty)||1) - 1);
                                                                updateCartItem(idx, {...it, qty: newQty});
                                                            }}
                                                            className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            type="number"
                                                            value={it.qty}
                                                            min={1}
                                                            className="w-14 border-0 text-center text-sm focus:outline-none"
                                                            onChange={(e)=>{
                                                                const newQty = Math.max(1, Number(e.target.value) || 1);
                                                                updateCartItem(idx, {...it, qty: newQty});
                                                            }}
                                                        />
                                                        <button
                                                            onClick={()=>{
                                                                const newQty = (Number(it.qty)||1) + 1;
                                                                updateCartItem(idx, {...it, qty: newQty});
                                                            }}
                                                            className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-gray-500">Tạm tính</div>
                                                        <div className="text-sm font-semibold text-red-600">{formatCurrency((Number(it.price)||0) * (Number(it.qty)||0))}</div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end">
                                                    <button onClick={()=>removeCartItem(idx)} className="text-xs text-red-600 hover:text-red-700">Xóa</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t pt-3 space-y-2">
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 shadow-inner space-y-2">
                                        <div className="flex items-center justify-between text-sm text-gray-700">
                                            <span>Tạm tính</span>
                                            <span>{formatCurrency(cartTotal)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-gray-700">
                                            <span>Phí vận chuyển (ước tính)</span>
                                            <span>—</span>
                                        </div>
                                        <div className="flex items-center justify-between text-base font-semibold text-red-600">
                                            <span>Tổng</span>
                                            <span>{formatCurrency(cartTotal)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-2">
                                    <button onClick={closeCart} className="px-4 py-2 border rounded-md">Tiếp tục mua</button>
                                    <button onClick={goCheckout} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Thanh toán</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
