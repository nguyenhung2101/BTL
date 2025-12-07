import React, { useState, useEffect } from 'react';
import { getProduct } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import { ShoppingCart, X } from 'lucide-react';

const parseOptions = (product, keyCandidates) => {
    for (const key of keyCandidates) {
        const val = product[key];
        if (!val) continue;
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
};

export default function ProductDetail({ setPath, isLoggedIn, currentUser, productId }) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(1);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [zoomOpen, setZoomOpen] = useState(false);

    useEffect(() => {
        // Prefer productId passed from parent App; fallback to reading window.location.pathname
        const id = productId || ((() => {
            const path = window.location.pathname || '';
            const match = path.match(/\/product\/(.+)$/);
            return match ? match[1] : null;
        })());

        const load = async () => {
            if (!id) {
                setLoading(false);
                return;
            }
            try {
                const data = await getProduct(id);
                setProduct(data);
                // init selectors
                const sizes = parseOptions(data, ['sizes', 'size_options', 'availableSizes', 'sizeOptions']);
                const colors = parseOptions(data, ['colors', 'color_options', 'availableColors', 'colorOptions']);
                if (sizes.length) setSelectedSize(sizes[0]);
                if (colors.length) setSelectedColor(colors[0]);
                // load reviews from product or localStorage
                const rid = data.id;
                const localKey = `reviews_${rid}`;
                let revs = [];
                if (data.reviews && Array.isArray(data.reviews)) revs = data.reviews;
                try {
                    const fromStorage = JSON.parse(localStorage.getItem(localKey) || '[]');
                    if (Array.isArray(fromStorage) && fromStorage.length) revs = revs.concat(fromStorage);
                } catch (e) {}
                setReviews(revs);
            } catch (err) {
                console.error('Error loading product', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [productId]);

    const addToCart = () => {
        if (!product) return;
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const normalizedSize = (selectedSize || '').trim();
        const normalizedColor = (selectedColor || '').trim();
        const item = {
            id: product.id,
            name: product.name,
            price: product.price,
            qty: Number(qty) || 1,
            size: normalizedSize,
            color: normalizedColor
        };

        const existingIndex = cart.findIndex(
            (it) => it.id === item.id && (it.size || '') === normalizedSize && (it.color || '') === normalizedColor
        );

        if (existingIndex >= 0) {
            const existingItem = cart[existingIndex];
            const mergedQty = (Number(existingItem.qty) || 0) + (Number(item.qty) || 1);
            cart[existingIndex] = { ...existingItem, ...item, qty: mergedQty };
        } else {
            cart.push(item);
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        // Notify other parts of app that cart changed (ShopScreen listens for this)
        try { window.dispatchEvent(new Event('cartUpdated')); } catch (e) {}
        // optionally navigate to shop or update a shared cart state
    };

    // --- Reviews handlers (stored client-side if backend not present) ---
    const [reviews, setReviews] = useState([]);
    const [newRating, setNewRating] = useState(5);
    const [newComment, setNewComment] = useState('');

    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (Number(r.rating)||0), 0) / reviews.length) : 0;

    const submitReview = () => {
        if (!product) return;
        const rid = product.id;
        const localKey = `reviews_${rid}`;
        const r = { user: 'Bạn', rating: Number(newRating)||5, comment: newComment, date: new Date().toISOString() };
        const updated = [...reviews, r];
        setReviews(updated);
        try { localStorage.setItem(localKey, JSON.stringify([...(JSON.parse(localStorage.getItem(localKey) || '[]')), r])); } catch(e){}
        setNewComment('');
        setNewRating(5);
    };

    const buyNow = () => {
        if (!product) return;
        const item = {
            id: product.id,
            name: product.name,
            price: product.price,
            qty: Number(qty) || 1,
            size: selectedSize || null,
            color: selectedColor || null
        };
        try {
            // Do a quick-buy for this single item without modifying the saved cart
            const evt = new CustomEvent('quickBuy', { detail: item });
            window.dispatchEvent(evt);
        } catch (e) {
            console.error('Error performing quick buy', e);
        }
    };

    if (loading) return <div className="p-6">Đang tải...</div>;
    if (!product) return <div className="p-6">Không tìm thấy sản phẩm.</div>;

    const sizes = parseOptions(product, ['sizes', 'size_options', 'availableSizes', 'sizeOptions']);
    const colors = parseOptions(product, ['colors', 'color_options', 'availableColors', 'colorOptions']);

    const inStock = (product.stockQuantity || product.stock_quantity || 0) > 0;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="bg-white rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Images */}
                <div className="flex flex-col gap-4">
                    <div className="w-full bg-gray-100 rounded-lg overflow-hidden cursor-zoom-in" onClick={() => setZoomOpen(true)}>
                        <img src={`https://placehold.co/800x600/eef2ff/4f46e5?text=${encodeURIComponent(product.name.substring(0,30))}`} alt={product.name} className="w-full h-96 object-cover" />
                    </div>
                    <div className="flex gap-2">
                        <img src={`https://placehold.co/120x90/ffffff/111?text=1`} alt="thumb1" className="w-20 h-14 object-cover rounded-md border" />
                        <img src={`https://placehold.co/120x90/ffffff/111?text=2`} alt="thumb2" className="w-20 h-14 object-cover rounded-md border" />
                        <img src={`https://placehold.co/120x90/ffffff/111?text=3`} alt="thumb3" className="w-20 h-14 object-cover rounded-md border" />
                    </div>
                </div>

                {/* Info */}
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 mb-2">{product.name}</h1>
                    <div className="text-sm text-gray-500 mb-4">Mã sản phẩm: <span className="font-medium text-gray-700">{product.id}</span></div>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="text-3xl font-bold text-red-600">{formatCurrency(product.price)}</div>
                        <div className={`text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-500'}`}>{inStock ? 'Còn hàng' : 'Hết hàng'}</div>
                    </div>

                    {/* Options */}
                    {sizes.length > 0 && (
                        <div className="mb-3">
                            <label className="text-sm text-gray-600 mb-1 block">Kích cỡ</label>
                            <select value={selectedSize} onChange={(e)=>setSelectedSize(e.target.value)} className="border rounded px-3 py-2 w-40">
                                {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}

                    {colors.length > 0 && (
                        <div className="mb-3">
                            <label className="text-sm text-gray-600 mb-1 block">Màu sắc</label>
                            <select value={selectedColor} onChange={(e)=>setSelectedColor(e.target.value)} className="border rounded px-3 py-2 w-40">
                                {colors.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="mb-4 flex items-center gap-3">
                        <label className="text-sm text-gray-600">Số lượng</label>
                        <input type="number" value={qty} min={1} onChange={(e)=>setQty(e.target.value)} className="w-24 border rounded px-2 py-1" />
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={addToCart} className="flex-1 text-sm h-10 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">
                            <ShoppingCart className="w-4 h-4" /> Thêm vào giỏ hàng
                        </button>
                        <button onClick={buyNow} className="flex-1 text-sm h-10 flex items-center justify-center bg-orange-500 text-white rounded hover:bg-orange-600 transition">Mua ngay</button>
                    </div>

                    {/* Description */}
                        <div className="prose max-w-none">
                            <h3 className="text-lg font-semibold mb-2">Mô tả sản phẩm</h3>
                            <p>{product.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}</p>
                            {product.material && (
                                <div className="mt-3">
                                    <h4 className="font-semibold">Chất liệu</h4>
                                    <p className="text-sm text-gray-700">{product.material}</p>
                                </div>
                            )}
                            {product.usage && (
                                <div className="mt-3">
                                    <h4 className="font-semibold">Công dụng / Hướng dẫn sử dụng</h4>
                                    <p className="text-sm text-gray-700">{product.usage}</p>
                                </div>
                            )}
                            {product.instructions && (
                                <div className="mt-3">
                                    <h4 className="font-semibold">Hướng dẫn</h4>
                                    <p className="text-sm text-gray-700">{product.instructions}</p>
                                </div>
                            )}

                            {/* Stock information */}
                            <div className="mt-4">
                                <h4 className="font-semibold">Tồn kho</h4>
                                <div className={`text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>{inStock ? `Còn ${product.stockQuantity || product.stock_quantity} sản phẩm` : 'Hết hàng'}</div>
                            </div>

                            {/* Reviews */}
                            <div className="mt-6">
                                <h4 className="font-semibold">Đánh giá & Phản hồi</h4>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="text-lg font-bold text-yellow-500">{reviews.length ? avgRating.toFixed(1) : '—'}</div>
                                    <div className="text-sm text-gray-500">{reviews.length ? `${reviews.length} đánh giá` : 'Chưa có đánh giá'}</div>
                                </div>

                                {reviews.length ? (
                                    <div className="space-y-3 mt-3">
                                        {reviews.map((r, idx) => (
                                            <div key={idx} className="border p-3 rounded">
                                                <div className="flex items-center justify-between">
                                                    <div className="font-medium">{r.user || 'Khách'}</div>
                                                    <div className="text-sm text-gray-500">{r.rating}/5</div>
                                                </div>
                                                <div className="text-sm text-gray-700 mt-2">{r.comment}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500 mt-3">Chưa có đánh giá nào. Hãy là người đầu tiên nhận xét sản phẩm này!</div>
                                )}

                                <div className="mt-4">
                                    <h5 className="font-semibold">Gửi đánh giá của bạn</h5>
                                    <div className="mt-2 flex items-center gap-2">
                                        <label className="text-sm">Điểm</label>
                                        <select value={newRating} onChange={(e)=>setNewRating(e.target.value)} className="border rounded px-2 py-1">
                                            <option value={5}>5</option>
                                            <option value={4}>4</option>
                                            <option value={3}>3</option>
                                            <option value={2}>2</option>
                                            <option value={1}>1</option>
                                        </select>
                                    </div>
                                    <textarea value={newComment} onChange={(e)=>setNewComment(e.target.value)} className="w-full border rounded mt-2 p-2" rows={3} placeholder="Viết nhận xét của bạn..." />
                                    <div className="flex justify-end mt-2">
                                        <button onClick={submitReview} className="px-4 py-2 bg-indigo-600 text-white rounded">Gửi đánh giá</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    {/* Reviews */}
                    <div className="mt-6">
                        <h4 className="font-semibold mb-2">Đánh giá & Phản hồi</h4>
                        {product.reviews && product.reviews.length ? (
                            <div className="space-y-3">
                                {product.reviews.map((r, idx) => (
                                    <div key={idx} className="border p-3 rounded">
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium">{r.user || 'Khách'}</div>
                                            <div className="text-sm text-gray-500">{r.rating}/5</div>
                                        </div>
                                        <div className="text-sm text-gray-700 mt-2">{r.comment}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500">Chưa có đánh giá nào. Hãy là người đầu tiên nhận xét sản phẩm này!</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Zoom modal */}
            {zoomOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg overflow-hidden max-w-4xl w-full">
                        <div className="p-4 flex justify-end">
                            <button onClick={()=>setZoomOpen(false)} className="p-2 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4">
                            <img src={`https://placehold.co/1200x900/eef2ff/4f46e5?text=${encodeURIComponent(product.name)}`} alt={product.name} className="w-full h-auto object-contain" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}