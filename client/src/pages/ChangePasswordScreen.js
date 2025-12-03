//C:\Users\Admin\Downloads\DUANWEB(1)\client\src\pages\ChangePasswordScreen.js
import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, Lock, LogOut } from 'lucide-react'; 
import { updatePassword } from '../services/api'; 
import { roleToRoutes } from '../utils/constants';
import ShopLogo from '../assets/shop-logo-konen.png'; // Import Logo giống trang Login

// Component InputField (Style giống hệt trang Login)
const PasswordInput = ({ label, value, onChange, show, setShow, placeholder }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="relative">
            {/* Icon Lock bên trái */}
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            
            <input
                type={show ? "text" : "password"}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                required
            />
            
            {/* Nút Ẩn/Hiện bên phải */}
            <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 focus:outline-none"
            >
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
        </div>
    </div>
);

export const ChangePasswordScreen = ({ currentUser, setPath }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) return setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
        if (newPassword !== confirmPassword) return setError('Mật khẩu mới không khớp.');
        if (!currentUser || !currentUser.id) return setError('Lỗi thông tin user.');

        setIsSubmitting(true);
        try {
            await updatePassword(currentUser.id, oldPassword, newPassword); 
            alert('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
            localStorage.clear();
            window.location.href = '/'; 
        } catch (err) {
            setError(err.message || 'Mật khẩu cũ không chính xác.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        if (currentUser?.roleName === 'Customer') {
            setPath('/shop');
        } else {
            const defaultPath = roleToRoutes[currentUser?.roleName]?.[0]?.path || '/products';
            setPath(defaultPath);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 relative transform transition-all duration-300">
                
                {/* Nút Quay lại (Góc trái trên) */}
                <button 
                    onClick={handleBack}
                    className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100"
                    title="Quay lại"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>

                {/* Header với Logo */}
                <div className="text-center mb-6">
                    <img 
                        src={ShopLogo} 
                        alt="Store Logo" 
                        className="w-24 h-24 mx-auto mb-2 object-contain" 
                    />
                    <h2 className="text-2xl font-bold text-gray-800">Đổi Mật khẩu</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Tài khoản: <span className="font-semibold text-indigo-600">{currentUser?.fullName}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    
                    <PasswordInput 
                        label="Mật khẩu hiện tại" 
                        value={oldPassword} 
                        onChange={(e) => setOldPassword(e.target.value)} 
                        show={showOld} 
                        setShow={setShowOld} 
                        placeholder="Nhập mật khẩu cũ"
                    />

                    <PasswordInput 
                        label="Mật khẩu mới" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        show={showNew} 
                        setShow={setShowNew} 
                        placeholder="Nhập mật khẩu mới"
                    />

                    <PasswordInput 
                        label="Xác nhận mật khẩu mới" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        show={showConfirm} 
                        setShow={setShowConfirm} 
                        placeholder="Nhập lại mật khẩu mới"
                    />

                    {error && (
                        <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300 flex items-center">
                            <span className="mr-2">⚠️</span> {error}
                        </div>
                    )}
                    
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-2.5 px-4 rounded-lg text-white font-semibold shadow-md transition duration-300 flex items-center justify-center ${
                            isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                    >
                        {isSubmitting ? 'Đang xử lý...' : (
                            <>
                                <LogOut className="w-4 h-4 mr-2" />
                                Cập nhật & Đăng xuất
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};