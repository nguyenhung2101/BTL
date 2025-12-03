//C:\Users\Admin\Downloads\DUANWEB(1)\server\routes\userRoutes.js
const express = require('express');
const router = express.Router();

// Import Controller và Middleware
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware'); 

// ============================================================
// A. ROUTES CÁ NHÂN (PROFILE) - [PHẦN BẠN ĐANG THIẾU]
// ============================================================
// Những route này dành cho User tự xem/sửa thông tin của chính mình

// 1. Lấy thông tin hồ sơ
// URL: /api/users/profile
router.get('/users/profile', verifyToken, userController.getUserProfile);

// 2. Cập nhật thông tin hồ sơ
// URL: /api/users/profile
router.put('/users/profile', verifyToken, userController.updateUserProfile);


// ============================================================
// B. ROUTES QUẢN TRỊ & QUẢN LÝ (MANAGEMENT) - [PHẦN BẠN GỬI]
// ============================================================
// Những route này dành cho Owner/Sale quản lý người khác

// 3. Lấy danh sách users
// URL: /api/admin/users
// (Controller sẽ tự lọc: Sale chỉ thấy Customer, Owner thấy All)
router.get('/admin/users', verifyToken, userController.listUsers);

// 4. Tạo user mới
// URL: /api/users/create
router.post('/users/create', verifyToken, userController.createUser);

// 5. Admin/Staff Reset Mật khẩu cho người khác
router.put('/admin/users/:id/reset-password', verifyToken, userController.adminResetPassword);

// 6. Cập nhật trạng thái (Active/Locked)
// URL: /api/admin/users/:id/status
router.put('/admin/users/:id/status', verifyToken, userController.updateUserStatus);
module.exports = router;