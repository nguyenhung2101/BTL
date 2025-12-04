// C:\Users\Admin\Downloads\DUANWEB(1)\client\src\components\UserFormModal.js

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
// Import các hằng số và hàm hỗ trợ từ utils
import { ROLES } from '../utils/constants';
// Các hàm này cần được tái tạo lại trong dự án không dùng mockData
// Giả định các hàm này (generateUserId, getRoleId) nằm trong helpers.js hoặc được định nghĩa trong Pages/UsersScreen
const generateUserId = (roleName, index) => {
    const rolePrefix = Object.values(ROLES).find(r => r.name === roleName)?.prefix || 'USER';
    return `${rolePrefix}${index}`;
};
const getRoleId = (roleName) => {
    return Object.values(ROLES).find(r => r.name === roleName)?.id || 0;
};


// Cần truyền prop `currentUsers` từ UsersScreen để tính index cho ID mới
export const UserFormModal = ({ isOpen, onClose, initialData, onSave, currentUsers = [], currentUser }) => {
    const isNew = !initialData;
    
    // Hàm tìm ID số thứ tự lớn nhất cho Role mới (Giả lập tính toán trên Client)
    const getNextRoleIndex = (roleName) => {
        const prefix = Object.values(ROLES).find(r => r.name === roleName)?.prefix || 'USER';
        // Logic giả lập tính toán index, cần đồng bộ với Backend khi tạo User thực
        const maxIndex = currentUsers 
            .filter(u => u.id.startsWith(prefix))
            .map(u => parseInt(u.id.replace(prefix, '')) || 0)
            .reduce((max, current) => Math.max(max, current), 0);
        return maxIndex + 1;
    };
    
    const defaultRoleName = 'Sales';
    const initialRoleName = initialData ? initialData.roleName : defaultRoleName;
    const initialId = initialData ? initialData.id : generateUserId(initialRoleName, getNextRoleIndex(initialRoleName));
    
    const [formData, setFormData] = useState(initialData || {
        fullName: '', id: initialId, username: initialId, password: initialId, // Mật khẩu mặc định là Mã NV mới
        roleName: initialRoleName, email: '', phone: '', base_salary: 7000000,
        employee_type: 'Full-time', department: 'Sales', status: 'Active', must_change_password: false,
        date_of_birth: '', address: '', start_date: new Date().toISOString().slice(0, 10), commission_rate: 0.0150,
    });
    
    // Cập nhật Mã NV/Username/Password khi Role thay đổi (chỉ áp dụng khi tạo mới)
    useEffect(() => {
        if (isNew) {
            const newId = generateUserId(formData.roleName, getNextRoleIndex(formData.roleName));
            setFormData(prev => ({ 
                ...prev, 
                id: newId, 
                username: newId, 
                password: newId 
            }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.roleName, isNew]);
    
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    // Đồng bộ Department/Commission theo Role khi Role thay đổi
    useEffect(() => {
        let dept = 'General';
        let comm = 0;
        switch (formData.roleName) {
            case 'Sales': dept = 'Sales'; comm = 0.0150; break;
            case 'Online Sales': dept = 'E-commerce'; comm = 0.0180; break;
            case 'Warehouse': dept = 'Warehouse'; comm = 0.0000; break;
            case 'Shipper': dept = 'Logistics'; comm = 0.0000; break;
            case 'Owner': dept = 'Management'; comm = 0.0000; break;
            default: break;
        }
        setFormData(prev => ({ ...prev, department: dept, commission_rate: comm }));
    }, [formData.roleName]);


    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        
        // --- LOGIC CLIENT SIDE VALIDATION ---
        if (isNew && currentUsers.some(u => u.username === formData.username)) {
            setError('Tên tài khoản đã tồn tại. Vui lòng chọn tên khác.');
            return;
        }
        // *LƯU Ý: onSave sẽ là nơi gọi API để gửi dữ liệu lên Server*
        
        // Chuẩn hóa dữ liệu trước khi gửi đi
        const dataToSend = {
            ...formData,
            roleId: getRoleId(formData.roleName), // Thêm roleId cần thiết cho DB
            commission_rate: parseFloat(formData.commission_rate) || 0,
            base_salary: parseFloat(formData.base_salary) || 0,
        };
        
        onSave(dataToSend, isNew);
        onClose();
    };

    if (!isOpen) return null;
    
    const availableRoles = Object.values(ROLES).filter(role => {
        // Owner không thể bị chỉnh sửa vai trò thành vai trò khác
        if (!isNew && initialData?.roleName === 'Owner' && role.name !== 'Owner') return false; 
        // Vai trò khác không thể tạo Owner (chỉ Owner mới có quyền tạo Owner)
        if (role.name === 'Owner' && currentUser.roleName !== 'Owner') return false; 
        return true;
    });
    

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 className="text-xl font-bold">{isNew ? 'Thêm Nhân viên Mới' : `Sửa NV: ${initialData.fullName}`}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                {error && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg mb-4">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        {/* Cột 1: Thông tin cơ bản và Lương */}
                        <div className='space-y-4'>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Họ tên</label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="mt-1 w-full border border-gray-300 rounded-lg p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mã NV / Tài khoản</label>
                                <input type="text" name="username" value={formData.username} required className="mt-1 w-full border border-gray-300 rounded-lg p-2 font-mono bg-gray-100" disabled />
                                {isNew && <p className='text-xs text-green-600 mt-1'>Mã NV và Tài khoản sẽ là **{formData.username}**</p>}
                            </div>
                            
                            {isNew && (
                                <div>
                                    <label className="block text-sm font-medium text-red-700">Mật khẩu TẠM THỜI</label>
                                    <input type="text" name="password" value={formData.password} required className="mt-1 w-full border border-red-300 rounded-lg p-2 bg-red-50 font-mono" disabled />
                                    <p className="text-xs text-gray-500 mt-1">Mật khẩu mặc định là <strong>{formData.username}</strong>. Nhân viên không bắt buộc phải đổi mật khẩu ngay lập tức.</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Vai trò</label>
                                <select 
                                    name="roleName" 
                                    value={formData.roleName} 
                                    onChange={handleChange} 
                                    required 
                                    className="mt-1 w-full border border-gray-300 rounded-lg p-2" 
                                    // Khóa chỉnh sửa vai trò Owner nếu không phải Owner hoặc đang chỉnh sửa Owner
                                    disabled={!isNew && initialData?.roleName === 'Owner'}
                                >
                                    {Object.values(ROLES).map(role => (
                                        <option 
                                            key={role.id} 
                                            value={role.name}
                                            disabled={role.name === 'Owner' && currentUser.roleName !== 'Owner'} 
                                        >
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Lương cơ bản (VND)</label>
                                <input type="number" name="base_salary" value={formData.base_salary} onChange={handleChange} required min="0" className="mt-1 w-full border border-gray-300 rounded-lg p-2" />
                            </div>
                        </div>
                        {/* Cột 2: Thông tin liên hệ và Công việc */}
                        <div className='space-y-4'>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-lg p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-lg p-2" />
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ngày vào làm</label>
                                    <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-lg p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Loại NV</label>
                                    <select name="employee_type" value={formData.employee_type} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-lg p-2">
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Contract">Contract</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phòng ban</label>
                                <input type="text" name="department" value={formData.department} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-lg p-2 bg-gray-100" disabled />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tỷ lệ Hoa hồng</label>
                                <input type="number" name="commission_rate" step="0.0001" value={formData.commission_rate} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-lg p-2" />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-blue-400 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg shadow-md transition duration-200">
                        {isNew ? 'Tạo Tài khoản & Lưu' : 'Cập nhật thông tin'}
                    </button>
                </form>
            </div>
        </div>
    );
};