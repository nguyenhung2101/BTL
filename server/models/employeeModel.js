const db = require('../config/db.config');

const employeeModel = {
    // 1. Lấy danh sách nhân viên
    getAllEmployees: async () => {
        try {
            const query = `
                SELECT e.*, u.status, u.username 
                FROM employees e
                LEFT JOIN users u ON e.user_id = u.user_id 
                ORDER BY e.created_at DESC
            `;
            const [rows] = await db.query(query);
            return rows;
        } catch (error) {
            throw error;
        }
    },

    // 2. Kiểm tra trùng
    checkDuplicate: async (employeeId, email, phone) => {
        const query = `
            SELECT employee_id FROM employees 
            WHERE employee_id = ? OR email = ? OR phone = ?
        `;
        const [rows] = await db.query(query, [employeeId, email, phone]);
        return rows.length > 0;
    },

    // 3. Lấy User ID từ Employee ID
    getUserIdByEmpId: async (employeeId) => {
        try {
            const query = `SELECT user_id FROM employees WHERE employee_id = ?`;
            const [rows] = await db.query(query, [employeeId]);
            return rows.length > 0 ? rows[0].user_id : null;
        } catch (err) { throw err; }
    },

    // 4. Xóa User
    deleteUser: async (userId) => {
        try {
            const query = `DELETE FROM users WHERE user_id = ?`;
            await db.query(query, [userId]);
        } catch (err) { throw err; }
    },

    // 5. Cập nhật thông tin Nhân viên
    update: async (employeeId, data, newPasswordHash) => {
        const connection = await db.getConnection(); 
        try {
            await connection.beginTransaction();

            // A. Cập nhật bảng EMPLOYEES (Đây là nơi lưu Tên thật)
            const updateEmpQuery = `
                UPDATE employees 
                SET full_name = ?, email = ?, phone = ?, address = ?, base_salary = ?
                WHERE employee_id = ?
            `;
            await connection.query(updateEmpQuery, [
                data.fullName, data.email, data.phone, data.address, data.baseSalary, employeeId
            ]);

            // B. Cập nhật bảng USERS (Chỉ cập nhật Mật khẩu nếu có)
            // [QUAN TRỌNG]: Không update full_name vào bảng users nữa
            if (newPasswordHash) {
                const [rows] = await connection.query('SELECT user_id FROM employees WHERE employee_id = ?', [employeeId]);
                
                if (rows.length > 0) {
                    const userId = rows[0].user_id;
                    const updateUserSql = `
                        UPDATE users 
                        SET password_hash = ?, 
                            must_change_password = FALSE,
                            token_version = token_version + 1 
                        WHERE user_id = ?
                    `;
                    await connection.query(updateUserSql, [newPasswordHash, userId]);
                }
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // 6. Tạo mới Nhân viên (HÀM GÂY LỖI CŨ ĐÃ ĐƯỢC SỬA)
    create: async (empData, userData) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Bước 1: Tạo User (Chỉ thông tin đăng nhập)
            // [ĐÃ SỬA]: Xóa cột full_name ở dòng dưới đây
            const insertUserSql = `
                INSERT INTO users (user_id, username, password_hash, role_id, status, must_change_password)
                VALUES (?, ?, ?, ?, 'Active', FALSE)
            `;
            
            // [ĐÃ SỬA]: Xóa userData.full_name khỏi mảng tham số
            await connection.query(insertUserSql, [
                userData.user_id, 
                userData.username, 
                userData.password_hash, 
                userData.role_id
            ]);

            // Bước 2: Tạo Employee (Tên thật lưu ở đây)
            const insertEmpSql = `
                INSERT INTO employees (employee_id, user_id, full_name, email, phone, date_of_birth, address, start_date, employee_type, department, base_salary, commission_rate)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), 'Full-time', ?, ?, ?)
            `;
            await connection.query(insertEmpSql, [
                empData.employee_id, empData.user_id, empData.full_name, 
                empData.email, empData.phone, empData.date_of_birth, 
                empData.address, empData.department, 
                empData.base_salary, empData.commission_rate
            ]);

            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = employeeModel;