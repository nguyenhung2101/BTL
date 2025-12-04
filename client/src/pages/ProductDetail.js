import React, { useState, useEffect } from 'react';
import { getProduct } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import { ShoppingCart, X, Star, Package, CheckCircle, AlertCircle, ZoomIn, ChevronLeft, ChevronRight, Heart } from 'lucide-react';

const parseOptions = (product, keyCandidates) => {
    for (const key of keyCandidates) {
        const val = product[key];
        if (!val) continue;
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
};

// Component hiển thị sao đánh giá
const StarRating = ({ rating, size = 16, showNumber = false }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);       

    return (
        <div className="flex items-center gap-1">
            {[...Array(fullStars)].map((_, i) => (
                <Star key={`full-${i}`} size={size} className="fill-yellow-400 text-yellow-400" />
            ))}
            {hasHalfStar && (
                <div className="relative">
                    <Star size={size} className="text-gray-300" />
                    <Star size={size} className="fill-yellow-400 text-yellow-400 absolute left-0 overflow-hidden" style={{ width: '50%' }} />
                </div>
            )}
            {[...Array(emptyStars)].map((_, i) => (
                <Star key={`empty-${i}`} size={size} className="text-gray-300" />
            ))}
            {showNumber && <span className="ml-2 text-sm text-gray-600">({rating.toFixed(1)})</span>}
        </div>
    );
};

