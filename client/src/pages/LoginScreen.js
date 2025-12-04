import React, { useState } from 'react';

import { Eye, EyeOff, Facebook, ArrowLeft, Chrome, Sparkles } from 'lucide-react';

import { login, register } from '../services/api';

import { roleToRoutes, ROLES } from '../utils/constants';

import ShopLogo from '../assets/shop-logo-konen.png';

import WingedLogo from '../assets/shop-logo-konen-bochu.png';

 import NenLogin from '../assets/nen.png';

 import Baoquanhlogo from '../assets/baoquanh-logo.png';

// --- INPUT FIELD (GIỮ NGUYÊN) ---

const InputField = ({ type, value, onChange, placeholder, showToggle, onToggle, isShow }) => (
    <div className="relative z-10 w-full"> 
        <div className="relative group">
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full px-5 py-4 bg-gray-50 border border-yellow-200 rounded-xl text-black placeholder-gray-500 
                           focus:outline-none focus:border-[#a38112]  focus:ring-2 focus:ring-[#D4AF37]/20 focus:shadow-[0_0_15px_rgba(253,185,49,0.5)] 
                           transition-all duration-300 text-sm tracking-wide shadow-sm"
                required
            />
            {showToggle && (
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-[#D4AF37] transition-colors focus:outline-none"
                >
                    {isShow ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            )}
        </div>
    </div>
);


// Đặt bên ngoài hoặc bên trong LoginScreen đều được
const styles = `
  @keyframes lightning-sweep {
    0% { transform: translateX(-100%) skewX(-20deg); opacity: 0; }
    10% { opacity: 1; } /* Hiện ra nhanh */
    80% { opacity: 1; }
    100% { transform: translateX(200%) skewX(-20deg); opacity: 0; } /* Biến mất hoàn toàn khi kết thúc */
  }
  
  .animate-lightning {
    animation: lightning-sweep 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
`;
export const LoginScreen = ({ setPath, setUser, setIsLoggedIn }) => {

    const [isRegistering, setIsRegistering] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    const [error, setError] = useState('');

    const [username, setUsername] = useState('');

    const [password, setPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);

    const [regFullName, setRegFullName] = useState('');

    const [regPhone, setRegPhone] = useState('');

    const [regPassword, setRegPassword] = useState('');

    const [regConfirmPassword, setRegConfirmPassword] = useState('');

    const [showRegPassword, setShowRegPassword] = useState(false);

    const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);



    const handleLogin = async (e) => {

        e.preventDefault();

        setError('');

        setIsLoading(true);

        try {

            const data = await login(username, password);

            const user = data.user;

            localStorage.setItem('jwt_token', data.token);

            localStorage.setItem('user_role_name', user.roleName);

            localStorage.setItem('user_id', user.userId);

            const fullUser = { ...user, roleName: user.roleName, mustChangePassword: user.mustChangePassword };

            localStorage.setItem('user', JSON.stringify(fullUser));

            setUser(fullUser);

            setIsLoggedIn(true);

            // Only enforce password change if REACT_APP_REQUIRE_PASSWORD_CHANGE === 'true'
            const requirePwChange = process.env.REACT_APP_REQUIRE_PASSWORD_CHANGE === 'true';
            if (requirePwChange && user.mustChangePassword) {
                setPath('/reset-password');
            } else if (user.roleName === 'Customer' || user.roleName === ROLES.CUSTOMER.name) {
                setPath('/shop');
            } else if (user.roleName === ROLES.OWNER.name) {
                setPath('/dashboard');
            } else {
                const defaultPath = roleToRoutes[user.roleName]?.[0]?.path || '/products';
                setPath(defaultPath);
            }

        } catch (err) { setError(err.message || 'Lỗi đăng nhập.'); }

        finally { setIsLoading(false); }

    };



    const handleRegister = async (e) => {

        e.preventDefault();

        setError('');



        // 1. Kiểm tra điền đầy đủ

        if (!regFullName.trim() || !regPhone.trim() || !regPassword.trim()) {

            return setError('Vui lòng điền đầy đủ thông tin.');

        }



        // 2. KIỂM TRA SỐ ĐIỆN THOẠI (MỚI THÊM)

        // Regex: ^0 có nghĩa là bắt đầu bằng 0

        // \d{9} có nghĩa là theo sau là 9 chữ số nữa (tổng là 10)

        // $ có nghĩa là kết thúc chuỗi (không thừa ký tự nào khác)

        const phoneRegex = /^0\d{9}$/;

        if (!phoneRegex.test(regPhone)) {

            return setError('Số điện thoại không hợp lệ (phải bắt đầu bằng số 0 và có 10 chữ số).');

        }



        // 3. Kiểm tra mật khẩu

        if (regPassword.length < 6) {

            return setError('Mật khẩu quá ngắn (tối thiểu 6 ký tự).');

        }

        if (regPassword !== regConfirmPassword) {

            return setError('Mật khẩu không khớp.');

        }



        setIsLoading(true);

        try {

            await register(regFullName, regPhone, regPassword);

            alert('Đăng ký thành công! Vui lòng đăng nhập.');

            setIsRegistering(false);

            setUsername(regPhone);

            setPassword(''); setRegFullName(''); setRegPhone(''); setRegPassword(''); setRegConfirmPassword('');

        } catch (err) {

            setError(err.message || 'Đăng ký thất bại.');

        } finally {

            setIsLoading(false);

        }

    };



    const handleSocialLogin = (platform) => {

        alert(`Đăng nhập ${platform} đang phát triển!`);

    };



    return (

        <div className="min-h-screen w-full bg-[#050505] font-sans flex items-center justify-center relative overflow-hidden selection:bg-[#D4AF37] selection:text-white">

 {/* =========================================

               1. BACKGROUND IMAGE

               ================================== */}

            <div className="absolute inset-0 z-0">

                <img

                    src={NenLogin}

                    alt="Background"

                    className="w-full h-full object-cover"

                />

                {/* Lớp phủ làm tối để chữ nổi bật */}

                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/30"></div>

            </div>



            {/* Back Button */}

            <button

                onClick={() => setPath('/')}

                className="absolute top-8 left-8 z-50 flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"

            >

                <div className="bg-white/5 p-2 rounded-full border border-white/10 group-hover:border-[#D4AF37] group-hover:bg-[#D4AF37]/10 transition-all">

                    <ArrowLeft className="w-5 h-5 group-hover:text-[#D4AF37] transition-colors" />

                </div>

            </button>



            {/* --- MAIN CARD --- */}

            {/* ĐÃ SỬA: max-w-[900px] để khung nhỏ gọn hơn */}

            <div className="relative z-10 w-full max-w-[900px] min-h-[580px]  grid grid-cols-1 lg:grid-cols-2

                          rounded-3xl overflow-hidden m-4 animate-fade-in-up

                          shadow-[0_0_80px_rgba(212,175,55,0.6)]

                          border border-[#D4AF37]/30">



                {/* LEFT COLUMN */}

                {/* ĐÃ SỬA: p-10 (giảm padding) */}

            <div className="hidden lg:flex flex-col items-center justify-center p-10 bg-[#080808] text-white relative overflow-hidden">
{/* Chèn style vào đây để đảm bảo nó nhận animation */}
    <style>{styles}</style>

    {/* --- HIỆU ỨNG ÁNH SÁNG (Chỉ hiện khi chuyển tab) --- */}
    <div key={isRegistering} className="absolute inset-0 z-50 pointer-events-none">
        
        {/* Dải sáng trắng chính */}
        <div className="
            absolute inset-0 w-2/3 h-full 
            bg-gradient-to-r from-transparent via-white/30 to-transparent 
            blur-md
            opacity-0 
            animate-lightning
        "></div>

        {/* Dải sáng vàng đi kèm (trễ hơn 1 chút) */}
        <div className="
            absolute inset-0 w-1/2 h-full 
            bg-gradient-to-r from-transparent via-[#FDB931]/40 to-transparent 
            blur-lg mix-blend-overlay
            opacity-0
            animate-lightning
            [animation-delay:100ms]
        "></div>
        
    </div>
              /* bao quanh logo */    

            <div className="absolute inset-0 z-0">

                <img

                    src={Baoquanhlogo}

                    alt="Background"

                    className="w-full h-full object-cover"

                />

                {/* Lớp phủ làm tối để chữ nổi bật */}

                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/30"></div>

            </div>



                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>



                    <div className="relative z-10 text-center">

                        <div className="relative flex justify-center items-center mb-8 group cursor-pointer">

                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#D4AF37]/30 rounded-full blur-2xl transition-all duration-700 ease-in-out group-hover:w-80 group-hover:h-80 group-hover:bg-[#D4AF37]/30 group-hover:blur-[80px]"></div>

                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 bg-[#D4AF37]/20 rounded-full blur-xl opacity-50 transition-all duration-500 ease-in-out group-hover:opacity-100 group-hover:blur-2xl"></div>

                            {/* ĐÃ SỬA: w-60 (Logo nhỏ lại chút) */}

                            <img src={WingedLogo || ShopLogo} alt="Aura Logo" className="w-60 h-auto object-contain relative z-10 transition-all duration-500 ease-out transform drop-shadow-[0_0_25px_rgba(212,175,55,0.5)] group-hover:scale-105 group-hover:-translate-y-2 group-hover:drop-shadow-[0_0_60px_rgba(212,175,55,0.8)]" />

                        </div>

                       

                       

                        <h2 className="text-3xl font-black uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-[#F9E29C] via-[#D4AF37] to-[#F9E29C] drop-shadow-sm mt-1 mb-1">Aura Store</h2>

                        <div className="flex items-center justify-center gap-0 opacity-60 mt-0 mb-6">

                            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent to-[#D4AF37]"></div>

                            <div className="h-[2px] w-24 bg-gradient-to-l from-transparent to-[#D4AF37]"></div>

                        </div>

                       

                        <p className="
                                /* 1. Tạo màu vàng kim chuyển sắc (Gradient Gold) */
                                text-transparent bg-clip-text bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#b38728]
                                
                                /* 2. Font chữ & Bố cục */
                                text-sm md:text-base font-medium italic leading-relaxed tracking-wide
                                max-w-xs mx-auto mt-4
                                
                                /* 3. Hiệu ứng phát sáng nhẹ để dễ đọc trên nền tối */
                                drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]
                            ">
                                "Tinh hoa thời trang & <br /> Đẳng cấp quản lý."
                            </p>

                    </div>

                    <div className="absolute bottom-4 text-center w-full z-10"><p className="text-[10px] text-white-600 uppercase tracking-widest opacity-50">© 2025 Aura Store </p></div>

                </div>



                {/* RIGHT COLUMN */}

                {/* ĐÃ SỬA: p-8 md:p-10 (giảm padding cho gọn) */}

                <div className="bg-white p-8 md:p-10 flex flex-col justify-center relative overflow-hidden">

                    <div className="lg:hidden flex justify-center mb-6"><img src={ShopLogo} alt="Logo" className="h-14 w-auto drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]" /></div>

                    <div className="text-center mb-8 relative z-10">

                        <h3 className="text-2xl font-bold text-[#856602] mb-2 uppercase tracking-wide">{isRegistering ? 'Gia Nhập Aura' : 'Chào Mừng Trở Lại'}</h3>

                        <p className="text-[#a08322] text-sm">{isRegistering ? 'Tạo tài khoản mới' : 'Đăng nhập để tiếp tục'}</p>

                    </div>

                    <div className="relative z-10">

                        {isRegistering ? (

                            <form onSubmit={handleRegister} className="space-y-4">

                                <InputField type="text" value={regFullName} onChange={(e) => setRegFullName(e.target.value)} placeholder="Họ và Tên" />

                                <InputField type="text" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="Số điện thoại" />

                                <InputField type={showRegPassword ? "text" : "password"} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Mật khẩu" showToggle={true} onToggle={() => setShowRegPassword(!showRegPassword)} isShow={showRegPassword} />

                                <InputField type={showRegConfirmPassword ? "text" : "password"} value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} placeholder="Xác nhận mật khẩu" showToggle={true} onToggle={() => setShowRegConfirmPassword(!showRegConfirmPassword)} isShow={showRegConfirmPassword} />

                                <button type="submit" disabled={isLoading} className="group relative w-full mt-4 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] text-[#000000] font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-300 overflow-hidden uppercase text-xs tracking-[0.15em]"><div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out"></div><span className="relative z-10">{isLoading ? 'Đang xử lý...' : 'Tạo Tài Khoản'}</span></button>

                            </form>

                        ) : (

                            <form onSubmit={handleLogin} className="space-y-4">

                                <InputField type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Số điện thoại / Username" />

                                <InputField type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" showToggle={true} onToggle={() => setShowPassword(!showPassword)} isShow={showPassword} />

                               <div className="flex justify-end mb-6">

                                    <button

                                        type="button"

                                        onClick={() => setPath('/contact')}

                                        className="text-xs font-medium text-gray-500 hover:text-[#6a5100] transition-colors relative group "

                                    >

                                        Quên mật khẩu?

                                        <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#D4AF37] group-hover:w-full transition-all duration-300"></span>

                                    </button>

                                </div>

                                <button type="submit" disabled={isLoading} className="group relative w-full bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] text-[#010101] font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-300 overflow-hidden uppercase text-xs tracking-[0.15em]">

                                    <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out"></div>

                                    <span className="relative z-10">{isLoading ? 'Đang xác thực...' : 'Đăng Nhập'}</span></button>

                            </form>

                        )}

                    </div>

                    {error && <div className="mt-6 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg text-center font-medium animate-pulse">{error}</div>}

             

                    <div className="grid grid-cols-2 gap-4 relative z-10">

                    </div>

                    <div className="mt-8 text-center text-sm text-gray-500 relative z-10">{isRegistering ? (<>Đã có tài khoản? <button onClick={() => { setIsRegistering(false); setError('') }} className="text-black font-bold hover:text-[#D4AF37] hover:underline ml-1 transition-colors">Đăng nhập</button></>) : (<>Chưa có tài khoản? <button onClick={() => { setIsRegistering(true); setError('') }} className="text-black font-bold hover:text-[#D4AF37] hover:underline ml-1 transition-colors">Đăng ký ngay</button></>)}</div>

                </div>

            </div>

           

        </div>

       

       

    );

};