import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Truck, CreditCard, Shield, ShoppingBag, MapPin, Sparkles, PhoneCall, Gift, Leaf, Info } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { getProfile, createOrder } from '../services/api';

// Trang thanh toán đơn giản: lấy giỏ hàng từ localStorage, cho chọn địa chỉ + phương thức thanh toán
const CheckoutScreen = ({ setPath, isLoggedIn, currentUser }) => {
  const [cartItems, setCartItems] = useState([]);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [shippingFee, setShippingFee] = useState(22000);
  const [shippingMethod, setShippingMethod] = useState('fast');
  const [voucher, setVoucher] = useState('');
  const [discount, setDiscount] = useState(0);
  const [giftWrap, setGiftWrap] = useState(false);
  const [insurance, setInsurance] = useState(false);
  const [ecoPack, setEcoPack] = useState(true);
  const [etaText, setEtaText] = useState('Nhận 1-3 ngày');
  const [useAltAddress, setUseAltAddress] = useState(false);
  const [altAddress, setAltAddress] = useState({ name: '', phone: '', address: '' });
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isPlacing, setIsPlacing] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setPath('/login');
      return;
    }

    let mounted = true;
    const loadProfile = async () => {
      try {
        const data = await getProfile();
        if (!mounted) return;
        const normalized = {
          name: data.full_name || data.fullName || data.c_name || data.e_name || currentUser?.fullName || currentUser?.username,
          phone: data.phone || data.c_phone || data.e_phone || currentUser?.phone,
          address: data.address || data.c_address || data.e_address || currentUser?.address,
        };
        setProfile(normalized);
      } catch (err) {
        console.error('Không tải được hồ sơ người dùng', err);
      } finally {
        if (mounted) setIsLoadingProfile(false);
      }
    };

    loadProfile();
    return () => { mounted = false; };
  }, [isLoggedIn, setPath, currentUser]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartItems(stored);
    } catch (e) {
      setCartItems([]);
    }
  }, []);

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
    const discountApplied = Math.min(discount, subtotal);
    const addons = (giftWrap ? 15000 : 0) + (insurance ? 8000 : 0);
    const total = subtotal - discountApplied + (shippingFee || 0) + addons;
    const rewardPoints = Math.floor(total / 1000) * 5; // demo: 5 điểm cho mỗi 1.000đ
    return { subtotal, discount: discountApplied, addons, total, rewardPoints };
  }, [cartItems, discount, shippingFee, giftWrap, insurance]);

  const handleShippingChange = (value) => {
    setShippingMethod(value);
    if (value === 'fast') setShippingFee(22000);
    else if (value === 'save') setShippingFee(12000);
    else if (value === 'express') setShippingFee(35000);

    if (value === 'fast') setEtaText('Nhận 1-3 ngày');
    if (value === 'save') setEtaText('Nhận 3-5 ngày');
    if (value === 'express') setEtaText('Trong ngày (tuỳ khu vực)');
  };

  const handleApplyVoucher = () => {
    if (!voucher.trim()) return;
    if (voucher.trim().toUpperCase() === 'SALE15') {
      setDiscount(15000);
      alert('Áp dụng mã SALE15: giảm 15.000đ (demo).');
    } else {
      setDiscount(0);
      alert('Mã không hợp lệ (demo).');
    }
  };

  const placeOrder = async () => {
    if (!isLoggedIn) { setPath('/login'); return; }
    if (!cartItems.length) {
      alert('Giỏ hàng trống.');
      return;
    }

    const missingVariant = cartItems.some(it => !it.variantId);
    if (missingVariant) {
      alert('Một số sản phẩm thiếu thông tin biến thể (size/màu). Vui lòng thêm lại sản phẩm để đặt hàng.');
      return;
    }

    const address = useAltAddress ? altAddress : profile;
    if (!address || !address.phone) {
      alert('Thiếu số điện thoại người nhận. Vui lòng bổ sung.');
      return;
    }

    const paymentCode = paymentMethod === 'card' ? 'CARD' : paymentMethod === 'cod' ? 'COD' : 'BANK';

    const orderData = {
      customerPhone: address.phone,
      customerName: address.name || profile?.name || 'Khách lẻ',
      customerAddress: address.address || '',
      employeeId: currentUser?.user_id || currentUser?.id || currentUser?.userId || 1,
      orderChannel: 'Online',
      directDelivery: false,
      items: cartItems.map(it => ({
        variantId: it.variantId,
        quantity: Number(it.qty) || 1,
        priceAtOrder: Number(it.price) || 0,
      })),
      subtotal: totals.subtotal,
      shippingCost: shippingFee || 0,
      finalTotal: totals.total,
      paymentMethod: paymentCode,
    };

    setIsPlacing(true);
    try {
      await createOrder(orderData);
      alert('Đặt hàng thành công! Đơn đã gửi đến trang quản lý.');
      localStorage.removeItem('cart');
      try { window.dispatchEvent(new Event('cartUpdated')); } catch (e) {}
      setPath('/shop');
    } catch (e) {
      console.error('Đặt hàng thất bại', e);
      alert(e?.message || e?.response?.data?.message || 'Đặt hàng thất bại. Vui lòng thử lại.');
    } finally {
      setIsPlacing(false);
    }
  };

  const displayAddress = useAltAddress ? altAddress : profile;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50">
      <header className="bg-white/80 backdrop-blur shadow-sm border-b border-emerald-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setPath('/shop')} className="p-2 rounded-full hover:bg-gray-100 border border-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-600 font-semibold">Thanh toán</div>
              <div className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                <ShoppingBag className="w-5 h-5 text-emerald-600" /> Hoàn tất đơn hàng
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">Bước 2/2</span>
            <span className="text-gray-400">Giỏ hàng</span>
            <span className="text-gray-300">—</span>
            <span className="text-gray-900 font-semibold">Thanh toán</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Địa chỉ nhận hàng */}
          <section className="bg-white rounded-2xl shadow-sm border border-emerald-50 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Truck className="w-4 h-4 text-emerald-600" /> Địa chỉ nhận hàng
            </div>
            {isLoadingProfile ? (
              <div className="text-sm text-gray-500">Đang tải thông tin khách hàng...</div>
            ) : displayAddress ? (
              <div className="text-sm text-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" /> {displayAddress.name || 'Khách hàng'} • {displayAddress.phone || 'Chưa có số'}
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{useAltAddress ? 'Địa chỉ khác' : 'Mặc định'}</span>
                  </div>
                  <div className="text-gray-600 mt-1 leading-relaxed">{displayAddress.address || 'Chưa có địa chỉ, vui lòng cập nhật hồ sơ.'}</div>
                </div>
                <button className="text-sm text-emerald-700 hover:underline font-semibold" onClick={() => setPath('/profile')}>Thay đổi hồ sơ</button>
              </div>
            ) : (
              <div className="text-sm text-red-600">Không lấy được thông tin khách hàng. Vui lòng đăng nhập lại.</div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" id="useAlt" checked={useAltAddress} onChange={(e)=>setUseAltAddress(e.target.checked)} />
              <label htmlFor="useAlt" className="font-semibold">Giao đến địa chỉ khác</label>
            </div>

            {useAltAddress && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs text-gray-500">Họ và tên</label>
                  <input value={altAddress.name} onChange={(e)=>setAltAddress({...altAddress, name:e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="Tên người nhận" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Số điện thoại</label>
                  <input value={altAddress.phone} onChange={(e)=>setAltAddress({...altAddress, phone:e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="SĐT người nhận" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs text-gray-500">Địa chỉ giao</label>
                  <input value={altAddress.address} onChange={(e)=>setAltAddress({...altAddress, address:e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
                </div>
              </div>
            )}
          </section>

          {/* Danh sách sản phẩm */}
          <section className="bg-white rounded-2xl shadow-sm border border-emerald-50 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-800">Sản phẩm</div>
              <span className="text-xs text-gray-500">{cartItems.length} sản phẩm</span>
            </div>
            {cartItems.length === 0 ? (
              <div className="text-gray-500 text-sm">Giỏ hàng trống.</div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gradient-to-r from-white to-emerald-50/40">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shadow-sm">
                      <img
                        src={item.image_url || `https://placehold.co/160x160/eef2ff/4f46e5?text=${encodeURIComponent(item.name?.substring(0, 10) || 'SP')}`}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 line-clamp-1">{item.name}</div>
                      <div className="text-xs text-gray-500">Giá: {formatCurrency(item.price)}</div>
                      <div className="text-xs text-gray-600 mt-1">Size: <span className="font-medium">{item.size || '—'}</span> • Màu: <span className="font-medium">{item.color || '—'}</span> • SL: <span className="font-medium">{item.qty || 1}</span></div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                        <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Đổi số lượng</span>
                        <input
                          type="number"
                          min={1}
                          value={item.qty || 1}
                          className="w-20 border rounded px-2 py-1 text-sm"
                          onChange={(e)=>{
                            const newQty = Math.max(1, Number(e.target.value) || 1);
                            const updated = [...cartItems];
                            updated[idx] = { ...item, qty: newQty };
                            setCartItems(updated);
                            localStorage.setItem('cart', JSON.stringify(updated));
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-gray-900">
                      {formatCurrency((Number(item.price) || 0) * (Number(item.qty) || 0))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Ghi chú */}
          <section className="bg-white rounded-2xl shadow-sm border border-indigo-50 p-5">
            <div className="text-sm font-semibold text-gray-800 mb-2">Lời nhắn cho người bán</div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến"
            />
          </section>
        </div>

        {/* Thanh toán */}
        <aside className="space-y-4">
          <section className="bg-white rounded-2xl shadow-sm border border-emerald-50 p-5 space-y-4">
            <div className="text-sm font-semibold text-gray-800">Voucher & Vận chuyển</div>
            <div className="flex items-center gap-2">
              <input
                value={voucher}
                onChange={(e) => setVoucher(e.target.value)}
                placeholder="Nhập mã giảm giá (SALE15)"
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <button onClick={handleApplyVoucher} className="px-3 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Áp dụng</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="text-gray-700 font-semibold">Chọn phương thức giao</div>
              <div className="space-y-2">
                <label className={`flex items-center justify-between p-3 rounded-xl border ${shippingMethod==='fast'?'border-emerald-200 bg-emerald-50':'border-gray-200 bg-white'}`}>
                  <div>
                    <div className="font-semibold text-gray-900">Nhanh</div>
                    <div className="text-xs text-gray-500">Nhận 1-3 ngày</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">{formatCurrency(22000)}</span>
                    <input type="radio" name="ship" checked={shippingMethod==='fast'} onChange={() => handleShippingChange('fast')} />
                  </div>
                </label>
                <label className={`flex items-center justify-between p-3 rounded-xl border ${shippingMethod==='save'?'border-emerald-200 bg-emerald-50':'border-gray-200 bg-white'}`}>
                  <div>
                    <div className="font-semibold text-gray-900">Tiết kiệm</div>
                    <div className="text-xs text-gray-500">Nhận 3-5 ngày</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">{formatCurrency(12000)}</span>
                    <input type="radio" name="ship" checked={shippingMethod==='save'} onChange={() => handleShippingChange('save')} />
                  </div>
                </label>
                <label className={`flex items-center justify-between p-3 rounded-xl border ${shippingMethod==='express'?'border-emerald-200 bg-emerald-50':'border-gray-200 bg-white'}`}>
                  <div>
                    <div className="font-semibold text-gray-900">Hỏa tốc</div>
                    <div className="text-xs text-gray-500">Trong ngày (tuỳ khu vực)</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">{formatCurrency(35000)}</span>
                    <input type="radio" name="ship" checked={shippingMethod==='express'} onChange={() => handleShippingChange('express')} />
                  </div>
                </label>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-500 bg-emerald-50/70 border border-emerald-100 rounded-lg p-3">
              <Info className="w-4 h-4 text-emerald-500 mt-0.5" />
              <div>
                {etaText}. Phí vận chuyển hiển thị cho toàn bộ đơn hàng (demo).
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={giftWrap} onChange={(e)=>setGiftWrap(e.target.checked)} />
                <span className="flex items-center gap-1"><Gift className="w-4 h-4 text-amber-500" /> Gói quà (+15.000đ)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={insurance} onChange={(e)=>setInsurance(e.target.checked)} />
                <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-emerald-500" /> Bảo hiểm (+8.000đ)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={ecoPack} onChange={(e)=>setEcoPack(e.target.checked)} />
                <span className="flex items-center gap-1"><Leaf className="w-4 h-4 text-lime-600" /> Gói eco</span>
              </label>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-emerald-50 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <CreditCard className="w-4 h-4 text-emerald-600" /> Phương thức thanh toán
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <label className={`flex items-center justify-between p-3 rounded-xl border ${paymentMethod==='wallet'?'border-emerald-200 bg-emerald-50':'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" name="pay" value="wallet" checked={paymentMethod==='wallet'} onChange={() => setPaymentMethod('wallet')} />
                  <div>
                    <div className="font-semibold text-gray-900">Tài khoản ngân hàng</div>
                    <div className="text-xs text-gray-500">Thanh toán qua tài khoản ngân hàng liên kết</div>
                  </div>
                </div>
              </label>
              <label className={`flex items-center justify-between p-3 rounded-xl border ${paymentMethod==='card'?'border-emerald-200 bg-emerald-50':'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" name="pay" value="card" checked={paymentMethod==='card'} onChange={() => setPaymentMethod('card')} />
                  <div>
                    <div className="font-semibold text-gray-900">Thẻ tín dụng/Ghi nợ</div>
                    <div className="text-xs text-gray-500">Hỗ trợ Visa/Master/JCB</div>
                  </div>
                </div>
              </label>
              <label className={`flex items-center justify-between p-3 rounded-xl border ${paymentMethod==='cod'?'border-emerald-200 bg-emerald-50':'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" name="pay" value="cod" checked={paymentMethod==='cod'} onChange={() => setPaymentMethod('cod')} />
                  <div>
                    <div className="font-semibold text-gray-900">Thanh toán khi nhận hàng (COD)</div>
                    <div className="text-xs text-gray-500">Phí thu hộ 0đ</div>
                  </div>
                </div>
              </label>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-md border border-emerald-50 p-5 space-y-3 lg:sticky lg:top-4">
            <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Tóm tắt đơn hàng
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Tổng tiền hàng</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Giảm giá</span>
              <span className="text-emerald-600">-{formatCurrency(totals.discount)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Phụ phí gói/bảo hiểm</span>
              <span>{formatCurrency(totals.addons)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Phí vận chuyển</span>
              <span>{formatCurrency(shippingFee)}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Điểm thưởng dự kiến</span>
              <span>+{totals.rewardPoints} điểm</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-red-600 border-t pt-2 mt-2">
              <span>Tổng thanh toán</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
            <button
              onClick={placeOrder}
              disabled={isPlacing}
              className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
            >
              <Shield className="w-4 h-4" /> {isPlacing ? 'Đang đặt hàng...' : 'Đặt hàng an toàn'}
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
              <Shield className="w-4 h-4 text-emerald-500" /> Thanh toán bảo vệ • Đổi trả trong 7 ngày (demo)
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>Hỗ trợ 24/7</span>
              <button className="flex items-center gap-1 text-indigo-600 font-semibold" onClick={()=>alert('Gọi 1900-xxxx (demo)')}>
                <PhoneCall className="w-4 h-4" /> Gọi hỗ trợ
              </button>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
};

export default CheckoutScreen;