export default function ProductDetail({ setPath, isLoggedIn, currentUser, productId }) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [qty, setQty] = useState(1);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [zoomOpen, setZoomOpen] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [reviews, setReviews] = useState([]);
    const [newRating, setNewRating] = useState(5);
    const [newComment, setNewComment] = useState('');
    const [isWishlisted, setIsWishlisted] = useState(false);

    // Tạo danh sách hình ảnh mẫu (trong thực tế sẽ lấy từ product.images)
    const productImages = [
        `https://placehold.co/800x800/4f46e5/ffffff?text=${encodeURIComponent(product?.name?.substring(0, 20) || 'Product')}`,
        `https://placehold.co/800x800/10b981/ffffff?text=Image+2`,
        `https://placehold.co/800x800/f59e0b/ffffff?text=Image+3`,
        `https://placehold.co/800x800/ef4444/ffffff?text=Image+4`,
    ];

    useEffect(() => {
        // Lấy ID từ props hoặc từ URL
        let id = productId;
        if (!id) {
            const path = window.location.pathname || '';
            const match = path.match(/\/product\/(.+)$/);
            if (match) {
                id = decodeURIComponent(match[1]); // Decode URL để xử lý các ký tự đặc biệt
            }
        }
        
        // Trim và clean ID
        if (id) {
            id = String(id).trim();
        }

        console.log('ProductDetail - productId prop:', productId);
        console.log('ProductDetail - extracted ID:', id);
        console.log('ProductDetail - current path:', window.location.pathname);

        const load = async () => {
            if (!id) {
                setError('Không tìm thấy ID sản phẩm. Vui lòng quay lại cửa hàng và thử lại.');
                setLoading(false);
                return;
            }
            
            try {
                setError(null);
                setLoading(true);
                console.log('🔄 Loading product with ID:', id);
                console.log('🔄 API call: GET /api/products/' + id);
                
                const data = await getProduct(id);
                console.log('✅ Product data received:', data);
                
                if (!data) {
                    setError(`Không tìm thấy sản phẩm với ID: ${id}`);
                    setLoading(false);
                    return;
                }
                
                setProduct(data);
                // init selectors
                const sizes = parseOptions(data, ['sizes', 'size_options', 'availableSizes', 'sizeOptions']);
                const colors = parseOptions(data, ['colors', 'color_options', 'availableColors', 'colorOptions']);
                if (sizes.length) setSelectedSize(sizes[0]);
                if (colors.length) setSelectedColor(colors[0]);
                // load reviews
                const rid = data.id;
                const localKey = `reviews_${rid}`;
                let revs = [];
                if (data.reviews && Array.isArray(data.reviews)) revs = data.reviews;
                try {
                    const fromStorage = JSON.parse(localStorage.getItem(localKey) || '[]');
                    if (Array.isArray(fromStorage) && fromStorage.length) revs = revs.concat(fromStorage);
                } catch (e) {}
                setReviews(revs);
                console.log('✅ Product loaded successfully');
            } catch (err) {
                console.error('❌ Error loading product:', err);
                console.error('❌ Error details:', {
                    message: err.message,
                    response: err.response,
                    responseData: err.response?.data,
                    status: err.response?.status
                });
                
                let errorMessage = 'Không thể tải thông tin sản phẩm.';
                
                if (err.response) {
                    // Có response từ server
                    if (err.response.status === 404) {
                        errorMessage = `Không tìm thấy sản phẩm với ID: ${id}`;
                    } else if (err.response.status === 500) {
                        errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
                    } else if (err.response.data?.message) {
                        errorMessage = err.response.data.message;
                    } else {
                        errorMessage = `Lỗi ${err.response.status}: ${err.response.statusText || 'Lỗi không xác định'}`;
                    }
                } else if (err.message) {
                    errorMessage = err.message;
                }
                
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };
        
        load();
    }, [productId]);

    const addToCart = () => {
        if (!product) return;
        if (!inStock) {
            alert('Sản phẩm đã hết hàng!');
            return;
        }
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const item = {
            id: product.id,
            name: product.name,
            price: product.price,
            qty: Number(qty) || 1,
            size: selectedSize || null,
            color: selectedColor || null
        };
        cart.push(item);
        localStorage.setItem('cart', JSON.stringify(cart));
        try { window.dispatchEvent(new Event('cartUpdated')); } catch (e) {}
        alert('Đã thêm vào giỏ hàng!');
    };

    const buyNow = () => {
        if (!product) return;
        if (!inStock) {
            alert('Sản phẩm đã hết hàng!');
            return;
        }
        const item = {
            id: product.id,
            name: product.name,
            price: product.price,
            qty: Number(qty) || 1,
            size: selectedSize || null,
            color: selectedColor || null
        };
        try {
            const evt = new CustomEvent('quickBuy', { detail: item });
            window.dispatchEvent(evt);
        } catch (e) {
            console.error('Error performing quick buy', e);
        }
    };

    const submitReview = () => {
        if (!product || !newComment.trim()) return;
        const rid = product.id;
        const localKey = `reviews_${rid}`;
        const r = { 
            user: currentUser?.fullName || currentUser?.username || 'Khách hàng', 
            rating: Number(newRating) || 5, 
            comment: newComment, 
            date: new Date().toISOString() 
        };
        const updated = [...reviews, r];
        setReviews(updated);
        try { 
            localStorage.setItem(localKey, JSON.stringify([...(JSON.parse(localStorage.getItem(localKey) || '[]')), r])); 
        } catch(e){}
        setNewComment('');
        setNewRating(5);
        alert('Cảm ơn bạn đã đánh giá!');
    };

    const nextImage = () => {
        setSelectedImageIndex((prev) => (prev + 1) % productImages.length);
    };

    const prevImage = () => {
        setSelectedImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#D4AF37] border-t-transparent mb-4"></div>
                    <p className="text-gray-600 font-medium">Đang tải thông tin sản phẩm...</p>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy sản phẩm</h2>
                    <p className="text-gray-600 mb-6">{error || 'Sản phẩm không tồn tại hoặc đã bị xóa.'}</p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => setPath('/shop')}
                            className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
                        >
                            Quay lại cửa hàng
                        </button>
                        <button
                            onClick={() => {
                                setError(null);
                                setLoading(true);
                                const id = productId || ((() => {
                                    const path = window.location.pathname || '';
                                    const match = path.match(/\/product\/(.+)$/);
                                    return match ? match[1] : null;
                                })());
                                if (id) {
                                    getProduct(id).then(data => {
                                        setProduct(data);
                                        setLoading(false);
                                    }).catch(err => {
                                        setError(err.response?.data?.message || err.message || 'Lỗi không xác định');
                                        setLoading(false);
                                    });
                                }
                            }}
                            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all duration-200"
                        >
                            Thử lại
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const sizes = parseOptions(product, ['sizes', 'size_options', 'availableSizes', 'sizeOptions']);
    const colors = parseOptions(product, ['colors', 'color_options', 'availableColors', 'colorOptions']);
    const stockQuantity = product.stockQuantity || product.stock_quantity || 0;
    const inStock = stockQuantity > 0;
    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length) : 0;

    return (
        <>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fadeIn 0.5s ease-out; }
            `}</style>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Breadcrumb */}
                    <div className="mb-6 text-sm text-gray-600">
                        <button onClick={() => setPath('/shop')} className="hover:text-[#D4AF37] transition-colors">Cửa hàng</button>
                        <span className="mx-2">/</span>
                        <span className="text-gray-900">{product.name}</span>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 lg:p-10">
                            {/* Hình ảnh sản phẩm */}
                            <div className="space-y-4">
                                {/* Ảnh chính */}
                                <div className="relative group">
                                    <div 
                                        className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-zoom-in relative"
                                        onClick={() => setZoomOpen(true)}
                                    >
                                        <img 
                                            src={productImages[selectedImageIndex]} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                                            <ZoomIn className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                    
                                    {/* Navigation buttons */}
                                    {productImages.length > 1 && (
                                        <>
                                            <button
                                                onClick={prevImage}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <ChevronLeft className="w-5 h-5 text-gray-700" />
                                            </button>
                                            <button
                                                onClick={nextImage}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <ChevronRight className="w-5 h-5 text-gray-700" />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Thumbnails */}
                                {productImages.length > 1 && (
                                    <div className="flex gap-3 overflow-x-auto pb-2">
                                        {productImages.map((img, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedImageIndex(idx)}
                                                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                                                    selectedImageIndex === idx 
                                                        ? 'border-[#D4AF37] scale-105' 
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Thông tin sản phẩm */}
                            <div className="space-y-6">
                                {/* Header */}
                                <div>
                                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="text-sm text-gray-500">
                                            Mã sản phẩm: <span className="font-semibold text-gray-700">{product.id}</span>
                                        </div>
                                        {product.categoryName && (
                                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                                {product.categoryName}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Rating & Reviews */}
                                {reviews.length > 0 && (
                                    <div className="flex items-center gap-4 pb-4 border-b">
                                        <StarRating rating={avgRating} size={20} showNumber={true} />
                                        <span className="text-sm text-gray-600">
                                            {reviews.length} đánh giá
                                        </span>
                                    </div>
                                )}

                                {/* Giá */}
                                <div className="pb-4 border-b">
                                    <div className="text-4xl font-bold text-[#D4AF37] mb-2">
                                        {formatCurrency(product.price)}
                                    </div>
                                </div>

                                {/* Tồn kho */}
                                <div className={`flex items-center gap-3 p-4 rounded-xl ${
                                    inStock ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                }`}>
                                    {inStock ? (
                                        <>
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                            <div>
                                                <div className="font-semibold text-green-800">Còn hàng</div>
                                                <div className="text-sm text-green-600">
                                                    Còn {stockQuantity} sản phẩm trong kho
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-6 h-6 text-red-600" />
                                            <div>
                                                <div className="font-semibold text-red-800">Hết hàng</div>
                                                <div className="text-sm text-red-600">
                                                    Sản phẩm hiện đang hết hàng
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Tùy chọn: Kích cỡ */}
                                {sizes.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Kích cỡ <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {sizes.map(size => (
                                                <button
                                                    key={size}
                                                    onClick={() => setSelectedSize(size)}
                                                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                                                        selectedSize === size
                                                            ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                                                            : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                                    }`}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tùy chọn: Màu sắc */}
                                {colors.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Màu sắc <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {colors.map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setSelectedColor(color)}
                                                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                                                        selectedColor === color
                                                            ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                                                            : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                                    }`}
                                                >
                                                    {color}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Số lượng */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        Số lượng
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setQty(Math.max(1, qty - 1))}
                                            disabled={qty <= 1}
                                            className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            value={qty}
                                            min={1}
                                            max={stockQuantity}
                                            onChange={(e) => {
                                                const val = Math.max(1, Math.min(stockQuantity, parseInt(e.target.value) || 1));
                                                setQty(val);
                                            }}
                                            className="w-20 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg py-2 focus:border-[#D4AF37] focus:outline-none"
                                        />
                                        <button
                                            onClick={() => setQty(Math.min(stockQuantity, qty + 1))}
                                            disabled={qty >= stockQuantity}
                                            className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            +
                                        </button>
                                        <span className="text-sm text-gray-500 ml-2">
                                            (Tối đa: {stockQuantity})
                                        </span>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={addToCart}
                                        disabled={!inStock}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-white font-semibold py-4 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        <ShoppingCart className="w-5 h-5" />
                                        Thêm vào giỏ hàng
                                    </button>
                                    <button
                                        onClick={buyNow}
                                        disabled={!inStock}
                                        className="flex-1 bg-gray-900 text-white font-semibold py-4 rounded-xl hover:bg-gray-800 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        Mua ngay
                                    </button>
                                    <button
                                        onClick={() => setIsWishlisted(!isWishlisted)}
                                        className={`p-4 rounded-xl border-2 transition-all ${
                                            isWishlisted
                                                ? 'border-red-300 bg-red-50 text-red-600'
                                                : 'border-gray-300 hover:border-gray-400 text-gray-600'
                                        }`}
                                    >
                                        <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Mô tả chi tiết */}
                        <div className="border-t bg-gray-50 p-6 lg:p-10">
                            <div className="max-w-4xl mx-auto space-y-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Mô tả sản phẩm</h2>
                                
                                {product.description && (
                                    <div className="bg-white rounded-xl p-6 shadow-sm">
                                        <h3 className="font-semibold text-gray-900 mb-3">Mô tả</h3>
                                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                            {product.description}
                                        </p>
                                    </div>
                                )}

                                {product.material && (
                                    <div className="bg-white rounded-xl p-6 shadow-sm">
                                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <Package className="w-5 h-5 text-[#D4AF37]" />
                                            Chất liệu
                                        </h3>
                                        <p className="text-gray-700 leading-relaxed">{product.material}</p>
                                    </div>
                                )}

                                {(product.usage || product.instructions) && (
                                    <div className="bg-white rounded-xl p-6 shadow-sm">
                                        <h3 className="font-semibold text-gray-900 mb-3">Công dụng & Hướng dẫn sử dụng</h3>
                                        {product.usage && (
                                            <div className="mb-4">
                                                <h4 className="font-medium text-gray-800 mb-2">Công dụng:</h4>
                                                <p className="text-gray-700 leading-relaxed">{product.usage}</p>
                                            </div>
                                        )}
                                        {product.instructions && (
                                            <div>
                                                <h4 className="font-medium text-gray-800 mb-2">Hướng dẫn sử dụng:</h4>
                                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.instructions}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Đánh giá & Phản hồi */}
                        <div className="border-t p-6 lg:p-10">
                            <div className="max-w-4xl mx-auto">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Đánh giá & Phản hồi</h2>
                                
                                {/* Tổng quan đánh giá */}
                                {reviews.length > 0 ? (
                                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 mb-8">
                                        <div className="flex items-center gap-6">
                                            <div className="text-center">
                                                <div className="text-5xl font-bold text-[#D4AF37] mb-2">
                                                    {avgRating.toFixed(1)}
                                                </div>
                                                <StarRating rating={avgRating} size={24} />
                                                <div className="text-sm text-gray-600 mt-2">
                                                    {reviews.length} đánh giá
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                {[5, 4, 3, 2, 1].map(star => {
                                                    const count = reviews.filter(r => Math.floor(r.rating) === star).length;
                                                    const percentage = (count / reviews.length) * 100;
                                                    return (
                                                        <div key={star} className="flex items-center gap-3">
                                                            <span className="text-sm text-gray-600 w-8">{star} sao</span>
                                                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-[#D4AF37] transition-all duration-500"
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm text-gray-600 w-8">{count}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 rounded-xl p-8 text-center mb-8">
                                        <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-600">Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!</p>
                                    </div>
                                )}

                                {/* Danh sách đánh giá */}
                                {reviews.length > 0 && (
                                    <div className="space-y-4 mb-8">
                                        {reviews.map((review, idx) => (
                                            <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <div className="font-semibold text-gray-900 mb-1">
                                                            {review.user || 'Khách hàng'}
                                                        </div>
                                                        <StarRating rating={review.rating} size={16} />
                                                    </div>
                                                    {review.date && (
                                                        <span className="text-sm text-gray-500">
                                                            {new Date(review.date).toLocaleDateString('vi-VN')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Form đánh giá */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                    <h3 className="font-semibold text-gray-900 mb-4">Viết đánh giá của bạn</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Đánh giá của bạn
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-600">1 sao</span>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="5"
                                                    value={newRating}
                                                    onChange={(e) => setNewRating(parseInt(e.target.value))}
                                                    className="flex-1"
                                                />
                                                <span className="text-sm text-gray-600">5 sao</span>
                                                <div className="w-32">
                                                    <StarRating rating={newRating} size={20} />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nhận xét
                                            </label>
                                            <textarea
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                className="w-full border-2 border-gray-300 rounded-xl p-4 focus:border-[#D4AF37] focus:outline-none resize-none"
                                                rows={4}
                                                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                                            />
                                        </div>
                                        <button
                                            onClick={submitReview}
                                            disabled={!newComment.trim()}
                                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-white font-semibold py-3 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Gửi đánh giá
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Zoom Modal */}
                {zoomOpen && (
                    <div 
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setZoomOpen(false)}
                    >
                        <button
                            onClick={() => setZoomOpen(false)}
                            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors z-10"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div className="relative max-w-6xl w-full">
                            <img 
                                src={productImages[selectedImageIndex]} 
                                alt={product.name} 
                                className="w-full h-auto max-h-[90vh] object-contain rounded-lg" 
                            />
                            {productImages.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            prevImage();
                                        }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg"
                                    >
                                        <ChevronLeft className="w-6 h-6 text-gray-700" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            nextImage();
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg"
                                    >
                                        <ChevronRight className="w-6 h-6 text-gray-700" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
