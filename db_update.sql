-- ================================================================
-- CHỈ TẠO CẤU TRÚC BẢNG (SCHEMA + GIỮ DỮ LIỆU)
-- ================================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS `store_management_db`;
CREATE DATABASE `store_management_db` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;
USE `store_management_db`;

-- BẢNG roles
CREATE TABLE IF NOT EXISTS `roles` (
  `role_id` INT UNSIGNED NOT NULL PRIMARY KEY,
  `role_name` VARCHAR(50) NOT NULL UNIQUE,
  `prefix` VARCHAR(10) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG users
CREATE TABLE `users` (
  `user_id` VARCHAR(15) NOT NULL PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  
  `token_version` INT DEFAULT 0,       -- Cột mới để quản lý đăng xuất
  `status` ENUM('Active', 'Inactive', 'Locked', 'Hoạt động', 'Đã khóa') NOT NULL DEFAULT 'Active',
  `must_change_password` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG customers (chỉ tạo 1 lần) - có thể liên kết tới user nếu khách hàng đăng ký
CREATE TABLE IF NOT EXISTS `customers` (
  `customer_id` VARCHAR(15) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(15) NULL UNIQUE,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NULL,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `address` VARCHAR(255) NULL,
  `date_of_birth` DATE NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG employees
CREATE TABLE IF NOT EXISTS `employees` (
  `employee_id` VARCHAR(15) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(15) NOT NULL UNIQUE,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NULL,
  `date_of_birth` DATE NULL,
  `address` VARCHAR(255) NULL,
  `start_date` DATE NOT NULL,
  `employee_type` ENUM('Full-time','Part-time','Contract') NOT NULL,
  `department` VARCHAR(50) NOT NULL,
  `base_salary` DECIMAL(18,2) NOT NULL,
  `commission_rate` DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG salaries: net_salary là cột GENERATED STORED để tránh sai lệc
-- TẠO BẢNG MỚI
DROP TABLE IF EXISTS `salaries`;

-- TẠO BẢNG MỚI
CREATE TABLE IF NOT EXISTS `salaries` (
  `salary_id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(15) NOT NULL,
  `month_year` DATE NOT NULL,
  `base_salary` DECIMAL(18,2) NOT NULL,
  `sales_commission` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `bonus` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `deductions` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `net_salary` DECIMAL(18,2) AS (base_salary + sales_commission + bonus - deductions) STORED,
  `paid_at` DATETIME NULL,
  `paid_status` ENUM('Paid','Unpaid') NOT NULL DEFAULT 'Unpaid',
  UNIQUE KEY `uk_emp_month` (`employee_id`,`month_year`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CATEGORIES
CREATE TABLE IF NOT EXISTS `categories` (
  `category_id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `category_name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `products` (
  `product_id` VARCHAR(20) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `category_id` INT UNSIGNED NULL,
  `price` DECIMAL(18,2) NOT NULL,
  `cost_price` DECIMAL(18,2) NOT NULL,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `image_url` VARCHAR(500) DEFAULT NULL,
  `brand` VARCHAR(100) DEFAULT NULL,
  `avg_rating` FLOAT DEFAULT 0,
  `review_count` INT DEFAULT 0,
  `sizes` VARCHAR(255) DEFAULT NULL,
  `colors` VARCHAR(255) DEFAULT NULL,
  `material` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`category_id`) 
      REFERENCES `categories`(`category_id`) ON DELETE SET NULL,

  INDEX idx_category_id (`category_id`),
  CONSTRAINT uq_products_name_brand UNIQUE (`name`, `brand`)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_reviews (
    review_id      INT AUTO_INCREMENT PRIMARY KEY,
    product_id     VARCHAR(20) NOT NULL,
    user_id        VARCHAR(20) NOT NULL,
    rating         INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text    TEXT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- ràng buộc khóa ngoại
    CONSTRAINT fk_review_product FOREIGN KEY (product_id)
        REFERENCES products(product_id),
    CONSTRAINT fk_review_user FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    -- 1 người chỉ được review 1 lần cho 1 sản phẩm
    CONSTRAINT unique_user_product_review UNIQUE (product_id, user_id)
);

-- ORDERS: thêm thông tin địa chỉ giao hàng / người nhận để phục vụ đơn online
CREATE TABLE IF NOT EXISTS `orders` (
  `order_id` VARCHAR(20) NOT NULL PRIMARY KEY,
  `customer_id` VARCHAR(15) NULL,
  `order_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_date` DATETIME NULL,
  `order_channel` ENUM('Trực tiếp','Online') NOT NULL,
  `direct_delivery` BOOLEAN NOT NULL DEFAULT FALSE,
  `subtotal` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `shipping_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `final_total` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `status` ENUM('Đang Xử Lý','Đang Giao','Hoàn Thành','Đã Hủy') NOT NULL DEFAULT 'Đang xử lý',
  `payment_status` ENUM('Chưa Thanh Toán','Đã Thanh Toán','Đã Hoàn Tiền') NOT NULL DEFAULT 'Chưa Thanh Toán',
  `payment_method` ENUM('Tiền mặt','Thẻ tín dụng','Chuyển khoản') NOT NULL,
  `staff_id` VARCHAR(15) NOT NULL,
  `delivery_staff_id` VARCHAR(15) NULL,
  `note` TEXT NULL,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`customer_id`) ON DELETE SET NULL,
  FOREIGN KEY (`staff_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT,
  FOREIGN KEY (`delivery_staff_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  INDEX idx_orders_customer (`customer_id`),
  INDEX idx_orders_staff (`staff_id`),
  INDEX idx_orders_delivery_staff (`delivery_staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- ORDER_DETAILS
CREATE TABLE IF NOT EXISTS `order_details` (
  `order_id` VARCHAR(20) NOT NULL,
  `product_id` VARCHAR(20) NOT NULL,
  `quantity` INT NOT NULL,
  `price_at_order` DECIMAL(18,2) NOT NULL,
  PRIMARY KEY (`order_id`,`product_id`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT,
  INDEX idx_od_product (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- STOCK_IN
CREATE TABLE IF NOT EXISTS `stock_in` (
  `stock_in_id` VARCHAR(20) NOT NULL PRIMARY KEY,
  `supplier_name` VARCHAR(100) NOT NULL,
  `import_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_cost` DECIMAL(18,2) NOT NULL,
  `user_id` VARCHAR(15) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT,
  INDEX idx_stock_user (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- STOCK_IN_DETAILS
CREATE TABLE IF NOT EXISTS `stock_in_details` (
  `stock_in_id` VARCHAR(20) NOT NULL,
  `product_id` VARCHAR(20) NOT NULL,
  `quantity` INT NOT NULL,
  `cost_price` DECIMAL(18,2) NOT NULL,
  PRIMARY KEY (`stock_in_id`,`product_id`),
  FOREIGN KEY (`stock_in_id`) REFERENCES `stock_in`(`stock_in_id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
-- ------------------------------------------------------------------
-- Migration: Disable forced password change globally
-- This block makes `must_change_password` default to FALSE for new users
-- and clears the flag for existing users.
-- Run this on an existing database to remove forced-change behaviour.
-- ------------------------------------------------------------------
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- Ensure column has default FALSE (non-destructive)
ALTER TABLE `users`
  MODIFY `must_change_password` BOOLEAN NOT NULL DEFAULT FALSE;

-- Clear flag for all existing users (0 = FALSE)
UPDATE `users` SET `must_change_password` = 0 WHERE `must_change_password` <> 0;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
-- End migration block

-- Dữ liệu mẫu tối thiểu cho roles
INSERT IGNORE INTO `roles` (`role_id`, `role_name`, `prefix`, `description`) VALUES
(1,'Owner','OWNER','Quản lý toàn bộ hệ thống'),
(2,'Customer','CUS','Khách hàng mua sắm trực tuyến'),
(3,'Warehouse','WH','Quản lý nhập xuất, tồn kho'),
(4,'Sales','SALES','Nhân viên bán hàng trực tiếp'),
(5,'Online Sales','OS','Nhân viên xử lý đơn hàng online'),
(6,'Shipper','SHIP','Nhân viên giao hàng');


-- Users sample data

-- Owner
INSERT IGNORE INTO `users` (`user_id`, `username`, `password_hash`, `role_id`, `status`, `must_change_password`) VALUES
('OWNER', 'OWNER', 'OWNER', 1, 'Active', FALSE);

-- Customers
INSERT IGNORE INTO `users` (`user_id`, `username`, `password_hash`, `role_id`, `status`, `must_change_password`) VALUES
('CUS1', '0900000001', '0900000001', 2, 'Active', FALSE),
('CUS2', '0900000002', '0900000002', 2, 'Active', FALSE),
('CUS3', '0900000003', '0900000003', 2, 'Active', FALSE),
('CUS4', '0900000004', '0900000004', 2, 'Active', FALSE),
('CUS5', '0900000005', '0900000005', 2, 'Active', FALSE),
('CUS6', '0900000006', '0900000006', 2, 'Active', FALSE),
('CUS7', '0900000007', '0900000007', 2, 'Active', FALSE),
('CUS8', '0900000008', '0900000008', 2, 'Active', FALSE),
('CUS9', '0900000009', '0900000009', 2, 'Active', FALSE),
('CUS10', '0900000010', '0900000010', 2, 'Active', FALSE),
('CUS11', '0900000011', '0900000011', 2, 'Active', FALSE),
('CUS12', '0900000012', '0900000012', 2, 'Active', FALSE),
('CUS13', '0900000013', '0900000013', 2, 'Active', FALSE),
('CUS14', '0900000014', '0900000014', 2, 'Active', TRUE),
('CUS15', '0900000015', '0900000015', 2, 'Active', TRUE),
('CUS16', '0900000016', '0900000016', 2, 'Active', TRUE),
('CUS17', '0900000017', '0900000017', 2, 'Active', TRUE),
('CUS18', '0900000018', '0900000018', 2, 'Active', TRUE),
('CUS19', '0900000019', '0900000019', 2, 'Active', TRUE),
('CUS20', '0900000020', '0900000020', 2, 'Active', TRUE),
('CUS21', '0900000021', '0900000021', 2, 'Active', TRUE),
('CUS22', '0900000022', '0900000022', 2, 'Active', TRUE),
('CUS23', '0900000023', '0900000023', 2, 'Active', TRUE),
('CUS24', '0900000024', '0900000024', 2, 'Active', TRUE),
('CUS25', '0900000025', '0900000025', 2, 'Active', TRUE),
('CUS26', '0900000026', '0900000026', 2, 'Active', TRUE),
('CUS27', '0900000027', '0900000027', 2, 'Active', TRUE),
('CUS28', '0900000028', '0900000028', 2, 'Active', TRUE),
('CUS29', '0900000029', '0900000029', 2, 'Active', TRUE),
('CUS30', '0900000030', '0900000030', 2, 'Active', TRUE),
('CUS31', '0900000031', '0900000031', 2, 'Active', TRUE),
('CUS32', '0900000032', '0900000032', 2, 'Active', TRUE),
('CUS33', '0900000033', '0900000033', 2, 'Active', TRUE),
('CUS34', '0900000034', '0900000034', 2, 'Active', TRUE),
('CUS35', '0900000035', '0900000035', 2, 'Active', TRUE),
('CUS36', '0900000036', '0900000036', 2, 'Active', TRUE),
('CUS37', '0900000037', '0900000037', 2, 'Active', TRUE),
('CUS38', '0900000038', '0900000038', 2, 'Active', TRUE),
('CUS39', '0900000039', '0900000039', 2, 'Active', TRUE),
('CUS40', '0900000040', '0900000040', 2, 'Active', TRUE),
('CUS41', '0900000041', '0900000041', 2, 'Active', TRUE),
('CUS42', '0900000042', '0900000042', 2, 'Active', TRUE),
('CUS43', '0900000043', '0900000043', 2, 'Active', TRUE),
('CUS44', '0900000044', '0900000044', 2, 'Active', TRUE),
('CUS45', '0900000045', '0900000045', 2, 'Active', TRUE),
('CUS46', '0900000046', '0900000046', 2, 'Active', TRUE),
('CUS47', '0900000047', '0900000047', 2, 'Active', TRUE),
('CUS48', '0900000048', '0900000048', 2, 'Active', TRUE),
('CUS49', '0900000049', '0900000049', 2, 'Active', TRUE),
('CUS50', '0900000050', '0900000050', 2, 'Active', TRUE),
('CUS51', '0900000051', '0900000051', 2, 'Active', TRUE),
('CUS52', '0900000052', '0900000052', 2, 'Active', TRUE),
('CUS53', '0900000053', '0900000053', 2, 'Active', TRUE),
('CUS54', '0900000054', '0900000054', 2, 'Active', TRUE),
('CUS55', '0900000055', '0900000055', 2, 'Active', TRUE),
('CUS56', '0900000056', '0900000056', 2, 'Active', TRUE),
('CUS57', '0900000057', '0900000057', 2, 'Active', TRUE),
('CUS58', '0900000058', '0900000058', 2, 'Active', TRUE),
('CUS59', '0900000059', '0900000059', 2, 'Active', TRUE),
('CUS60', '0900000060', '0900000060', 2, 'Active', TRUE),
('CUS61', '0900000061', '0900000061', 2, 'Active', TRUE),
('CUS62', '0900000062', '0900000062', 2, 'Active', TRUE),
('CUS63', '0900000063', '0900000063', 2, 'Active', TRUE),
('CUS64', '0900000064', '0900000064', 2, 'Active', TRUE),
('CUS65', '0900000065', '0900000065', 2, 'Active', TRUE),
('CUS66', '0900000066', '0900000066', 2, 'Active', TRUE),
('CUS67', '0900000067', '0900000067', 2, 'Active', TRUE),
('CUS68', '0900000068', '0900000068', 2, 'Active', TRUE),
('CUS69', '0900000069', '0900000069', 2, 'Active', TRUE),
('CUS70', '0900000070', '0900000070', 2, 'Active', TRUE),
('CUS71', '0900000071', '0900000071', 2, 'Active', TRUE),
('CUS72', '0900000072', '0900000072', 2, 'Active', TRUE),
('CUS73', '0900000073', '0900000073', 2, 'Active', TRUE),
('CUS74', '0900000074', '0900000074', 2, 'Active', TRUE),
('CUS75', '0900000075', '0900000075', 2, 'Active', TRUE),
('CUS76', '0900000076', '0900000076', 2, 'Active', TRUE),
('CUS77', '0900000077', '0900000077', 2, 'Active', TRUE),
('CUS78', '0900000078', '0900000078', 2, 'Active', TRUE),
('CUS79', '0900000079', '0900000079', 2, 'Active', TRUE),
('CUS80', '0900000080', '0900000080', 2, 'Active', TRUE),
('CUS81', '0900000081', '0900000081', 2, 'Active', TRUE),
('CUS82', '0900000082', '0900000082', 2, 'Active', TRUE),
('CUS83', '0900000083', '0900000083', 2, 'Active', TRUE),
('CUS84', '0900000084', '0900000084', 2, 'Active', TRUE),
('CUS85', '0900000085', '0900000085', 2, 'Active', TRUE),
('CUS86', '0900000086', '0900000086', 2, 'Active', TRUE),
('CUS87', '0900000087', '0900000087', 2, 'Active', TRUE),
('CUS88', '0900000088', '0900000088', 2, 'Active', TRUE),
('CUS89', '0900000089', '0900000089', 2, 'Active', TRUE),
('CUS90', '0900000090', '0900000090', 2, 'Active', TRUE),
('CUS91', '0900000091', '0900000091', 2, 'Active', TRUE),
('CUS92', '0900000092', '0900000092', 2, 'Active', TRUE),
('CUS93', '0900000093', '0900000093', 2, 'Active', TRUE),
('CUS94', '0900000094', '0900000094', 2, 'Active', TRUE),
('CUS95', '0900000095', '0900000095', 2, 'Active', TRUE),
('CUS96', '0900000096', '0900000096', 2, 'Active', TRUE),
('CUS97', '0900000097', '0900000097', 2, 'Active', TRUE),
('CUS98', '0900000098', '0900000098', 2, 'Active', TRUE),
('CUS99', '0900000099', '0900000099', 2, 'Active', TRUE),
('CUS100', '0900000100', '0900000100', 2, 'Active', TRUE),
('CUS101', '0900000101', '0900000101', 2, 'Active', TRUE),
('CUS102', '0900000102', '0900000102', 2, 'Active', TRUE),
('CUS103', '0900000103', '0900000103', 2, 'Active', TRUE),
('CUS104', '0900000104', '0900000104', 2, 'Active', TRUE),
('CUS105', '0900000105', '0900000105', 2, 'Active', TRUE),
('CUS106', '0900000106', '0900000106', 2, 'Active', TRUE),
('CUS107', '0900000107', '0900000107', 2, 'Active', TRUE),
('CUS108', '0900000108', '0900000108', 2, 'Active', TRUE),
('CUS109', '0900000109', '0900000109', 2, 'Active', TRUE),
('CUS110', '0900000110', '0900000110', 2, 'Active', TRUE),
('CUS111', '0900000111', '0900000111', 2, 'Active', TRUE),
('CUS112', '0900000112', '0900000112', 2, 'Active', TRUE),
('CUS113', '0900000113', '0900000113', 2, 'Active', TRUE),
('CUS114', '0900000114', '0900000114', 2, 'Active', TRUE),
('CUS115', '0900000115', '0900000115', 2, 'Active', TRUE),
('CUS116', '0900000116', '0900000116', 2, 'Active', TRUE),
('CUS117', '0900000117', '0900000117', 2, 'Active', TRUE),
('CUS118', '0900000118', '0900000118', 2, 'Active', TRUE),
('CUS119', '0900000119', '0900000119', 2, 'Active', TRUE),
('CUS120', '0900000120', '0900000120', 2, 'Active', TRUE),
('CUS121', '0900000121', '0900000121', 2, 'Active', TRUE),
('CUS122', '0900000122', '0900000122', 2, 'Active', TRUE),
('CUS123', '0900000123', '0900000123', 2, 'Active', TRUE),
('CUS124', '0900000124', '0900000124', 2, 'Active', TRUE),
('CUS125', '0900000125', '0900000125', 2, 'Active', TRUE),
('CUS126', '0900000126', '0900000126', 2, 'Active', TRUE),
('CUS127', '0900000127', '0900000127', 2, 'Active', TRUE),
('CUS128', '0900000128', '0900000128', 2, 'Active', TRUE),
('CUS129', '0900000129', '0900000129', 2, 'Active', TRUE),
('CUS130', '0900000130', '0900000130', 2, 'Active', TRUE),
('CUS131', '0900000131', '0900000131', 2, 'Active', TRUE),
('CUS132', '0900000132', '0900000132', 2, 'Active', TRUE),
('CUS133', '0900000133', '0900000133', 2, 'Active', TRUE),
('CUS134', '0900000134', '0900000134', 2, 'Active', TRUE),
('CUS135', '0900000135', '0900000135', 2, 'Active', TRUE),
('CUS136', '0900000136', '0900000136', 2, 'Active', TRUE),
('CUS137', '0900000137', '0900000137', 2, 'Active', TRUE),
('CUS138', '0900000138', '0900000138', 2, 'Active', TRUE),
('CUS139', '0900000139', '0900000139', 2, 'Active', TRUE),
('CUS140', '0900000140', '0900000140', 2, 'Active', TRUE),
('CUS141', '0900000141', '0900000141', 2, 'Active', TRUE),
('CUS142', '0900000142', '0900000142', 2, 'Active', TRUE),
('CUS143', '0900000143', '0900000143', 2, 'Active', TRUE),
('CUS144', '0900000144', '0900000144', 2, 'Active', TRUE),
('CUS145', '0900000145', '0900000145', 2, 'Active', TRUE),
('CUS146', '0900000146', '0900000146', 2, 'Active', TRUE),
('CUS147', '0900000147', '0900000147', 2, 'Active', TRUE),
('CUS148', '0900000148', '0900000148', 2, 'Active', TRUE),
('CUS149', '0900000149', '0900000149', 2, 'Active', TRUE),
('CUS150', '0900000150', '0900000150', 2, 'Active', TRUE),
('CUS151', '0900000151', '0900000151', 2, 'Active', TRUE),
('CUS152', '0900000152', '0900000152', 2, 'Active', TRUE),
('CUS153', '0900000153', '0900000153', 2, 'Active', TRUE),
('CUS154', '0900000154', '0900000154', 2, 'Active', TRUE),
('CUS155', '0900000155', '0900000155', 2, 'Active', TRUE),
('CUS156', '0900000156', '0900000156', 2, 'Active', TRUE),
('CUS157', '0900000157', '0900000157', 2, 'Active', TRUE),
('CUS158', '0900000158', '0900000158', 2, 'Active', TRUE),
('CUS159', '0900000159', '0900000159', 2, 'Active', TRUE),
('CUS160', '0900000160', '0900000160', 2, 'Active', TRUE),
('CUS161', '0900000161', '0900000161', 2, 'Active', TRUE),
('CUS162', '0900000162', '0900000162', 2, 'Active', TRUE),
('CUS163', '0900000163', '0900000163', 2, 'Active', TRUE),
('CUS164', '0900000164', '0900000164', 2, 'Active', TRUE),
('CUS165', '0900000165', '0900000165', 2, 'Active', TRUE),
('CUS166', '0900000166', '0900000166', 2, 'Active', TRUE),
('CUS167', '0900000167', '0900000167', 2, 'Active', TRUE),
('CUS168', '0900000168', '0900000168', 2, 'Active', TRUE),
('CUS169', '0900000169', '0900000169', 2, 'Active', TRUE),
('CUS170', '0900000170', '0900000170', 2, 'Active', TRUE),
('CUS171', '0900000171', '0900000171', 2, 'Active', TRUE),
('CUS172', '0900000172', '0900000172', 2, 'Active', TRUE),
('CUS173', '0900000173', '0900000173', 2, 'Active', TRUE),
('CUS174', '0900000174', '0900000174', 2, 'Active', TRUE),
('CUS175', '0900000175', '0900000175', 2, 'Active', TRUE),
('CUS176', '0900000176', '0900000176', 2, 'Active', TRUE),
('CUS177', '0900000177', '0900000177', 2, 'Active', TRUE),
('CUS178', '0900000178', '0900000178', 2, 'Active', TRUE),
('CUS179', '0900000179', '0900000179', 2, 'Active', TRUE),
('CUS180', '0900000180', '0900000180', 2, 'Active', TRUE),
('CUS181', '0900000181', '0900000181', 2, 'Active', TRUE),
('CUS182', '0900000182', '0900000182', 2, 'Active', TRUE),
('CUS183', '0900000183', '0900000183', 2, 'Active', TRUE),
('CUS184', '0900000184', '0900000184', 2, 'Active', TRUE),
('CUS185', '0900000185', '0900000185', 2, 'Active', TRUE),
('CUS186', '0900000186', '0900000186', 2, 'Active', TRUE),
('CUS187', '0900000187', '0900000187', 2, 'Active', TRUE),
('CUS188', '0900000188', '0900000188', 2, 'Active', TRUE),
('CUS189', '0900000189', '0900000189', 2, 'Active', TRUE),
('CUS190', '0900000190', '0900000190', 2, 'Active', TRUE),
('CUS191', '0900000191', '0900000191', 2, 'Active', TRUE),
('CUS192', '0900000192', '0900000192', 2, 'Active', TRUE),
('CUS193', '0900000193', '0900000193', 2, 'Active', TRUE),
('CUS194', '0900000194', '0900000194', 2, 'Active', TRUE),

('CUS195', '0900000195', '0900000195', 2, 'Active', FALSE),
('CUS196', '0900000196', '0900000196', 2, 'Active', FALSE),
('CUS197', '0900000197', '0900000197', 2, 'Active', FALSE),
('CUS198', '0900000198', '0900000198', 2, 'Active', FALSE),
('CUS199', '0900000199', '0900000199', 2, 'Active', FALSE),
('CUS200', '0900000200', '0900000200', 2, 'Active', FALSE);

-- Warehouse
INSERT IGNORE INTO `users` (`user_id`, `username`, `password_hash`, `role_id`, `status`, `must_change_password`) VALUES
('WH01', 'WH01', 'WH01', 3, 'Active', FALSE),
('WH02', 'WH02', 'WH02', 3, 'Active', FALSE),
('WH03', 'WH03', 'WH03', 3, 'Active', FALSE);

-- Sales
INSERT IGNORE INTO `users` (`user_id`, `username`, `password_hash`, `role_id`, `status`, `must_change_password`) VALUES
('SALE1', 'SALE1', 'SALE1', 4, 'Active', FALSE),
('SALE2', 'SALE2', 'SALE2', 4, 'Active', FALSE),
('SALE3', 'SALE3', 'SALE3', 4, 'Active', FALSE);

-- Online Sales
INSERT IGNORE INTO `users` (`user_id`, `username`, `password_hash`, `role_id`, `status`, `must_change_password`) VALUES
('OS01', 'OS01', 'OS01', 5, 'Active', FALSE),
('OS02', 'OS02', 'OS02', 5, 'Active', FALSE),
('OS03', 'OS03', 'OS03', 5, 'Active', FALSE);

-- Shipper
INSERT IGNORE INTO `users` (`user_id`, `username`, `password_hash`, `role_id`, `status`, `must_change_password`) VALUES
('SHIP01', 'SHIP01', 'SHIP01', 6, 'Active', FALSE),
('SHIP02', 'SHIP02', 'SHIP02', 6, 'Active', FALSE),
('SHIP03', 'SHIP03', 'SHIP03', 6, 'Active', FALSE);

INSERT IGNORE INTO `employees`
(employee_id, user_id, full_name, email, phone, date_of_birth, address, start_date, employee_type, department, base_salary, commission_rate)
VALUES
-- Warehouse
('WH01', 'WH01', 'Phạm Văn Hùng',   'wh01@store.com', '0901000001', '1990-01-01', 'Hà Nội', '2024-08-01', 'Full-time', 'Warehouse', 8000000, 0.0000),
('WH02', 'WH02', 'Đỗ Thị Lan',      'wh02@store.com', '0901000002', '1991-02-02', 'Hà Nội', '2024-08-01', 'Full-time', 'Warehouse', 8000000, 0.0000),
('WH03', 'WH03', 'Nguyễn Văn Tuấn','wh03@store.com', '0901000003', '1992-03-03', 'Hà Nội', '2024-08-01', 'Full-time', 'Warehouse', 8000000, 0.0000),

-- Sales
('SALE1', 'SALE1', 'Lê Thị Ngọc Anh', 'sa01@store.com', '0902000001', '1990-04-01', 'Hà Nội', '2024-08-01', 'Full-time', 'Sales', 7000000, 0.0500),
('SALE2', 'SALE2', 'Trần Văn Minh',   'sa02@store.com', '0902000002', '1991-05-02', 'Hà Nội', '2024-08-01', 'Full-time', 'Sales', 7000000, 0.0500),
('SALE3', 'SALE3', 'Phạm Thị Hương',  'sa03@store.com', '0902000003', '1992-06-03', 'Hà Nội', '2024-08-01', 'Full-time', 'Sales', 7000000, 0.0500),


-- Online Sales
('OS01', 'OS01', 'Nguyễn Văn Dũng', 'os01@store.com', '0903000001', '1990-07-01', 'Hà Nội', '2024-08-01', 'Full-time', 'Online Sales', 7000000, 0.0500),
('OS02', 'OS02', 'Lê Thị Thu Trang','os02@store.com', '0903000002', '1991-08-02', 'Hà Nội', '2024-08-01', 'Full-time', 'Online Sales', 7000000, 0.0500),
('OS03', 'OS03', 'Trần Văn Khánh',  'os03@store.com', '0903000003', '1992-09-03', 'Hà Nội', '2024-08-01', 'Full-time', 'Online Sales', 7000000, 0.0500),


-- Shipper
('SHIP01', 'SHIP01', 'Nguyễn Văn Hoàng', 'ship01@store.com', '0904000001', '1990-10-01', 'Hà Nội', '2024-08-01', 'Full-time', 'Shipper', 6000000, 0.0000),
('SHIP02', 'SHIP02', 'Lê Thị Kim Oanh',  'ship02@store.com', '0904000002', '1991-11-02', 'Hà Nội', '2024-08-01', 'Full-time', 'Shipper', 6000000, 0.0000),
('SHIP03', 'SHIP03', 'Trần Văn Phúc',    'ship03@store.com', '0904000003', '1992-12-03', 'Hà Nội', '2024-08-01', 'Full-time', 'Shipper', 6000000, 0.0000);

INSERT INTO `salaries` 
(salary_id, employee_id, month_year, base_salary, sales_commission, bonus, deductions, paid_at, paid_status)
VALUES
('SAL-WH01-202411','WH01','2024-11-01',8000000,0,500000,0,'2024-11-30','Paid'),
('SAL-WH02-202411','WH02','2024-11-01',8000000,0,300000,0,NULL,'Unpaid'),
('SAL-WH03-202411','WH03','2024-11-01',8000000,0,0,0,NULL,'Unpaid'),

('SAL-SALE1-202411','SALE1','2024-11-01',7000000,350000,200000,0,'2024-11-30','Paid'),
('SAL-SALE2-202411','SALE2','2024-11-01',7000000,400000,150000,0,NULL,'Unpaid'),
('SAL-SALE3-202411','SALE3','2024-11-01',7000000,300000,100000,0,NULL,'Unpaid'),

('SAL-OS01-202411','OS01','2024-11-01',7000000,300000,200000,0,'2024-11-30','Paid'),
('SAL-OS02-202411','OS02','2024-11-01',7000000,250000,150000,0,NULL,'Unpaid'),
('SAL-OS03-202411','OS03','2024-11-01',7000000,200000,100000,0,NULL,'Unpaid'),

('SAL-SHIP01-202411','SHIP01','2024-11-01',6000000,0,0,0,'2024-11-30','Paid'),
('SAL-SHIP02-202411','SHIP02','2024-11-01',6000000,0,50000,0,NULL,'Unpaid'),
('SAL-SHIP03-202411','SHIP03','2024-11-01',6000000,0,0,0,NULL,'Unpaid');
INSERT INTO `salaries` 
(salary_id, employee_id, month_year, base_salary, sales_commission, bonus, deductions, paid_at, paid_status)
VALUES
-- Warehouse
('SAL-WH01-202412','WH01','2024-12-01',8000000,0,600000,0,'2024-12-30','Paid'),
('SAL-WH02-202412','WH02','2024-12-01',8000000,0,400000,0,NULL,'Unpaid'),
('SAL-WH03-202412','WH03','2024-12-01',8000000,0,0,0,NULL,'Unpaid'),

-- Sales
('SAL-SALE1-202412','SALE1','2024-12-01',7000000,360000,250000,0,'2024-12-30','Paid'),
('SAL-SALE2-202412','SALE2','2024-12-01',7000000,420000,200000,0,NULL,'Unpaid'),
('SAL-SALE3-202412','SALE3','2024-12-01',7000000,310000,150000,0,NULL,'Unpaid'),

-- Online Sales
('SAL-OS01-202412','OS01','2024-12-01',7000000,320000,250000,0,'2024-12-30','Paid'),
('SAL-OS02-202412','OS02','2024-12-01',7000000,270000,200000,0,NULL,'Unpaid'),
('SAL-OS03-202412','OS03','2024-12-01',7000000,220000,150000,0,NULL,'Unpaid'),

-- Shipper
('SAL-SHIP01-202412','SHIP01','2024-12-01',6000000,0,0,0,'2024-12-30','Paid'),
('SAL-SHIP02-202412','SHIP02','2024-12-01',6000000,0,60000,0,NULL,'Unpaid'),
('SAL-SHIP03-202412','SHIP03','2024-12-01',6000000,0,0,0,NULL,'Unpaid');
-- DỮ LIỆU LƯƠNG NĂM 2025

-- Tháng 01
INSERT INTO `salaries` (salary_id, employee_id, month_year, base_salary, sales_commission, bonus, deductions, paid_at, paid_status)
VALUES
('SAL-WH01-202501','WH01','2025-01-01',8000000,0,500000,0,'2025-01-31','Paid'),
('SAL-WH02-202501','WH02','2025-01-01',8000000,0,300000,0,NULL,'Unpaid'),
('SAL-WH03-202501','WH03','2025-01-01',8000000,0,0,0,NULL,'Unpaid'),
('SAL-SALE1-202501','SALE1','2025-01-01',7000000,350000,200000,0,'2025-01-31','Paid'),
('SAL-SALE2-202501','SALE2','2025-01-01',7000000,400000,150000,0,NULL,'Unpaid'),
('SAL-SALE3-202501','SALE3','2025-01-01',7000000,300000,100000,0,NULL,'Unpaid'),
('SAL-OS01-202501','OS01','2025-01-01',7000000,300000,200000,0,'2025-01-31','Paid'),
('SAL-OS02-202501','OS02','2025-01-01',7000000,250000,150000,0,NULL,'Unpaid'),
('SAL-OS03-202501','OS03','2025-01-01',7000000,200000,100000,0,NULL,'Unpaid'),
('SAL-SHIP01-202501','SHIP01','2025-01-01',6000000,0,0,0,'2025-01-31','Paid'),
('SAL-SHIP02-202501','SHIP02','2025-01-01',6000000,0,50000,0,NULL,'Unpaid'),
('SAL-SHIP03-202501','SHIP03','2025-01-01',6000000,0,0,0,NULL,'Unpaid');

-- Tháng 02
INSERT INTO `salaries` (salary_id, employee_id, month_year, base_salary, sales_commission, bonus, deductions, paid_at, paid_status)
VALUES
('SAL-WH01-202502','WH01','2025-02-01',8000000,0,500000,0,'2025-02-28','Paid'),
('SAL-WH02-202502','WH02','2025-02-01',8000000,0,300000,0,NULL,'Unpaid'),
('SAL-WH03-202502','WH03','2025-02-01',8000000,0,0,0,NULL,'Unpaid'),
('SAL-SALE1-202502','SALE1','2025-02-01',7000000,350000,200000,0,'2025-02-28','Paid'),
('SAL-SALE2-202502','SALE2','2025-02-01',7000000,400000,150000,0,NULL,'Unpaid'),
('SAL-SALE3-202502','SALE3','2025-02-01',7000000,300000,100000,0,NULL,'Unpaid'),
('SAL-OS01-202502','OS01','2025-02-01',7000000,300000,200000,0,'2025-02-28','Paid'),
('SAL-OS02-202502','OS02','2025-02-01',7000000,250000,150000,0,NULL,'Unpaid'),
('SAL-OS03-202502','OS03','2025-02-01',7000000,200000,100000,0,NULL,'Unpaid'),
('SAL-SHIP01-202502','SHIP01','2025-02-01',6000000,0,0,0,'2025-02-28','Paid'),
('SAL-SHIP02-202502','SHIP02','2025-02-01',6000000,0,50000,0,NULL,'Unpaid'),
('SAL-SHIP03-202502','SHIP03','2025-02-01',6000000,0,0,0,NULL,'Unpaid');

-- Tháng 03
INSERT INTO `salaries` (salary_id, employee_id, month_year, base_salary, sales_commission, bonus, deductions, paid_at, paid_status)
VALUES
('SAL-WH01-202503','WH01','2025-03-01',8000000,0,500000,0,'2025-03-31','Paid'),
('SAL-WH02-202503','WH02','2025-03-01',8000000,0,300000,0,NULL,'Unpaid'),
('SAL-WH03-202503','WH03','2025-03-01',8000000,0,0,0,NULL,'Unpaid'),
('SAL-SALE1-202503','SALE1','2025-03-01',7000000,350000,200000,0,'2025-03-31','Paid'),
('SAL-SALE2-202503','SALE2','2025-03-01',7000000,400000,150000,0,NULL,'Unpaid'),
('SAL-SALE3-202503','SALE3','2025-03-01',7000000,300000,100000,0,NULL,'Unpaid'),
('SAL-OS01-202503','OS01','2025-03-01',7000000,300000,200000,0,'2025-03-31','Paid'),
('SAL-OS02-202503','OS02','2025-03-01',7000000,250000,150000,0,NULL,'Unpaid'),
('SAL-OS03-202503','OS03','2025-03-01',7000000,200000,100000,0,NULL,'Unpaid'),
('SAL-SHIP01-202503','SHIP01','2025-03-01',6000000,0,0,0,'2025-03-31','Paid'),
('SAL-SHIP02-202503','SHIP02','2025-03-01',6000000,0,50000,0,NULL,'Unpaid'),
('SAL-SHIP03-202503','SHIP03','2025-03-01',6000000,0,0,0,NULL,'Unpaid');

-- Tháng 04
INSERT INTO `salaries` (salary_id, employee_id, month_year, base_salary, sales_commission, bonus, deductions, paid_at, paid_status)
VALUES
('SAL-WH01-202504','WH01','2025-04-01',8000000,0,500000,0,'2025-04-30','Paid'),
('SAL-WH02-202504','WH02','2025-04-01',8000000,0,300000,0,NULL,'Unpaid'),
('SAL-WH03-202504','WH03','2025-04-01',8000000,0,0,0,NULL,'Unpaid'),
('SAL-SALE1-202504','SALE1','2025-04-01',7000000,350000,200000,0,'2025-04-30','Paid'),
('SAL-SALE2-202504','SALE2','2025-04-01',7000000,400000,150000,0,NULL,'Unpaid'),
('SAL-SALE3-202504','SALE3','2025-04-01',7000000,300000,100000,0,NULL,'Unpaid'),
('SAL-OS01-202504','OS01','2025-04-01',7000000,300000,200000,0,'2025-04-30','Paid'),
('SAL-OS02-202504','OS02','2025-04-01',7000000,250000,150000,0,NULL,'Unpaid'),
('SAL-OS03-202504','OS03','2025-04-01',7000000,200000,100000,0,NULL,'Unpaid'),
('SAL-SHIP01-202504','SHIP01','2025-04-01',6000000,0,0,0,'2025-04-30','Paid'),
('SAL-SHIP02-202504','SHIP02','2025-04-01',6000000,0,50000,0,NULL,'Unpaid'),
('SAL-SHIP03-202504','SHIP03','2025-04-01',6000000,0,0,0,NULL,'Unpaid');
-- Tháng 05/2025
INSERT INTO `salaries` (salary_id, employee_id, month_year, base_salary, sales_commission, bonus, deductions, paid_at, paid_status)
VALUES
('SAL-WH01-202505','WH01','2025-05-01',8000000,0,500000,0,'2025-05-31','Paid'),
('SAL-WH02-202505','WH02','2025-05-01',8000000,0,300000,0,NULL,'Unpaid'),
('SAL-WH03-202505','WH03','2025-05-01',8000000,0,0,0,NULL,'Unpaid'),
('SAL-SALE1-202505','SALE1','2025-05-01',7000000,350000,200000,0,'2025-05-31','Paid'),
('SAL-SALE2-202505','SALE2','2025-05-01',7000000,400000,150000,0,NULL,'Unpaid'),
('SAL-SALE3-202505','SALE3','2025-05-01',7000000,300000,100000,0,NULL,'Unpaid'),
('SAL-OS01-202505','OS01','2025-05-01',7000000,300000,200000,0,'2025-05-31','Paid'),
('SAL-OS02-202505','OS02','2025-05-01',7000000,250000,150000,0,NULL,'Unpaid'),
('SAL-OS03-202505','OS03','2025-05-01',7000000,200000,100000,0,NULL,'Unpaid'),
('SAL-SHIP01-202505','SHIP01','2025-05-01',6000000,0,0,0,'2025-05-31','Paid'),
('SAL-SHIP02-202505','SHIP02','2025-05-01',6000000,0,50000,0,NULL,'Unpaid'),
('SAL-SHIP03-202505','SHIP03','2025-05-01',6000000,0,0,0,NULL,'Unpaid');

-- Tháng 06/2025
INSERT INTO `salaries` (salary_id, employee_id, month_year, base_salary, sales_commission, bonus, deductions, paid_at, paid_status)
VALUES
('SAL-WH01-202506','WH01','2025-06-01',8000000,0,500000,0,'2025-06-30','Paid'),
('SAL-WH02-202506','WH02','2025-06-01',8000000,0,300000,0,NULL,'Unpaid'),
('SAL-WH03-202506','WH03','2025-06-01',8000000,0,0,0,NULL,'Unpaid'),
('SAL-SALE1-202506','SALE1','2025-06-01',7000000,350000,200000,0,'2025-06-30','Paid'),
('SAL-SALE2-202506','SALE2','2025-06-01',7000000,400000,150000,0,NULL,'Unpaid'),
('SAL-SALE3-202506','SALE3','2025-06-01',7000000,300000,100000,0,NULL,'Unpaid'),
('SAL-OS01-202506','OS01','2025-06-01',7000000,300000,200000,0,'2025-06-30','Paid'),
('SAL-OS02-202506','OS02','2025-06-01',7000000,250000,150000,0,NULL,'Unpaid'),
('SAL-OS03-202506','OS03','2025-06-01',7000000,200000,100000,0,NULL,'Unpaid'),
('SAL-SHIP01-202506','SHIP01','2025-06-01',6000000,0,0,0,'2025-06-30','Paid'),
('SAL-SHIP02-202506','SHIP02','2025-06-01',6000000,0,50000,0,NULL,'Unpaid'),
('SAL-SHIP03-202506','SHIP03','2025-06-01',6000000,0,0,0,NULL,'Unpaid');

-- Tháng 07/2025
INSERT INTO `salaries` (salary_id, employee_id, month_year, base_salary, sales_commission, bonus, deductions, paid_at, paid_status)
VALUES
('SAL-WH01-202507','WH01','2025-07-01',8000000,0,500000,0,'2025-07-31','Paid'),
('SAL-WH02-202507','WH02','2025-07-01',8000000,0,300000,0,NULL,'Unpaid'),
('SAL-WH03-202507','WH03','2025-07-01',8000000,0,0,0,NULL,'Unpaid'),
('SAL-SALE1-202507','SALE1','2025-07-01',7000000,350000,200000,0,'2025-07-31','Paid'),
('SAL-SALE2-202507','SALE2','2025-07-01',7000000,400000,150000,0,NULL,'Unpaid'),
('SAL-SALE3-202507','SALE3','2025-07-01',7000000,300000,100000,0,NULL,'Unpaid'),
('SAL-OS01-202507','OS01','2025-07-01',7000000,300000,200000,0,'2025-07-31','Paid'),
('SAL-OS02-202507','OS02','2025-07-01',7000000,250000,150000,0,NULL,'Unpaid'),
('SAL-OS03-202507','OS03','2025-07-01',7000000,200000,100000,0,NULL,'Unpaid'),
('SAL-SHIP01-202507','SHIP01','2025-07-01',6000000,0,0,0,'2025-07-31','Paid'),
('SAL-SHIP02-202507','SHIP02','2025-07-01',6000000,0,50000,0,NULL,'Unpaid'),
('SAL-SHIP03-202507','SHIP03','2025-07-01',6000000,0,0,0,NULL,'Unpaid');

-- Tháng 08/2025
INSERT INTO `salaries` (salary_id, employee_id, month_year, base_salary, sales_commission, bonus, deductions, paid_at, paid_status)
VALUES
('SAL-WH01-202508','WH01','2025-08-01',8000000,0,500000,0,'2025-08-31','Paid'),
('SAL-WH02-202508','WH02','2025-08-01',8000000,0,300000,0,NULL,'Unpaid'),
('SAL-WH03-202508','WH03','2025-08-01',8000000,0,0,0,NULL,'Unpaid'),
('SAL-SALE1-202508','SALE1','2025-08-01',7000000,350000,200000,0,'2025-08-31','Paid'),
('SAL-SALE2-202508','SALE2','2025-08-01',7000000,400000,150000,0,NULL,'Unpaid'),
('SAL-SALE3-202508','SALE3','2025-08-01',7000000,300000,100000,0,NULL,'Unpaid'),
('SAL-OS01-202508','OS01','2025-08-01',7000000,300000,200000,0,'2025-08-31','Paid'),
('SAL-OS02-202508','OS02','2025-08-01',7000000,250000,150000,0,NULL,'Unpaid'),
('SAL-OS03-202508','OS03','2025-08-01',7000000,200000,100000,0,NULL,'Unpaid'),
('SAL-SHIP01-202508','SHIP01','2025-08-01',6000000,0,0,0,'2025-08-31','Paid'),
('SAL-SHIP02-202508','SHIP02','2025-08-01',6000000,0,50000,0,NULL,'Unpaid'),
('SAL-SHIP03-202508','SHIP03','2025-08-01',6000000,0,0,0,NULL,'Unpaid');

-- Tháng 09/2025
INSERT INTO `salaries` (salary_id, employee_id, month_year, base_salary, sales_commission, bonus, deductions, paid_at, paid_status)
VALUES
('SAL-WH01-202509','WH01','2025-09-01',8000000,0,500000,0,'2025-09-30','Paid'),
('SAL-WH02-202509','WH02','2025-09-01',8000000,0,300000,0,NULL,'Unpaid'),
('SAL-WH03-202509','WH03','2025-09-01',8000000,0,0,0,NULL,'Unpaid'),
('SAL-SALE1-202509','SALE1','2025-09-01',7000000,350000,200000,0,'2025-09-30','Paid'),
('SAL-SALE2-202509','SALE2','2025-09-01',7000000,400000,150000,0,NULL,'Unpaid'),
('SAL-SALE3-202509','SALE3','2025-09-01',7000000,300000,100000,0,NULL,'Unpaid'),
('SAL-OS01-202509','OS01','2025-09-01',7000000,300000,200000,0,'2025-09-30','Paid'),
('SAL-OS02-202509','OS02','2025-09-01',7000000,250000,150000,0,NULL,'Unpaid'),
('SAL-OS03-202509','OS03','2025-09-01',7000000,200000,100000,0,NULL,'Unpaid'),
('SAL-SHIP01-202509','SHIP01','2025-09-01',6000000,0,0,0,'2025-09-30','Paid'),
('SAL-SHIP02-202509','SHIP02','2025-09-01',6000000,0,50000,0,NULL,'Unpaid'),
('SAL-SHIP03-202509','SHIP03','2025-09-01',6000000,0,0,0,NULL,'Unpaid');

-- Tháng 10/2025
INSERT INTO `salaries` (salary_id, employee_id, month_year, base_salary, sales_commission, bonus, deductions, paid_at, paid_status)
VALUES
('SAL-WH01-202510','WH01','2025-10-01',8000000,0,500000,0,'2025-10-31','Paid'),
('SAL-WH02-202510','WH02','2025-10-01',8000000,0,300000,0,NULL,'Unpaid'),
('SAL-WH03-202510','WH03','2025-10-01',8000000,0,0,0,NULL,'Unpaid'),
('SAL-SALE1-202510','SALE1','2025-10-01',7000000,350000,200000,0,'2025-10-31','Paid'),
('SAL-SALE2-202510','SALE2','2025-10-01',7000000,400000,150000,0,NULL,'Unpaid'),
('SAL-SALE3-202510','SALE3','2025-10-01',7000000,300000,100000,0,NULL,'Unpaid'),
('SAL-OS01-202510','OS01','2025-10-01',7000000,300000,200000,0,'2025-10-31','Paid'),
('SAL-OS02-202510','OS02','2025-10-01',7000000,250000,150000,0,NULL,'Unpaid'),
('SAL-OS03-202510','OS03','2025-10-01',7000000,200000,100000,0,NULL,'Unpaid'),
('SAL-SHIP01-202510','SHIP01','2025-10-01',6000000,0,0,0,'2025-10-31','Paid'),
('SAL-SHIP02-202510','SHIP02','2025-10-01',6000000,0,50000,0,NULL,'Unpaid'),
('SAL-SHIP03-202510','SHIP03','2025-10-01',6000000,0,0,0,NULL,'Unpaid');
-- Tháng 11 (tất cả Unpaid)
INSERT INTO `salaries` (salary_id, employee_id, month_year, base_salary, sales_commission, bonus, deductions, paid_at, paid_status)
VALUES
('SAL-WH01-202511','WH01','2025-11-01',8000000,0,500000,0,NULL,'Unpaid'),
('SAL-WH02-202511','WH02','2025-11-01',8000000,0,300000,0,NULL,'Unpaid'),
('SAL-WH03-202511','WH03','2025-11-01',8000000,0,0,0,NULL,'Unpaid'),
('SAL-SALE1-202511','SALE1','2025-11-01',7000000,350000,200000,0,NULL,'Unpaid'),
('SAL-SALE2-202511','SALE2','2025-11-01',7000000,400000,150000,0,NULL,'Unpaid'),
('SAL-SALE3-202511','SALE3','2025-11-01',7000000,300000,100000,0,NULL,'Unpaid'),
('SAL-OS01-202511','OS01','2025-11-01',7000000,300000,200000,0,NULL,'Unpaid'),
('SAL-OS02-202511','OS02','2025-11-01',7000000,250000,150000,0,NULL,'Unpaid'),
('SAL-OS03-202511','OS03','2025-11-01',7000000,200000,100000,0,NULL,'Unpaid'),
('SAL-SHIP01-202511','SHIP01','2025-11-01',6000000,0,0,0,NULL,'Unpaid'),
('SAL-SHIP02-202511','SHIP02','2025-11-01',6000000,0,50000,0,NULL,'Unpaid'),
('SAL-SHIP03-202511','SHIP03','2025-11-01',6000000,0,0,0,NULL,'Unpaid');
-- Categories
INSERT IGNORE INTO `categories` (`category_name`,`description`) VALUES
('Thời trang nữ', 'Các sản phẩm quần áo dành cho nữ'),
('Thời trang nam', 'Các sản phẩm quần áo dành cho nam'),
('Thời trang trẻ em', 'Quần áo và phụ kiện dành cho trẻ em'),
('Giày dép', 'Giày, dép, sandal cho nam và nữ'),
('Phụ kiện thời trang', 'Túi xách, ví, thắt lưng, mũ, kính'),
('Mỹ phẩm trang điểm', 'Sản phẩm makeup dành cho mặt, mắt, môi'),
('Chăm sóc da', 'Các sản phẩm skincare như serum, toner, kem dưỡng'),
('Chăm sóc tóc – cơ thể', 'Dầu gội, dầu xả, sữa tắm, lotion'),
('Nước hoa', 'Nước hoa nam, nữ, unisex'),
('Đồ lót', 'Đồ lót nam nữ và đồ ngủ'),
('Trang sức', 'Phụ kiện trang sức: vòng, nhẫn, bông tai'),
('Túi xách – Balo', 'Các loại túi xách và balo thời trang'),
('Set quà tặng', 'Hộp quà mỹ phẩm, combo sản phẩm'),
('Phụ kiện điện thoại', 'Ốp lưng, kính cường lực (nếu cửa hàng có bán)'),
('Đồ thể thao', 'Quần áo và phụ kiện thể thao'),
('Đồ ngủ – Pijama', 'Bộ đồ ngủ cho nam, nữ'),
('Sandal – Dép', 'Các loại dép và sandal thời trang'),
('Sneaker – Giày thời trang', 'Giày sneaker và giày casual cho mọi giới');


SET FOREIGN_KEY_CHECKS = 1;
-- Tắt kiểm tra khóa ngoại
-- Tắt kiểm tra khóa ngoại
SET FOREIGN_KEY_CHECKS = 0;


-- 1. Chèn dữ liệu bảng STOCK_IN (Phiếu nhập kho)
INSERT INTO stock_in (stock_in_id, supplier_name, import_date, total_cost, user_id)
VALUES
-- 08/2024
('SI0001','Công ty A','2024-08-01 09:00:00',1200000,'WH01'),
('SI0002','Công ty B','2024-08-10 10:00:00',950000,'WH02'),
('SI0003','Công ty  C','2024-08-20 08:30:00',1500000,'WH03'),
-- 09/2024
('SI0004','Công ty  D','2024-09-01 09:00:00',800000,'WH01'),
('SI0005','Công ty  E','2024-09-10 10:00:00',1100000,'WH02'),
('SI0006','Công ty  F','2024-09-20 08:30:00',1000000,'WH03'),
-- 10/2024
('SI0007','Công ty  G','2024-10-01 09:00:00',950000,'WH01'),
('SI0008','Công ty  H','2024-10-10 10:00:00',1200000,'WH02'),
('SI0009','Công ty I','2024-10-20 08:30:00',800000,'WH03'),
-- 11/2024
('SI0010','Công ty  J','2024-11-01 09:00:00',1800000,'WH01'),
('SI0011','Công ty  A','2024-11-10 10:00:00',1200000,'WH02'),
('SI0012','Công ty  B','2024-11-20 08:30:00',950000,'WH03'),
-- 12/2024
('SI0013','Công ty  C','2024-12-01 09:00:00',1500000,'WH01'),
('SI0014','Công ty  D','2024-12-10 10:00:00',800000,'WH02'),
('SI0015','Công ty Sữa E','2024-12-20 08:30:00',1100000,'WH03'),
-- 01/2025
('SI0016','Công ty  F','2025-01-01 09:00:00',1000000,'WH01'),
('SI0017','Công ty G','2025-01-10 10:00:00',950000,'WH02'),
('SI0018','Công ty  H','2025-01-20 08:30:00',1200000,'WH03'),
-- 02/2025
('SI0019','Công ty I','2025-02-01 09:00:00',800000,'WH01'),
('SI0020','Công ty  J','2025-02-10 10:00:00',1800000,'WH02'),
('SI0021','Công ty  A','2025-02-20 08:30:00',1200000,'WH03'),
-- 03/2025
('SI0022','Công ty  B','2025-03-01 09:00:00',950000,'WH01'),
('SI0023','Công ty  C','2025-03-10 10:00:00',1500000,'WH02'),
('SI0024','Công ty  D','2025-03-20 08:30:00',800000,'WH03'),
-- 04/2025
('SI0025','Công ty  E','2025-04-01 09:00:00',1100000,'WH01'),
('SI0026','Công ty  F','2025-04-10 10:00:00',1000000,'WH02'),
('SI0027','Công ty  G','2025-04-20 08:30:00',950000,'WH03'),
-- 05/2025
('SI0028','Công ty  H','2025-05-01 09:00:00',1200000,'WH01'),
('SI0029','Công ty I','2025-05-10 10:00:00',800000,'WH02'),
('SI0030','Công ty  J','2025-05-20 08:30:00',1800000,'WH03'),
-- 06/2025
('SI0031','Công ty  A','2025-06-01 09:00:00',1200000,'WH01'),
('SI0032','Công ty  B','2025-06-10 10:00:00',950000,'WH02'),
('SI0033','Công ty  C','2025-06-20 08:30:00',1500000,'WH03'),
-- 07/2025
('SI0034','Công ty  D','2025-07-01 09:00:00',800000,'WH01'),
('SI0035','Công ty  E','2025-07-10 10:00:00',1100000,'WH02'),
('SI0036','Công ty  F','2025-07-20 08:30:00',1000000,'WH03'),
-- 08/2025
('SI0037','Công ty  G','2025-08-01 09:00:00',950000,'WH01'),
('SI0038','Công ty  H','2025-08-10 10:00:00',1200000,'WH02'),
('SI0039','Công ty I','2025-08-20 08:30:00',800000,'WH03'),
-- 09/2025
('SI0040','Công ty  J','2025-09-01 09:00:00',1800000,'WH01'),
('SI0041','Công ty  A','2025-09-10 10:00:00',1200000,'WH02'),
('SI0042','Công ty Rau củ B','2025-09-20 08:30:00',950000,'WH03'),
-- 10/2025
('SI0043','Công ty  C','2025-10-01 09:00:00',1500000,'WH01'),
('SI0044','Công ty  D','2025-10-10 10:00:00',800000,'WH02'),
('SI0045','Công ty E','2025-10-20 08:30:00',1100000,'WH03'),
-- 11/2025
('SI0046','Công ty  F','2025-11-01 09:00:00',1000000,'WH01'),
('SI0047','Công ty G','2025-11-10 10:00:00',950000,'WH02'),
('SI0048','Công ty  H','2025-11-20 08:30:00',1200000,'WH03')
;
-- 2. Chèn dữ liệu bảng STOCK_IN_DETAILS (Chi tiết nhập kho)
-- Mỗi phiếu nhập 5 sản phẩm, bạn có thể thay product_id phù hợp với bảng products
-- ============================
-- BẢNG STOCK_IN_DETAILS (FULL 144 DÒNG)
-- ============================

INSERT INTO stock_in_details (stock_in_id, product_id, quantity, cost_price)
VALUES
-- SI0001
('SI0001','P0001',10,90000),
('SI0001','P0002',15,70000),
('SI0001','P0003',8,120000),
-- SI0002
('SI0002','P0004',12,140000),
('SI0002','P0005',30,2500),
('SI0002','P0006',5,90000),
-- SI0003
('SI0003','P0007',8,75000),
('SI0003','P0008',12,18000),
('SI0003','P0009',10,60000),
-- SI0004
('SI0004','P0010',5,150000),
('SI0004','P0011',20,10000),
('SI0004','P0012',25,8000),
-- SI0005
('SI0005','P0013',15,7000),
('SI0005','P0014',18,12000),
('SI0005','P0015',10,15000),
-- SI0006
('SI0006','P0016',8,25000),
('SI0006','P0017',12,20000),
('SI0006','P0018',10,28000),
-- SI0007
('SI0007','P0019',20,9000),
('SI0007','P0020',15,12000),
('SI0007','P0021',10,7000),
-- SI0008
('SI0008','P0022',12,8000),
('SI0008','P0023',15,10000),
('SI0008','P0024',10,15000),
-- SI0009
('SI0009','P0025',5,40000),
('SI0009','P0026',8,22000),
('SI0009','P0027',12,18000),
-- SI0010
('SI0010','P0028',10,30000),
('SI0010','P0029',5,45000),
('SI0010','P0030',12,15000),
-- SI0011
('SI0011','P0031',10,10000),
('SI0011','P0032',12,3000),
('SI0011','P0033',15,7000),
-- SI0012
('SI0012','P0034',8,20000),
('SI0012','P0035',5,18000),
('SI0012','P0036',10,15000),
-- SI0013
('SI0013','P0037',12,15000),
('SI0013','P0038',10,8000),
('SI0013','P0039',20,7000),
-- SI0014
('SI0014','P0040',5,25000),
('SI0014','P0041',10,15000),
('SI0014','P0042',12,10000),
-- SI0015
('SI0015','P0043',8,40000),
('SI0015','P0044',5,18000),
('SI0015','P0045',12,15000),
-- SI0016
('SI0016','P0046',10,30000),
('SI0016','P0047',12,10000),
('SI0016','P0048',8,22000),
-- SI0017
('SI0017','P0049',5,25000),
('SI0017','P0050',10,30000),
('SI0017','P0051',12,10000),
-- SI0018
('SI0018','P0052',8,7000),
('SI0018','P0053',15,15000),
('SI0018','P0054',10,20000),
-- SI0019
('SI0019','P0055',12,12000),
('SI0019','P0056',8,15000),
('SI0019','P0057',10,10000),
-- SI0020
('SI0020','P0058',5,20000),
('SI0020','P0059',12,22000),
('SI0020','P0060',8,10000),
-- SI0021
('SI0021','P0061',10,15000),
('SI0021','P0062',12,8000),
('SI0021','P0063',8,10000),
-- SI0022
('SI0022','P0064',5,25000),
('SI0022','P0065',10,20000),
('SI0022','P0066',12,15000),
-- SI0023
('SI0023','P0067',8,7000),
('SI0023','P0068',10,10000),
('SI0023','P0069',12,12000),
-- SI0024
('SI0024','P0070',8,9000),
('SI0024','P0071',5,25000),
('SI0024','P0072',10,28000),
-- SI0025
('SI0025','P0073',12,15000),
('SI0025','P0074',8,20000),
('SI0025','P0075',10,10000),
-- SI0026
('SI0026','P0076',5,30000),
('SI0026','P0077',12,15000),
('SI0026','P0078',10,12000),
-- SI0027
('SI0027','P0079',8,22000),
('SI0027','P0080',5,30000),
('SI0027','P0081',12,35000),
-- SI0028
('SI0028','P0082',10,28000),
('SI0028','P0083',12,18000),
('SI0028','P0084',8,10000),
-- SI0029
('SI0029','P0085',5,150000),
('SI0029','P0086',10,22000),
('SI0029','P0087',12,30000),
-- SI0030
('SI0030','P0088',8,25000),
('SI0030','P0089',10,15000),
('SI0030','P0090',12,35000),
-- SI0031
('SI0031','P0091',10,7000),
('SI0031','P0092',12,9000),
('SI0031','P0093',8,20000),
-- SI0032
('SI0032','P0094',5,30000),
('SI0032','P0095',10,25000),
('SI0032','P0096',12,10000),
-- SI0033
('SI0033','P0097',8,5000),
('SI0033','P0098',10,9000),
('SI0033','P0099',12,7000),
-- SI0034
('SI0034','P0100',8,12000),
('SI0034','P0101',5,400000),
('SI0034','P0102',10,250000),
-- SI0035
('SI0035','P0103',12,120000),
('SI0035','P0104',8,15000),
('SI0035','P0105',10,10000),
-- SI0036
('SI0036','P0106',5,60000),
('SI0036','P0107',12,300000),
('SI0036','P0108',10,40000),
-- SI0037
('SI0037','P0109',8,60000),
('SI0037','P0110',5,1200000),
('SI0037','P0111',12,280000),
-- SI0038
('SI0038','P0112',10,120000),
('SI0038','P0113',12,40000),
('SI0038','P0114',8,25000),
-- SI0039
('SI0039','P0115',5,20000),
('SI0039','P0116',10,80000),
('SI0039','P0117',12,600000),
-- SI0040
('SI0040','P0118',8,400000),
('SI0040','P0119',10,200000),
('SI0040','P0120',12,300000),
-- SI0041
('SI0041','P0121',10,20000),
('SI0041','P0122',12,3000),
('SI0041','P0123',8,7000),
-- SI0042
('SI0042','P0124',5,12000),
('SI0042','P0125',10,3000),
('SI0042','P0126',12,5000),
-- SI0043
('SI0043','P0127',8,60000),
('SI0043','P0128',10,20000),
('SI0043','P0129',12,10000),
-- SI0044
('SI0044','P0130',8,3000),
('SI0044','P0131',5,150000),
('SI0044','P0132',10,280000),
-- SI0045
('SI0045','P0133',12,120000),
('SI0045','P0134',8,100000),
('SI0045','P0135',10,600000),
-- SI0046
('SI0046','P0136',5,300000),
('SI0046','P0137',12,400000),
('SI0046','P0138',10,60000),
-- SI0047
('SI0047','P0139',8,100000),
('SI0047','P0140',10,120000),
('SI0047','P0141',12,150000),
-- SI0048
('SI0048','P0142',10,120000),
('SI0048','P0143',12,200000),
('SI0048','P0144',8,250000);


-- Bật lại kiểm tra khóa ngoại
SET FOREIGN_KEY_CHECKS = 1;
SET FOREIGN_KEY_CHECKS = 0;

-- Chèn 180 sản phẩm, 10 sản phẩm mỗi danh mục
-- SQL Insert 180 products (10 sản phẩm x 18 danh mục) với image_url và brand, bỏ SKU
INSERT INTO products (product_id, name, category_id, price, cost_price, stock_quantity, is_active, image_url, brand, avg_rating, review_count)
VALUES
-- Danh mục 1: Thời trang nữ
('P0001','Áo thun nữ basic',1,120000,80000,40,TRUE,'https://placehold.co/600x600?text=P0001','BrandA',0,0),
('P0002','Áo sơ mi nữ công sở',1,180000,130000,35,TRUE,'https://placehold.co/600x600?text=P0002','BrandA',0,0),
('P0003','Đầm dự tiệc',1,320000,250000,20,TRUE,'https://placehold.co/600x600?text=P0003','BrandB',0,0),
('P0004','Váy xếp ly nữ',1,220000,160000,30,TRUE,'https://placehold.co/600x600?text=P0004','BrandB',0,0),
('P0005','Quần jean nữ lưng cao',1,260000,190000,25,TRUE,'https://placehold.co/600x600?text=P0005','BrandC',0,0),
('P0006','Quần short nữ',1,150000,100000,40,TRUE,'https://placehold.co/600x600?text=P0006','BrandC',0,0),
('P0007','Áo khoác nữ thời trang',1,350000,260000,20,TRUE,'https://placehold.co/600x600?text=P0007','BrandD',0,0),
('P0008','Bộ đồ thể thao nữ',1,280000,210000,25,TRUE,'https://placehold.co/600x600?text=P0008','BrandD',0,0),
('P0009','Đồ ngủ pijama nữ',1,170000,120000,35,TRUE,'https://placehold.co/600x600?text=P0009','BrandE',0,0),
('P0010','Áo len nữ mùa đông',1,240000,180000,30,TRUE,'https://placehold.co/600x600?text=P0010','BrandE',0,0),

-- Danh mục 2: Thời trang nam
('P0011','Áo thun nam basic',2,110000,75000,45,TRUE,'https://placehold.co/600x600?text=P0011','BrandF',0,0),
('P0012','Áo sơ mi nam caro',2,190000,140000,35,TRUE,'https://placehold.co/600x600?text=P0012','BrandF',0,0),
('P0013','Quần jean nam ống đứng',2,270000,200000,30,TRUE,'https://placehold.co/600x600?text=P0013','BrandG',0,0),
('P0014','Quần kaki nam',2,230000,170000,25,TRUE,'https://placehold.co/600x600?text=P0014','BrandG',0,0),
('P0015','Áo khoác nam bomber',2,360000,280000,20,TRUE,'https://placehold.co/600x600?text=P0015','BrandH',0,0),
('P0016','Quần short nam thể thao',2,160000,100000,40,TRUE,'https://placehold.co/600x600?text=P0016','BrandH',0,0),
('P0017','Áo polo nam',2,170000,120000,35,TRUE,'https://placehold.co/600x600?text=P0017','BrandI',0,0),
('P0018','Bộ đồ thể thao nam',2,300000,220000,20,TRUE,'https://placehold.co/600x600?text=P0018','BrandI',0,0),
('P0019','Áo sweater nam',2,240000,180000,25,TRUE,'https://placehold.co/600x600?text=P0019','BrandJ',0,0),
('P0020','Áo hoodie nam',2,280000,210000,20,TRUE,'https://placehold.co/600x600?text=P0020','BrandJ',0,0),

-- Danh mục 3: Thời trang trẻ em
('P0021','Áo thun bé trai',3,90000,60000,50,TRUE,'https://placehold.co/600x600?text=P0021','BrandK',0,0),
('P0022','Áo thun bé gái',3,90000,60000,50,TRUE,'https://placehold.co/600x600?text=P0022','BrandK',0,0),
('P0023','Đầm công chúa',3,150000,110000,30,TRUE,'https://placehold.co/600x600?text=P0023','BrandL',0,0),
('P0024','Quần short trẻ em',3,70000,45000,60,TRUE,'https://placehold.co/600x600?text=P0024','BrandL',0,0),
('P0025','Quần jean trẻ em',3,120000,80000,40,TRUE,'https://placehold.co/600x600?text=P0025','BrandM',0,0),
('P0026','Áo khoác trẻ em',3,180000,130000,25,TRUE,'https://placehold.co/600x600?text=P0026','BrandM',0,0),
('P0027','Đồ bộ trẻ em',3,140000,100000,35,TRUE,'https://placehold.co/600x600?text=P0027','BrandN',0,0),
('P0028','Pijama trẻ em',3,110000,80000,35,TRUE,'https://placehold.co/600x600?text=P0028','BrandN',0,0),
('P0029','Váy bé gái dễ thương',3,130000,90000,35,TRUE,'https://placehold.co/600x600?text=P0029','BrandO',0,0),
('P0030','Bộ thể thao trẻ em',3,150000,110000,30,TRUE,'https://placehold.co/600x600?text=P0030','BrandO',0,0),
-- Danh mục 4: Giày dép
('P0031','Sneaker nam',4,350000,250000,30,TRUE,'https://placehold.co/600x600?text=P0031','BrandP',0,0),
('P0032','Sneaker nữ',4,340000,240000,30,TRUE,'https://placehold.co/600x600?text=P0032','BrandP',0,0),
('P0033','Giày cao gót 7cm',4,280000,200000,25,TRUE,'https://placehold.co/600x600?text=P0033','BrandQ',0,0),
('P0034','Sandal nữ thời trang',4,160000,110000,40,TRUE,'https://placehold.co/600x600?text=P0034','BrandQ',0,0),
('P0035','Dép lông nữ',4,90000,60000,50,TRUE,'https://placehold.co/600x600?text=P0035','BrandR',0,0),
('P0036','Sandal nam',4,150000,100000,40,TRUE,'https://placehold.co/600x600?text=P0036','BrandR',0,0),
('P0037','Giày tây nam da bò',4,390000,290000,20,TRUE,'https://placehold.co/600x600?text=P0037','BrandS',0,0),
('P0038','Giày slip-on nữ',4,200000,150000,30,TRUE,'https://placehold.co/600x600?text=P0038','BrandS',0,0),
('P0039','Dép nam quai ngang',4,70000,45000,60,TRUE,'https://placehold.co/600x600?text=P0039','BrandT',0,0),
('P0040','Giày thể thao trẻ em',4,160000,110000,35,TRUE,'https://placehold.co/600x600?text=P0040','BrandT',0,0),

-- Danh mục 5: Mỹ phẩm
('P0041','Son môi đỏ',5,150000,100000,50,TRUE,'https://placehold.co/600x600?text=P0041','BrandU',0,0),
('P0042','Son môi hồng',5,150000,100000,50,TRUE,'https://placehold.co/600x600?text=P0042','BrandU',0,0),
('P0043','Kem nền dạng lỏng',5,220000,170000,35,TRUE,'https://placehold.co/600x600?text=P0043','BrandV',0,0),
('P0044','Phấn má hồng',5,180000,130000,40,TRUE,'https://placehold.co/600x600?text=P0044','BrandV',0,0),
('P0045','Kẻ mắt nước',5,120000,90000,45,TRUE,'https://placehold.co/600x600?text=P0045','BrandW',0,0),
('P0046','Mascara đen',5,150000,110000,40,TRUE,'https://placehold.co/600x600?text=P0046','BrandW',0,0),
('P0047','Phấn mắt 12 màu',5,200000,150000,30,TRUE,'https://placehold.co/600x600?text=P0047','BrandX',0,0),
('P0048','Tẩy trang dạng dầu',5,170000,120000,35,TRUE,'https://placehold.co/600x600?text=P0048','BrandX',0,0),
('P0049','Son dưỡng môi',5,90000,60000,50,TRUE,'https://placehold.co/600x600?text=P0049','BrandY',0,0),
('P0050','Nước hoa mini',5,250000,180000,25,TRUE,'https://placehold.co/600x600?text=P0050','BrandY',0,0),

-- Danh mục 6: Dụng cụ trang điểm
('P0051','Cọ trang điểm cơ bản',6,90000,60000,50,TRUE,'https://placehold.co/600x600?text=P0051','BrandZ',0,0),
('P0052','Bông mút trang điểm',6,50000,30000,60,TRUE,'https://placehold.co/600x600?text=P0052','BrandZ',0,0),
('P0053','Cọ mắt 5 cây',6,120000,90000,35,TRUE,'https://placehold.co/600x600?text=P0053','BrandAA',0,0),
('P0054','Cọ má hồng',6,110000,80000,40,TRUE,'https://placehold.co/600x600?text=P0054','BrandAA',0,0),
('P0055','Gương trang điểm',6,180000,130000,25,TRUE,'https://placehold.co/600x600?text=P0055','BrandBB',0,0),
('P0056','Túi đựng mỹ phẩm',6,160000,120000,30,TRUE,'https://placehold.co/600x600?text=P0056','BrandBB',0,0),
('P0057','Cọ đánh nền',6,140000,100000,35,TRUE,'https://placehold.co/600x600?text=P0057','BrandCC',0,0),
('P0058','Cọ môi',6,90000,60000,50,TRUE,'https://placehold.co/600x600?text=P0058','BrandCC',0,0),
('P0059','Bông tẩy trang',6,50000,30000,60,TRUE,'https://placehold.co/600x600?text=P0059','BrandDD',0,0),
('P0060','Cọ highlight',6,130000,90000,35,TRUE,'https://placehold.co/600x600?text=P0060','BrandDD',0,0),
-- Danh mục 7: Nước hoa
('P0061','Nước hoa nữ 30ml',7,350000,250000,30,TRUE,'https://placehold.co/600x600?text=P0061','BrandEE',0,0),
('P0062','Nước hoa nữ 50ml',7,550000,400000,25,TRUE,'https://placehold.co/600x600?text=P0062','BrandEE',0,0),
('P0063','Nước hoa nam 30ml',7,300000,220000,35,TRUE,'https://placehold.co/600x600?text=P0063','BrandFF',0,0),
('P0064','Nước hoa nam 50ml',7,500000,350000,20,TRUE,'https://placehold.co/600x600?text=P0064','BrandFF',0,0),
('P0065','Nước hoa unisex',7,400000,300000,25,TRUE,'https://placehold.co/600x600?text=P0065','BrandGG',0,0),
('P0066','Nước hoa mini nữ',7,150000,100000,50,TRUE,'https://placehold.co/600x600?text=P0066','BrandGG',0,0),
('P0067','Nước hoa mini nam',7,150000,100000,50,TRUE,'https://placehold.co/600x600?text=P0067','BrandHH',0,0),
('P0068','Set nước hoa 2 chai',7,700000,500000,15,TRUE,'https://placehold.co/600x600?text=P0068','BrandHH',0,0),
('P0069','Nước hoa hương trái cây',7,250000,180000,40,TRUE,'https://placehold.co/600x600?text=P0069','BrandII',0,0),
('P0070','Nước hoa hương hoa',7,260000,200000,35,TRUE,'https://placehold.co/600x600?text=P0070','BrandII',0,0),

-- Danh mục 8: Túi xách
('P0071','Túi xách nữ mini',8,300000,220000,25,TRUE,'https://placehold.co/600x600?text=P0071','BrandJJ',0,0),
('P0072','Túi xách nữ lớn',8,450000,350000,20,TRUE,'https://placehold.co/600x600?text=P0072','BrandJJ',0,0),
('P0073','Túi đeo chéo nam',8,250000,180000,30,TRUE,'https://placehold.co/600x600?text=P0073','BrandKK',0,0),
('P0074','Balo nam thời trang',8,350000,260000,20,TRUE,'https://placehold.co/600x600?text=P0074','BrandKK',0,0),
('P0075','Balo nữ mini',8,280000,210000,25,TRUE,'https://placehold.co/600x600?text=P0075','BrandLL',0,0),
('P0076','Túi tote nữ',8,200000,150000,30,TRUE,'https://placehold.co/600x600?text=P0076','BrandLL',0,0),
('P0077','Túi ví nữ',8,120000,90000,40,TRUE,'https://placehold.co/600x600?text=P0077','BrandMM',0,0),
('P0078','Túi xách da nam',8,400000,300000,20,TRUE,'https://placehold.co/600x600?text=P0078','BrandMM',0,0),
('P0079','Túi xách nữ họa tiết',8,220000,170000,35,TRUE,'https://placehold.co/600x600?text=P0079','BrandNN',0,0),
('P0080','Balo học sinh',8,180000,130000,50,TRUE,'https://placehold.co/600x600?text=P0080','BrandNN',0,0),

-- Danh mục 9: Phụ kiện thời trang
('P0081','Kính mát nữ',9,150000,100000,40,TRUE,'https://placehold.co/600x600?text=P0081','BrandOO',0,0),
('P0082','Kính mát nam',9,160000,110000,35,TRUE,'https://placehold.co/600x600?text=P0082','BrandOO',0,0),
('P0083','Thắt lưng nam',9,120000,80000,50,TRUE,'https://placehold.co/600x600?text=P0083','BrandPP',0,0),
('P0084','Thắt lưng nữ',9,130000,90000,45,TRUE,'https://placehold.co/600x600?text=P0084','BrandPP',0,0),
('P0085','Mũ thời trang nữ',9,90000,60000,60,TRUE,'https://placehold.co/600x600?text=P0085','BrandQQ',0,0),
('P0086','Mũ thời trang nam',9,95000,65000,55,TRUE,'https://placehold.co/600x600?text=P0086','BrandQQ',0,0),
('P0087','Khăn choàng nữ',9,110000,80000,50,TRUE,'https://placehold.co/600x600?text=P0087','BrandRR',0,0),
('P0088','Khăn choàng nam',9,120000,85000,45,TRUE,'https://placehold.co/600x600?text=P0088','BrandRR',0,0),
('P0089','Vòng tay nữ',9,80000,50000,60,TRUE,'https://placehold.co/600x600?text=P0089','BrandSS',0,0),
('P0090','Vòng tay nam',9,85000,55000,55,TRUE,'https://placehold.co/600x600?text=P0090','BrandSS',0,0),

-- Danh mục 10: Đồng hồ
('P0091','Đồng hồ nam dây da',10,450000,300000,25,TRUE,'https://placehold.co/600x600?text=P0091','BrandTT',0,0),
('P0092','Đồng hồ nam thể thao',10,500000,350000,20,TRUE,'https://placehold.co/600x600?text=P0092','BrandTT',0,0),
('P0093','Đồng hồ nữ dây da',10,400000,280000,25,TRUE,'https://placehold.co/600x600?text=P0093','BrandUU',0,0),
('P0094','Đồng hồ nữ thời trang',10,420000,300000,20,TRUE,'https://placehold.co/600x600?text=P0094','BrandUU',0,0),
('P0095','Đồng hồ đôi',10,650000,500000,15,TRUE,'https://placehold.co/600x600?text=P0095','BrandVV',0,0),
('P0096','Đồng hồ thông minh',10,900000,700000,10,TRUE,'https://placehold.co/600x600?text=P0096','BrandVV',0,0),
('P0097','Đồng hồ thể thao trẻ em',10,300000,200000,20,TRUE,'https://placehold.co/600x600?text=P0097','BrandWW',0,0),
('P0098','Đồng hồ nữ mini',10,350000,250000,25,TRUE,'https://placehold.co/600x600?text=P0098','BrandWW',0,0),
('P0099','Đồng hồ nam cơ',10,800000,600000,10,TRUE,'https://placehold.co/600x600?text=P0099','BrandXX',0,0),
('P0100','Đồng hồ nữ cơ',10,750000,550000,15,TRUE,'https://placehold.co/600x600?text=P0100','BrandXX',0,0),

-- Danh mục 11: Trang sức
('P0101','Nhẫn vàng nữ',11,350000,250000,20,TRUE,'https://placehold.co/600x600?text=P0101','BrandYY',0,0),
('P0102','Nhẫn bạc nam',11,200000,150000,25,TRUE,'https://placehold.co/600x600?text=P0102','BrandYY',0,0),
('P0103','Dây chuyền nữ',11,300000,200000,30,TRUE,'https://placehold.co/600x600?text=P0103','BrandZZ',0,0),
('P0104','Dây chuyền nam',11,320000,220000,25,TRUE,'https://placehold.co/600x600?text=P0104','BrandZZ',0,0),
('P0105','Bông tai nữ',11,150000,100000,40,TRUE,'https://placehold.co/600x600?text=P0105','BrandAAA',0,0),
('P0106','Vòng tay nữ',11,200000,150000,35,TRUE,'https://placehold.co/600x600?text=P0106','BrandAAB',0,0),
('P0107','Vòng cổ nam',11,250000,180000,30,TRUE,'https://placehold.co/600x600?text=P0107','BrandBBB',0,0),
('P0108','Nhẫn đôi',11,300000,220000,20,TRUE,'https://placehold.co/600x600?text=P0108','BrandBBB',0,0),
('P0109','Bông tai đôi',11,180000,120000,25,TRUE,'https://placehold.co/600x600?text=P0109','BrandCCC',0,0),
('P0110','Vòng tay đôi',11,220000,160000,20,TRUE,'https://placehold.co/600x600?text=P0110','BrandCCC',0,0),

-- Danh mục 12: Mũ nón
('P0111','Mũ lưỡi trai nam',12,120000,80000,50,TRUE,'https://placehold.co/600x600?text=P0111','BrandDDD',0,0),
('P0112','Mũ lưỡi trai nữ',12,120000,80000,50,TRUE,'https://placehold.co/600x600?text=P0112','BrandDDD',0,0),
('P0113','Mũ beret nữ',12,90000,60000,40,TRUE,'https://placehold.co/600x600?text=P0113','BrandEEE',0,0),
('P0114','Mũ phớt nam',12,130000,90000,35,TRUE,'https://placehold.co/600x600?text=P0114','BrandEEE',0,0),
('P0115','Mũ rộng vành nữ',12,150000,110000,30,TRUE,'https://placehold.co/600x600?text=P0115','BrandFFF',0,0),
('P0116','Mũ rộng vành nam',12,150000,110000,30,TRUE,'https://placehold.co/600x600?text=P0116','BrandFFF',0,0),
('P0117','Mũ len nữ',12,80000,50000,60,TRUE,'https://placehold.co/600x600?text=P0117','BrandGGG',0,0),
('P0118','Mũ len nam',12,85000,55000,55,TRUE,'https://placehold.co/600x600?text=P0118','BrandGGG',0,0),
('P0119','Mũ bóng chày trẻ em',12,70000,45000,70,TRUE,'https://placehold.co/600x600?text=P0119','BrandHHH',0,0),
('P0120','Mũ thời trang trẻ em',12,75000,50000,65,TRUE,'https://placehold.co/600x600?text=P0120','BrandHHH',0,0),

-- Danh mục 13: Thắt lưng
('P0121','Thắt lưng nam da bò',13,180000,130000,35,TRUE,'https://placehold.co/600x600?text=P0121','BrandIII',0,0),
('P0122','Thắt lưng nữ da thật',13,200000,150000,30,TRUE,'https://placehold.co/600x600?text=P0122','BrandIII',0,0),
('P0123','Thắt lưng trẻ em',13,90000,60000,50,TRUE,'https://placehold.co/600x600?text=P0123','BrandJJJ',0,0),
('P0124','Thắt lưng nam cao cấp',13,250000,180000,20,TRUE,'https://placehold.co/600x600?text=P0124','BrandJJJ',0,0),
('P0125','Thắt lưng nữ thời trang',13,220000,160000,25,TRUE,'https://placehold.co/600x600?text=P0125','BrandKKK',0,0),
('P0126','Thắt lưng nam thể thao',13,200000,150000,30,TRUE,'https://placehold.co/600x600?text=P0126','BrandKKK',0,0),
('P0127','Thắt lưng da bò handmade',13,350000,250000,15,TRUE,'https://placehold.co/600x600?text=P0127','BrandLLL',0,0),
('P0128','Thắt lưng da PU',13,150000,100000,40,TRUE,'https://placehold.co/600x600?text=P0128','BrandLLL',0,0),
('P0129','Thắt lưng trẻ em thời trang',13,120000,90000,50,TRUE,'https://placehold.co/600x600?text=P0129','BrandMMM',0,0),
('P0130','Thắt lưng đôi',13,300000,220000,20,TRUE,'https://placehold.co/600x600?text=P0130','BrandMMM',0,0),

-- Danh mục 14: Vớ/Tất
('P0131','Tất nữ cổ cao',14,50000,30000,60,TRUE,'https://placehold.co/600x600?text=P0131','BrandNNN',0,0),
('P0132','Tất nam cổ cao',14,50000,30000,60,TRUE,'https://placehold.co/600x600?text=P0132','BrandNNN',0,0),
('P0133','Vớ trẻ em',14,40000,25000,70,TRUE,'https://placehold.co/600x600?text=P0133','BrandOOO',0,0),
('P0134','Vớ nữ thể thao',14,45000,30000,60,TRUE,'https://placehold.co/600x600?text=P0134','BrandOOO',0,0),
('P0135','Vớ nam thể thao',14,45000,30000,60,TRUE,'https://placehold.co/600x600?text=P0135','BrandPPP',0,0),
('P0136','Tất ngắn nữ',14,40000,25000,70,TRUE,'https://placehold.co/600x600?text=P0136','BrandPPP',0,0),
('P0137','Tất ngắn nam',14,40000,25000,65,TRUE,'https://placehold.co/600x600?text=P0137','BrandQQQ',0,0),
('P0138','Vớ chân dài nữ',14,50000,30000,60,TRUE,'https://placehold.co/600x600?text=P0138','BrandQQQ',0,0),
('P0139','Vớ chân dài nam',14,50000,30000,60,TRUE,'https://placehold.co/600x600?text=P0139','BrandRRR',0,0),
('P0140','Vớ trẻ em họa tiết',14,45000,30000,70,TRUE,'https://placehold.co/600x600?text=P0140','BrandRRR',0,0),

-- Danh mục 15: Kính mắt
('P0141','Kính mát nam thời trang',15,150000,100000,35,TRUE,'https://placehold.co/600x600?text=P0141','BrandSSS',0,0),
('P0142','Kính mát nữ thời trang',15,160000,110000,35,TRUE,'https://placehold.co/600x600?text=P0142','BrandSSS',0,0),
('P0143','Kính đọc sách nam',15,120000,80000,40,TRUE,'https://placehold.co/600x600?text=P0143','BrandTTT',0,0),
('P0144','Kính đọc sách nữ',15,120000,80000,40,TRUE,'https://placehold.co/600x600?text=P0144','BrandTTT',0,0),
('P0145','Kính mắt trẻ em',15,90000,60000,50,TRUE,'https://placehold.co/600x600?text=P0145','BrandUUU',0,0),
('P0146','Kính râm thể thao',15,150000,110000,35,TRUE,'https://placehold.co/600x600?text=P0146','BrandUUU',0,0),
('P0147','Kính phi công nam',15,200000,150000,25,TRUE,'https://placehold.co/600x600?text=P0147','BrandVVV',0,0),
('P0148','Kính phi công nữ',15,200000,150000,25,TRUE,'https://placehold.co/600x600?text=P0148','BrandVVV',0,0),
('P0149','Kính mát unisex',15,180000,130000,30,TRUE,'https://placehold.co/600x600?text=P0149','BrandWWW',0,0),
('P0150','Kính thời trang nam nữ',15,180000,130000,30,TRUE,'https://placehold.co/600x600?text=P0150','BrandWWW',0,0),

-- Danh mục 16: Túi ví
('P0151','Túi ví nữ nhỏ',16,200000,150000,30,TRUE,'https://placehold.co/600x600?text=P0151','BrandXXX',0,0),
('P0152','Túi ví nữ lớn',16,250000,180000,25,TRUE,'https://placehold.co/600x600?text=P0152','BrandXXX',0,0),
('P0153','Túi ví nam da thật',16,300000,220000,20,TRUE,'https://placehold.co/600x600?text=P0153','BrandYYY',0,0),
('P0154','Túi ví nam thời trang',16,280000,200000,25,TRUE,'https://placehold.co/600x600?text=P0154','BrandYYY',0,0),
('P0155','Ví cầm tay nữ',16,180000,130000,35,TRUE,'https://placehold.co/600x600?text=P0155','BrandZZZ',0,0),
('P0156','Ví đựng thẻ',16,120000,90000,40,TRUE,'https://placehold.co/600x600?text=P0156','BrandZZZ',0,0),
('P0157','Ví da bò nam',16,250000,180000,25,TRUE,'https://placehold.co/600x600?text=P0157','BrandAAA1',0,0),
('P0158','Ví da tổng hợp nữ',16,150000,110000,35,TRUE,'https://placehold.co/600x600?text=P0158','BrandAAA1',0,0),
('P0159','Ví mini trẻ em',16,90000,60000,50,TRUE,'https://placehold.co/600x600?text=P0159','BrandBBB1',0,0),
('P0160','Ví đôi nam nữ',16,300000,220000,20,TRUE,'https://placehold.co/600x600?text=P0160','BrandBBB1',0,0),

-- Danh mục 17: Phụ kiện tóc
('P0161','Kẹp tóc nữ',17,50000,30000,60,TRUE,'https://placehold.co/600x600?text=P0161','BrandCCC1',0,0),
('P0162','Băng đô nữ',17,60000,40000,50,TRUE,'https://placehold.co/600x600?text=P0162','BrandCCC1',0,0),
('P0163','Cột tóc nữ',17,40000,25000,70,TRUE,'https://placehold.co/600x600?text=P0163','BrandDDD1',0,0),
('P0164','Tóc giả nữ',17,250000,180000,25,TRUE,'https://placehold.co/600x600?text=P0164','BrandDDD1',0,0),
('P0165','Kẹp tóc trẻ em',17,30000,20000,80,TRUE,'https://placehold.co/600x600?text=P0165','BrandEEE1',0,0),
('P0166','Băng đô trẻ em',17,35000,25000,70,TRUE,'https://placehold.co/600x600?text=P0166','BrandEEE1',0,0),
('P0167','Kẹp tóc nam',17,50000,30000,50,TRUE,'https://placehold.co/600x600?text=P0167','BrandFFF1',0,0),
('P0168','Băng đô nam',17,60000,40000,40,TRUE,'https://placehold.co/600x600?text=P0168','BrandFFF1',0,0),
('P0169','Phụ kiện tóc đôi',17,70000,50000,30,TRUE,'https://placehold.co/600x600?text=P0169','BrandGGG1',0,0),
('P0170','Phụ kiện tóc thời trang',17,80000,60000,25,TRUE,'https://placehold.co/600x600?text=P0170','BrandGGG1',0,0),

-- Danh mục 18: Thời trang thể thao
('P0171','Bộ đồ thể thao nam',18,300000,220000,25,TRUE,'https://placehold.co/600x600?text=P0171','BrandHHH1',0,0),
('P0172','Bộ đồ thể thao nữ',18,280000,210000,25,TRUE,'https://placehold.co/600x600?text=P0172','BrandHHH1',0,0),
('P0173','Quần legging nữ',18,150000,110000,40,TRUE,'https://placehold.co/600x600?text=P0173','BrandIII1',0,0),
('P0174','Quần short thể thao nam',18,160000,120000,35,TRUE,'https://placehold.co/600x600?text=P0174','BrandIII1',0,0),
('P0175','Áo thun thể thao nam',18,120000,90000,50,TRUE,'https://placehold.co/600x600?text=P0175','BrandJJJ1',0,0),
('P0176','Áo thun thể thao nữ',18,120000,90000,50,TRUE,'https://placehold.co/600x600?text=P0176','BrandJJJ1',0,0),
('P0177','Giày thể thao nam',18,350000,250000,30,TRUE,'https://placehold.co/600x600?text=P0177','BrandKKK1',0,0),
('P0178','Giày thể thao nữ',18,340000,240000,30,TRUE,'https://placehold.co/600x600?text=P0178','BrandKKK1',0,0),
('P0179','Balo thể thao',18,280000,210000,25,TRUE,'https://placehold.co/600x600?text=P0179','BrandLLL1',0,0),
('P0180','Phụ kiện thể thao',18,90000,60000,50,TRUE,'https://placehold.co/600x600?text=P0180','BrandLLL1',0,0);

-- khách hàng
INSERT INTO customers (customer_id, user_id, full_name, email, phone, address, created_at, updated_at) VALUES
('CUS1', 'CUS1', 'Đặng Thị Ngọc', 'dặngthingoc@example.com', '0900100001', '87 Nguyễn Trãi, Hà Nội', '2024-11-01', '2024-11-01'),
('CUS2', 'CUS2', 'Phạm Văn Quang', 'phamvanquang@example.com', '0900100002', '88 Trần Hưng Đạo, Hà Nội', '2024-11-02', '2024-11-02'),
('CUS3', 'CUS3', 'Đỗ Thị Thu', 'dỗthithu@example.com', '0900100003', '27 Hai Bà Trưng, Hà Nội', '2024-11-03', '2024-11-03'),
('CUS4', 'CUS4', 'Đỗ Văn Đông', 'dỗvandong@example.com', '0900100004', '187 Bà Triệu, Hà Nội', '2024-11-04', '2024-11-04'),
('CUS5', 'CUS5', 'Võ Văn Tùng', 'vovantung@example.com', '0900100005', '179 Phan Chu Trinh, Hà Nội', '2024-11-05', '2024-11-05'),
('CUS6', 'CUS6', 'Đỗ Văn Kiên', 'dỗvankien@example.com', '0900100006', '125 Nguyễn Du, Hà Nội', '2024-11-06', '2024-11-06'),
('CUS7', 'CUS7', 'Hoàng Văn Đông', 'hoangvandong@example.com', '0900100007', '168 Trần Phú, Hà Nội', '2024-11-07', '2024-11-07'),
('CUS8', 'CUS8', 'Trương Văn Huy', 'truongvanhuy@example.com', '0900100008', '13 Lý Thường Kiệt, Hà Nội', '2024-11-08', '2024-11-08'),
('CUS9', 'CUS9', 'Lê Văn Cường', 'levancuờng@example.com', '0900100009', '13 Lê Lợi, Hà Nội', '2024-11-09', '2024-11-09'),
('CUS10', 'CUS10', 'Đặng Văn An', 'dặngvanan@example.com', '0900100010', '144 Nguyễn Trãi, Hà Nội', '2024-11-10', '2024-11-10'),
('CUS11', 'CUS11', 'Trần Thị Lan', 'trầnthilan@example.com', '0900100011', '128 Trần Hưng Đạo, Hà Nội', '2024-11-11', '2024-11-11'),
('CUS12', 'CUS12', 'Đặng Văn Cường', 'dặngvancuờng@example.com', '0900100012', '96 Hai Bà Trưng, Hà Nội', '2024-11-12', '2024-11-12'),
('CUS13', 'CUS13', 'Đặng Thị Bình', 'dặngthibinh@example.com', '0900100013', '131 Bà Triệu, Hà Nội', '2024-11-13', '2024-11-13'),
('CUS14', 'CUS14', 'Phạm Văn Hoàng', 'phamvanhoang@example.com', '0900100014', '120 Phan Chu Trinh, Hà Nội', '2024-11-14', '2024-11-14'),
('CUS15', 'CUS15', 'Đỗ Văn Huy', 'dỗvanhuy@example.com', '0900100015', '182 Nguyễn Du, Hà Nội', '2024-11-15', '2024-11-15'),
('CUS16', 'CUS16', 'Hoàng Văn An', 'hoangvanan@example.com', '0900100016', '92 Trần Phú, Hà Nội', '2024-11-16', '2024-11-16'),
('CUS17', 'CUS17', 'Nguyễn Văn Nam', 'nguyễnvannam@example.com', '0900100017', '145 Lý Thường Kiệt, Hà Nội', '2024-11-17', '2024-11-17'),
('CUS18', 'CUS18', 'Trần Thị Hạnh', 'trầnthihanh@example.com', '0900100018', '83 Lê Lợi, Hà Nội', '2024-11-18', '2024-11-18'),
('CUS19', 'CUS19', 'Lê Văn Tùng', 'levantung@example.com', '0900100019', '95 Nguyễn Trãi, Hà Nội', '2024-11-19', '2024-11-19'),
('CUS20', 'CUS20', 'Đỗ Văn Quang', 'dỗvanquang@example.com', '0900100020', '133 Trần Hưng Đạo, Hà Nội', '2024-11-20', '2024-11-20'),
('CUS21', 'CUS21', 'Đặng Thị Phương', 'dặngthiphuong@example.com', '0900100021', '62 Hai Bà Trưng, Hà Nội', '2024-11-21', '2024-11-21'),
('CUS22', 'CUS22', 'Phạm Thị Phương', 'phamthiphuong@example.com', '0900100022', '10 Bà Triệu, Hà Nội', '2024-11-22', '2024-11-22'),
('CUS23', 'CUS23', 'Lê Văn Kiên', 'levankien@example.com', '0900100023', '158 Phan Chu Trinh, Hà Nội', '2024-11-23', '2024-11-23'),
('CUS24', 'CUS24', 'Lê Văn Phúc', 'levanphuc@example.com', '0900100024', '3 Nguyễn Du, Hà Nội', '2024-11-24', '2024-11-24'),
('CUS25', 'CUS25', 'Nguyễn Thị Ngọc', 'nguyễnthingoc@example.com', '0900100025', '134 Trần Phú, Hà Nội', '2024-11-25', '2024-11-25'),
('CUS26', 'CUS26', 'Phan Thị Dung', 'phanthidung@example.com', '0900100026', '120 Lý Thường Kiệt, Hà Nội', '2024-11-26', '2024-11-26'),
('CUS27', 'CUS27', 'Trương Văn Quang', 'truongvanquang@example.com', '0900100027', '70 Lê Lợi, Hà Nội', '2024-11-27', '2024-11-27'),
('CUS28', 'CUS28', 'Lê Thị Lan', 'lethilan@example.com', '0900100028', '20 Nguyễn Trãi, Hà Nội', '2024-11-28', '2024-11-28'),
('CUS29', 'CUS29', 'Phạm Văn Kiên', 'phamvankien@example.com', '0900100029', '189 Trần Hưng Đạo, Hà Nội', '2024-11-29', '2024-11-29'),
('CUS30', 'CUS30', 'Nguyễn Thị Mai', 'nguyễnthimai@example.com', '0900100030', '184 Hai Bà Trưng, Hà Nội', '2024-11-30', '2024-11-30'),
('CUS31', 'CUS31', 'Trương Thị Phương', 'truongthiphuong@example.com', '0900100031', '169 Bà Triệu, Hà Nội', '2024-11-01', '2024-11-01'),
('CUS32', 'CUS32', 'Hoàng Thị Lan', 'hoangthilan@example.com', '0900100032', '89 Phan Chu Trinh, Hà Nội', '2024-11-02', '2024-11-02'),
('CUS33', 'CUS33', 'Phạm Thị Hạnh', 'phamthihanh@example.com', '0900100033', '124 Nguyễn Du, Hà Nội', '2024-11-03', '2024-11-03'),
('CUS34', 'CUS34', 'Võ Văn Phúc', 'vovanphuc@example.com', '0900100034', '163 Trần Phú, Hà Nội', '2024-11-04', '2024-11-04'),
('CUS35', 'CUS35', 'Võ Thị Lan', 'vothilan@example.com', '0900100035', '72 Lý Thường Kiệt, Hà Nội', '2024-11-05', '2024-11-05'),
('CUS36', 'CUS36', 'Hoàng Văn Hoàng', 'hoangvanhoang@example.com', '0900100036', '97 Lê Lợi, Hà Nội', '2024-11-06', '2024-11-06'),
('CUS37', 'CUS37', 'Hoàng Văn Phúc', 'hoangvanphuc@example.com', '0900100037', '9 Nguyễn Trãi, Hà Nội', '2024-11-07', '2024-11-07'),
('CUS38', 'CUS38', 'Hoàng Văn Cường', 'hoangvancuờng@example.com', '0900100038', '137 Trần Hưng Đạo, Hà Nội', '2024-11-08', '2024-11-08'),
('CUS39', 'CUS39', 'Nguyễn Văn Cường', 'nguyễnvancuờng@example.com', '0900100039', '2 Hai Bà Trưng, Hà Nội', '2024-11-09', '2024-11-09'),
('CUS40', 'CUS40', 'Phạm Văn Kiên', 'phamvankien@example.com', '0900100040', '83 Bà Triệu, Hà Nội', '2024-11-10', '2024-11-10'),
('CUS41', 'CUS41', 'Võ Thị Ngọc', 'vothingoc@example.com', '0900100041', '145 Phan Chu Trinh, Hà Nội', '2024-11-11', '2024-11-11'),
('CUS42', 'CUS42', 'Đỗ Thị Hạnh', 'dỗthihanh@example.com', '0900100042', '127 Nguyễn Du, Hà Nội', '2024-11-12', '2024-11-12'),
('CUS43', 'CUS43', 'Lê Thị Phương', 'lethiphuong@example.com', '0900100043', '129 Trần Phú, Hà Nội', '2024-11-13', '2024-11-13'),
('CUS44', 'CUS44', 'Hoàng Văn Nam', 'hoangvannam@example.com', '0900100044', '135 Lý Thường Kiệt, Hà Nội', '2024-11-14', '2024-11-14'),
('CUS45', 'CUS45', 'Đặng Thị Ngọc', 'dặngthingoc@example.com', '0900100045', '136 Lê Lợi, Hà Nội', '2024-11-15', '2024-11-15'),
('CUS46', 'CUS46', 'Lê Văn Tùng', 'levantung@example.com', '0900100046', '140 Nguyễn Trãi, Hà Nội', '2024-11-16', '2024-11-16'),
('CUS47', 'CUS47', 'Lê Thị Hạnh', 'lethihanh@example.com', '0900100047', '112 Trần Hưng Đạo, Hà Nội', '2024-11-17', '2024-11-17'),
('CUS48', 'CUS48', 'Võ Thị Lan', 'vothilan@example.com', '0900100048', '116 Hai Bà Trưng, Hà Nội', '2024-11-18', '2024-11-18'),
('CUS49', 'CUS49', 'Hoàng Thị Thu', 'hoangthithu@example.com', '0900100049', '189 Bà Triệu, Hà Nội', '2024-11-19', '2024-11-19'),
('CUS50', 'CUS50', 'Nguyễn Thị Ngọc', 'nguyễnthingoc@example.com', '0900100050', '71 Phan Chu Trinh, Hà Nội', '2024-11-20', '2024-11-20'),
('CUS51', 'CUS51', 'Võ Văn Kiên', 'vovankien@example.com', '0900100051', '178 Nguyễn Du, Hà Nội', '2024-11-21', '2024-11-21'),
('CUS52', 'CUS52', 'Trương Văn Phúc', 'truongvanphuc@example.com', '0900100052', '57 Trần Phú, Hà Nội', '2024-11-22', '2024-11-22'),
('CUS53', 'CUS53', 'Nguyễn Văn Cường', 'nguyễnvancuờng@example.com', '0900100053', '64 Lý Thường Kiệt, Hà Nội', '2024-11-23', '2024-11-23'),
('CUS54', 'CUS54', 'Phạm Thị Lan', 'phamthilan@example.com', '0900100054', '23 Lê Lợi, Hà Nội', '2024-11-24', '2024-11-24'),
('CUS55', 'CUS55', 'Trương Thị Hạnh', 'truongthihanh@example.com', '0900100055', '191 Nguyễn Trãi, Hà Nội', '2024-11-25', '2024-11-25'),
('CUS56', 'CUS56', 'Phan Thị Ngọc', 'phanthingoc@example.com', '0900100056', '118 Trần Hưng Đạo, Hà Nội', '2024-11-26', '2024-11-26'),
('CUS57', 'CUS57', 'Hoàng Thị Mai', 'hoangthimai@example.com', '0900100057', '164 Hai Bà Trưng, Hà Nội', '2024-11-27', '2024-11-27'),
('CUS58', 'CUS58', 'Hoàng Văn Kiên', 'hoangvankien@example.com', '0900100058', '166 Bà Triệu, Hà Nội', '2024-11-28', '2024-11-28'),
('CUS59', 'CUS59', 'Phan Văn Quang', 'phanvanquang@example.com', '0900100059', '179 Phan Chu Trinh, Hà Nội', '2024-11-29', '2024-11-29'),
('CUS60', 'CUS60', 'Nguyễn Văn Kiên', 'nguyễnvankien@example.com', '0900100060', '122 Nguyễn Du, Hà Nội', '2024-11-30', '2024-11-30'),
('CUS61', 'CUS61', 'Hoàng Thị Lan', 'hoangthilan@example.com', '0900100061', '46 Trần Phú, Hà Nội', '2024-11-01', '2024-11-01'),
('CUS62', 'CUS62', 'Trương Văn Đông', 'truongvandong@example.com', '0900100062', '181 Lý Thường Kiệt, Hà Nội', '2024-11-02', '2024-11-02'),
('CUS63', 'CUS63', 'Lê Thị Lan', 'lethilan@example.com', '0900100063', '164 Lê Lợi, Hà Nội', '2024-11-03', '2024-11-03'),
('CUS64', 'CUS64', 'Trần Thị Bình', 'trầnthibinh@example.com', '0900100064', '48 Nguyễn Trãi, Hà Nội', '2024-11-04', '2024-11-04'),
('CUS65', 'CUS65', 'Đặng Thị Lan', 'dặngthilan@example.com', '0900100065', '39 Trần Hưng Đạo, Hà Nội', '2024-11-05', '2024-11-05'),
('CUS66', 'CUS66', 'Hoàng Văn Tùng', 'hoangvantung@example.com', '0900100066', '13 Hai Bà Trưng, Hà Nội', '2024-11-06', '2024-11-06'),
('CUS67', 'CUS67', 'Đỗ Văn An', 'dỗvanan@example.com', '0900100067', '31 Bà Triệu, Hà Nội', '2024-11-07', '2024-11-07'),
('CUS68', 'CUS68', 'Phan Thị Phương', 'phanthiphuong@example.com', '0900100068', '87 Phan Chu Trinh, Hà Nội', '2024-11-08', '2024-11-08'),
('CUS69', 'CUS69', 'Nguyễn Văn Quang', 'nguyễnvanquang@example.com', '0900100069', '85 Nguyễn Du, Hà Nội', '2024-11-09', '2024-11-09'),
('CUS70', 'CUS70', 'Hoàng Thị Phương', 'hoangthiphuong@example.com', '0900100070', '11 Trần Phú, Hà Nội', '2024-11-10', '2024-11-10'),
('CUS71', 'CUS71', 'Phan Thị Mai', 'phanthimai@example.com', '0900100071', '117 Lý Thường Kiệt, Hà Nội', '2024-11-11', '2024-11-11'),
('CUS72', 'CUS72', 'Võ Thị Dung', 'vothidung@example.com', '0900100072', '30 Lê Lợi, Hà Nội', '2024-11-12', '2024-11-12'),
('CUS73', 'CUS73', 'Đặng Văn Đông', 'dặngvandong@example.com', '0900100073', '1 Nguyễn Trãi, Hà Nội', '2024-11-13', '2024-11-13'),
('CUS74', 'CUS74', 'Hoàng Văn An', 'hoangvanan@example.com', '0900100074', '69 Trần Hưng Đạo, Hà Nội', '2024-11-14', '2024-11-14'),
('CUS75', 'CUS75', 'Phạm Văn Cường', 'phamvancuờng@example.com', '0900100075', '9 Hai Bà Trưng, Hà Nội', '2024-11-15', '2024-11-15'),
('CUS76', 'CUS76', 'Trần Văn Nam', 'trầnvannam@example.com', '0900100076', '44 Bà Triệu, Hà Nội', '2024-11-16', '2024-11-16'),
('CUS77', 'CUS77', 'Võ Văn Bình', 'vovanbinh@example.com', '0900100077', '15 Phan Chu Trinh, Hà Nội', '2024-11-17', '2024-11-17'),
('CUS78', 'CUS78', 'Hoàng Thị Thu', 'hoangthithu@example.com', '0900100078', '115 Nguyễn Du, Hà Nội', '2024-11-18', '2024-11-18'),
('CUS79', 'CUS79', 'Phan Văn Tùng', 'phanvantung@example.com', '0900100079', '156 Trần Phú, Hà Nội', '2024-11-19', '2024-11-19'),
('CUS80', 'CUS80', 'Đỗ Văn An', 'dỗvanan@example.com', '0900100080', '182 Lý Thường Kiệt, Hà Nội', '2024-11-20', '2024-11-20'),
('CUS81', 'CUS81', 'Nguyễn Thị Thu', 'nguyễnthithu@example.com', '0900100081', '86 Lê Lợi, Hà Nội', '2024-11-21', '2024-11-21'),
('CUS82', 'CUS82', 'Đỗ Thị Dung', 'dỗthidung@example.com', '0900100082', '37 Nguyễn Trãi, Hà Nội', '2024-11-22', '2024-11-22'),
('CUS83', 'CUS83', 'Trương Thị Hạnh', 'truongthihanh@example.com', '0900100083', '182 Trần Hưng Đạo, Hà Nội', '2024-11-23', '2024-11-23'),
('CUS84', 'CUS84', 'Phạm Văn Bình', 'phamvanbinh@example.com', '0900100084', '24 Hai Bà Trưng, Hà Nội', '2024-11-24', '2024-11-24'),
('CUS85', 'CUS85', 'Phan Thị Bình', 'phanthibinh@example.com', '0900100085', '127 Bà Triệu, Hà Nội', '2024-11-25', '2024-11-25'),
('CUS86', 'CUS86', 'Võ Thị Lan', 'vothilan@example.com', '0900100086', '41 Phan Chu Trinh, Hà Nội', '2024-11-26', '2024-11-26'),
('CUS87', 'CUS87', 'Phạm Thị Bình', 'phamthibinh@example.com', '0900100087', '174 Nguyễn Du, Hà Nội', '2024-11-27', '2024-11-27'),
('CUS88', 'CUS88', 'Đỗ Thị Lan', 'dỗthilan@example.com', '0900100088', '60 Trần Phú, Hà Nội', '2024-11-28', '2024-11-28'),
('CUS89', 'CUS89', 'Võ Văn Hoàng', 'vovanhoang@example.com', '0900100089', '158 Lý Thường Kiệt, Hà Nội', '2024-11-29', '2024-11-29'),
('CUS90', 'CUS90', 'Nguyễn Văn Cường', 'nguyễnvancuờng@example.com', '0900100090', '196 Lê Lợi, Hà Nội', '2024-11-30', '2024-11-30'),
('CUS91', 'CUS91', 'Đỗ Văn Nam', 'dỗvannam@example.com', '0900100091', '176 Nguyễn Trãi, Hà Nội', '2024-11-01', '2024-11-01'),
('CUS92', 'CUS92', 'Phan Văn Đông', 'phanvandong@example.com', '0900100092', '173 Trần Hưng Đạo, Hà Nội', '2024-11-02', '2024-11-02'),
('CUS93', 'CUS93', 'Hoàng Văn Đông', 'hoangvandong@example.com', '0900100093', '92 Hai Bà Trưng, Hà Nội', '2024-11-03', '2024-11-03'),
('CUS94', 'CUS94', 'Phan Văn Hoàng', 'phanvanhoang@example.com', '0900100094', '199 Bà Triệu, Hà Nội', '2024-11-04', '2024-11-04'),
('CUS95', 'CUS95', 'Lê Thị Lan', 'lethilan@example.com', '0900100095', '155 Phan Chu Trinh, Hà Nội', '2024-11-05', '2024-11-05'),
('CUS96', 'CUS96', 'Lê Thị Phương', 'lethiphuong@example.com', '0900100096', '90 Nguyễn Du, Hà Nội', '2024-11-06', '2024-11-06'),
('CUS97', 'CUS97', 'Trương Văn Cường', 'truongvancuờng@example.com', '0900100097', '151 Trần Phú, Hà Nội', '2024-11-07', '2024-11-07'),
('CUS98', 'CUS98', 'Trương Thị Dung', 'truongthidung@example.com', '0900100098', '43 Lý Thường Kiệt, Hà Nội', '2024-11-08', '2024-11-08'),
('CUS99', 'CUS99', 'Lê Văn Tùng', 'levantung@example.com', '0900100099', '181 Lê Lợi, Hà Nội', '2024-11-09', '2024-11-09'),
('CUS100', 'CUS100', 'Nguyễn Văn Hoàng', 'nguyễnvanhoang@example.com', '0900100100', '16 Nguyễn Trãi, Hà Nội', '2024-11-10', '2024-11-10'),
('CUS101', 'CUS101', 'Đỗ Văn Tùng', 'dỗvantung@example.com', '0900100101', '22 Trần Hưng Đạo, Hà Nội', '2024-11-11', '2025-11-17'),
('CUS102', 'CUS102', 'Trương Văn Quang', 'truongvanquang@example.com', '0900100102', '187 Hai Bà Trưng, Hà Nội', '2024-11-12', '2025-11-18'),
('CUS103', 'CUS103', 'Nguyễn Văn Kiên', 'nguyễnvankien@example.com', '0900100103', '43 Bà Triệu, Hà Nội', '2024-11-13', '2025-11-19'),
('CUS104', 'CUS104', 'Lê Thị Mai', 'lethimai@example.com', '0900100104', '87 Phan Chu Trinh, Hà Nội', '2024-11-14', '2025-11-20'),
('CUS105', 'CUS105', 'Hoàng Văn Cường', 'hoangvancuờng@example.com', '0900100105', '134 Nguyễn Du, Hà Nội', '2024-11-15', '2025-11-21'),
('CUS106', 'CUS106', 'Phạm Thị Ngọc', 'phamthingoc@example.com', '0900100106', '141 Trần Phú, Hà Nội', '2024-11-16', '2025-11-22'),
('CUS107', 'CUS107', 'Trương Thị Dung', 'truongthidung@example.com', '0900100107', '166 Lý Thường Kiệt, Hà Nội', '2024-11-17', '2025-11-23'),
('CUS108', 'CUS108', 'Phạm Văn Tùng', 'phamvantung@example.com', '0900100108', '151 Lê Lợi, Hà Nội', '2024-11-18', '2025-11-24'),
('CUS109', 'CUS109', 'Võ Văn Đông', 'vovandong@example.com', '0900100109', '130 Nguyễn Trãi, Hà Nội', '2024-11-19', '2025-11-26'),
('CUS110', 'CUS110', 'Đặng Văn Kiên', 'dặngvankien@example.com', '0900100110', '171 Trần Hưng Đạo, Hà Nội', '2024-11-20', '2025-11-26'),
('CUS111', 'CUS111', 'Trương Thị Lan', 'truongthilan@example.com', '0900100111', '186 Hai Bà Trưng, Hà Nội', '2024-11-21', '2025-11-26'),
('CUS112', 'CUS112', 'Phan Văn Nam', 'phanvannam@example.com', '0900100112', '164 Bà Triệu, Hà Nội', '2024-11-22', '2025-11-26'),
('CUS113', 'CUS113', 'Nguyễn Văn Nam', 'nguyễnvannam@example.com', '0900100113', '114 Phan Chu Trinh, Hà Nội', '2025-11-26', '2025-11-26'),
('CUS114', 'CUS114', 'Võ Văn Quang', 'vovanquang@example.com', '0900100114', '73 Nguyễn Du, Hà Nội', '2024-11-24', '2024-11-24'),
('CUS115', 'CUS115', 'Trần Thị Dung', 'trầnthidung@example.com', '0900100115', '157 Trần Phú, Hà Nội', '2024-11-25', '2024-11-25'),
('CUS116', 'CUS116', 'Trương Văn Quang', 'truongvanquang@example.com', '0900100116', '186 Lý Thường Kiệt, Hà Nội', '2024-11-26', '2025-11-15'),
('CUS117', 'CUS117', 'Trần Văn Phúc', 'trầnvanphuc@example.com', '0900100117', '52 Lê Lợi, Hà Nội', '2024-11-27', '2025-11-16'),
('CUS118', 'CUS118', 'Lê Thị Mai', 'lethimai@example.com', '0900100118', '148 Nguyễn Trãi, Hà Nội', '2024-11-28', '2024-11-28'),
('CUS119', 'CUS119', 'Phạm Thị Lan', 'phamthilan@example.com', '0900100119', '173 Trần Hưng Đạo, Hà Nội', '2024-11-29', '2024-11-29'),
('CUS120', 'CUS120', 'Đỗ Văn An', 'dỗvanan@example.com', '0900100120', '197 Hai Bà Trưng, Hà Nội', '2024-11-30', '2024-11-30'),
('CUS121', 'CUS121', 'Hoàng Thị Phương', 'hoangthiphuong@example.com', '0900100121', '29 Bà Triệu, Hà Nội', '2024-11-01', '2024-11-01'),
('CUS122', 'CUS122', 'Võ Thị Hạnh', 'vothihanh@example.com', '0900100122', '164 Phan Chu Trinh, Hà Nội', '2024-11-02', '2024-11-02'),
('CUS123', 'CUS123', 'Lê Văn Huy', 'levanhuy@example.com', '0900100123', '199 Nguyễn Du, Hà Nội', '2024-11-03', '2024-11-03'),
('CUS124', 'CUS124', 'Phan Văn Huy', 'phanvanhuy@example.com', '0900100124', '183 Trần Phú, Hà Nội', '2024-11-04', '2024-11-04'),
('CUS125', 'CUS125', 'Võ Thị Lan', 'vothilan@example.com', '0900100125', '70 Lý Thường Kiệt, Hà Nội', '2024-11-05', '2024-11-05'),
('CUS126', 'CUS126', 'Đặng Thị Hạnh', 'dặngthihanh@example.com', '0900100126', '156 Lê Lợi, Hà Nội', '2024-11-06', '2024-11-06'),
('CUS127', 'CUS127', 'Võ Thị Thu', 'vothithu@example.com', '0900100127', '30 Nguyễn Trãi, Hà Nội', '2024-11-07', '2024-11-07'),
('CUS128', 'CUS128', 'Nguyễn Thị Ngọc', 'nguyễnthingoc@example.com', '0900100128', '116 Trần Hưng Đạo, Hà Nội', '2024-11-08', '2024-11-08'),
('CUS129', 'CUS129', 'Phan Thị Thu', 'phanthithu@example.com', '0900100129', '153 Hai Bà Trưng, Hà Nội', '2024-11-09', '2024-11-09'),
('CUS130', 'CUS130', 'Hoàng Thị Hạnh', 'hoangthihanh@example.com', '0900100130', '120 Bà Triệu, Hà Nội', '2024-11-10', '2024-11-10'),
('CUS131', 'CUS131', 'Phạm Văn Kiên', 'phamvankien@example.com', '0900100131', '80 Phan Chu Trinh, Hà Nội', '2024-11-11', '2024-11-11'),
('CUS132', 'CUS132', 'Võ Văn Kiên', 'vovankien@example.com', '0900100132', '141 Nguyễn Du, Hà Nội', '2024-11-12', '2024-11-12'),
('CUS133', 'CUS133', 'Phan Thị Dung', 'phanthidung@example.com', '0900100133', '148 Trần Phú, Hà Nội', '2024-11-13', '2024-11-13'),
('CUS134', 'CUS134', 'Đặng Thị Hạnh', 'dặngthihanh@example.com', '0900100134', '95 Lý Thường Kiệt, Hà Nội', '2024-11-14', '2024-11-14'),
('CUS135', 'CUS135', 'Lê Thị Mai', 'lethimai@example.com', '0900100135', '44 Lê Lợi, Hà Nội', '2024-11-15', '2024-11-15'),
('CUS136', 'CUS136', 'Lê Văn Cường', 'levancuờng@example.com', '0900100136', '102 Nguyễn Trãi, Hà Nội', '2024-11-16', '2024-11-16'),
('CUS137', 'CUS137', 'Nguyễn Thị Thu', 'nguyễnthithu@example.com', '0900100137', '154 Trần Hưng Đạo, Hà Nội', '2024-11-17', '2024-11-17'),
('CUS138', 'CUS138', 'Nguyễn Thị Mai', 'nguyễnthimai@example.com', '0900100138', '103 Hai Bà Trưng, Hà Nội', '2024-11-18', '2024-11-18'),
('CUS139', 'CUS139', 'Trương Văn Phúc', 'truongvanphuc@example.com', '0900100139', '19 Bà Triệu, Hà Nội', '2024-11-19', '2024-11-19'),
('CUS140', 'CUS140', 'Nguyễn Thị Hạnh', 'nguyễnthihanh@example.com', '0900100140', '166 Phan Chu Trinh, Hà Nội', '2024-11-20', '2024-11-20'),
('CUS141', 'CUS141', 'Trần Thị Hạnh', 'trầnthihanh@example.com', '0900100141', '167 Nguyễn Du, Hà Nội', '2024-11-21', '2024-11-21'),
('CUS142', 'CUS142', 'Đỗ Thị Lan', 'dỗthilan@example.com', '0900100142', '111 Trần Phú, Hà Nội', '2024-11-22', '2024-11-22'),
('CUS143', 'CUS143', 'Đỗ Văn Cường', 'dỗvancuờng@example.com', '0900100143', '6 Lý Thường Kiệt, Hà Nội', '2024-11-23', '2024-11-23'),
('CUS144', 'CUS144', 'Trương Văn Quang', 'truongvanquang@example.com', '0900100144', '135 Lê Lợi, Hà Nội', '2024-11-24', '2024-11-24'),
('CUS145', 'CUS145', 'Nguyễn Văn Hoàng', 'nguyễnvanhoang@example.com', '0900100145', '77 Nguyễn Trãi, Hà Nội', '2024-11-25', '2024-11-25'),
('CUS146', 'CUS146', 'Đặng Thị Hạnh', 'dặngthihanh@example.com', '0900100146', '133 Trần Hưng Đạo, Hà Nội', '2024-11-26', '2024-11-26'),
('CUS147', 'CUS147', 'Võ Văn Tùng', 'vovantung@example.com', '0900100147', '111 Hai Bà Trưng, Hà Nội', '2024-11-27', '2024-11-27'),
('CUS148', 'CUS148', 'Hoàng Thị Bình', 'hoangthibinh@example.com', '0900100148', '133 Bà Triệu, Hà Nội', '2024-11-28', '2024-11-28'),
('CUS149', 'CUS149', 'Phan Thị Lan', 'phanthilan@example.com', '0900100149', '179 Phan Chu Trinh, Hà Nội', '2024-11-29', '2024-11-29'),
('CUS150', 'CUS150', 'Lê Văn Nam', 'levannam@example.com', '0900100150', '145 Nguyễn Du, Hà Nội', '2024-11-30', '2024-11-30'),
('CUS151', 'CUS151', 'Lê Thị Dung', 'lethidung@example.com', '0900100151', '130 Trần Phú, Hà Nội', '2024-11-01', '2024-11-01'),
('CUS152', 'CUS152', 'Hoàng Thị Mai', 'hoangthimai@example.com', '0900100152', '63 Lý Thường Kiệt, Hà Nội', '2024-11-02', '2024-11-02'),
('CUS153', 'CUS153', 'Lê Văn Huy', 'levanhuy@example.com', '0900100153', '35 Lê Lợi, Hà Nội', '2024-11-03', '2024-11-03'),
('CUS154', 'CUS154', 'Nguyễn Văn Bình', 'nguyễnvanbinh@example.com', '0900100154', '195 Nguyễn Trãi, Hà Nội', '2024-11-04', '2024-11-04'),
('CUS155', 'CUS155', 'Phan Thị Lan', 'phanthilan@example.com', '0900100155', '137 Trần Hưng Đạo, Hà Nội', '2024-11-05', '2024-11-05'),
('CUS156', 'CUS156', 'Đỗ Văn Đông', 'dỗvandong@example.com', '0900100156', '93 Hai Bà Trưng, Hà Nội', '2024-11-06', '2024-11-06'),
('CUS157', 'CUS157', 'Lê Thị Dung', 'lethidung@example.com', '0900100157', '102 Bà Triệu, Hà Nội', '2024-11-07', '2024-11-07'),
('CUS158', 'CUS158', 'Hoàng Thị Mai', 'hoangthimai@example.com', '0900100158', '101 Phan Chu Trinh, Hà Nội', '2024-11-08', '2024-11-08'),
('CUS159', 'CUS159', 'Trương Thị Thu', 'truongthithu@example.com', '0900100159', '41 Nguyễn Du, Hà Nội', '2024-11-09', '2024-11-09'),
('CUS160', 'CUS160', 'Đỗ Thị Bình', 'dỗthibinh@example.com', '0900100160', '24 Trần Phú, Hà Nội', '2024-11-10', '2024-11-10'),
('CUS161', 'CUS161', 'Đỗ Văn Quang', 'dỗvanquang@example.com', '0900100161', '48 Lý Thường Kiệt, Hà Nội', '2024-11-11', '2024-11-11'),
('CUS162', 'CUS162', 'Nguyễn Văn Bình', 'nguyễnvanbinh@example.com', '0900100162', '43 Lê Lợi, Hà Nội', '2024-11-12', '2024-11-12'),
('CUS163', 'CUS163', 'Phạm Văn Phúc', 'phamvanphuc@example.com', '0900100163', '200 Nguyễn Trãi, Hà Nội', '2024-11-13', '2024-11-13'),
('CUS164', 'CUS164', 'Phạm Văn Tùng', 'phamvantung@example.com', '0900100164', '133 Trần Hưng Đạo, Hà Nội', '2024-11-14', '2024-11-14'),
('CUS165', 'CUS165', 'Phan Văn Bình', 'phanvanbinh@example.com', '0900100165', '28 Hai Bà Trưng, Hà Nội', '2024-11-15', '2024-11-15'),
('CUS166', 'CUS166', 'Đỗ Văn An', 'dỗvanan@example.com', '0900100166', '170 Bà Triệu, Hà Nội', '2024-11-16', '2024-11-16'),
('CUS167', 'CUS167', 'Trần Thị Dung', 'trầnthidung@example.com', '0900100167', '115 Phan Chu Trinh, Hà Nội', '2024-11-17', '2024-11-17'),
('CUS168', 'CUS168', 'Trương Thị Bình', 'truongthibinh@example.com', '0900100168', '105 Nguyễn Du, Hà Nội', '2024-11-18', '2024-11-18'),
('CUS169', 'CUS169', 'Phan Thị Mai', 'phanthimai@example.com', '0900100169', '93 Trần Phú, Hà Nội', '2024-11-19', '2024-11-19'),
('CUS170', 'CUS170', 'Hoàng Văn Bình', 'hoangvanbinh@example.com', '0900100170', '161 Lý Thường Kiệt, Hà Nội', '2024-11-20', '2024-11-20'),
('CUS171', 'CUS171', 'Trần Thị Mai', 'trầnthimai@example.com', '0900100171', '129 Lê Lợi, Hà Nội', '2024-11-21', '2024-11-21'),
('CUS172', 'CUS172', 'Nguyễn Văn Quang', 'nguyễnvanquang@example.com', '0900100172', '46 Nguyễn Trãi, Hà Nội', '2024-11-22', '2024-11-22'),
('CUS173', 'CUS173', 'Trần Thị Ngọc', 'trầnthingoc@example.com', '0900100173', '17 Trần Hưng Đạo, Hà Nội', '2024-11-23', '2024-11-23'),
('CUS174', 'CUS174', 'Đặng Thị Lan', 'dặngthilan@example.com', '0900100174', '30 Hai Bà Trưng, Hà Nội', '2024-11-24', '2024-11-24'),
('CUS175', 'CUS175', 'Phạm Văn Hoàng', 'phamvanhoang@example.com', '0900100175', '26 Bà Triệu, Hà Nội', '2024-11-25', '2024-11-25'),
('CUS176', 'CUS176', 'Phạm Thị Hạnh', 'phamthihanh@example.com', '0900100176', '30 Phan Chu Trinh, Hà Nội', '2024-11-26', '2024-11-26'),
('CUS177', 'CUS177', 'Hoàng Thị Phương', 'hoangthiphuong@example.com', '0900100177', '56 Nguyễn Du, Hà Nội', '2024-11-27', '2024-11-27'),
('CUS178', 'CUS178', 'Phạm Văn Bình', 'phamvanbinh@example.com', '0900100178', '189 Trần Phú, Hà Nội', '2024-11-28', '2024-11-28'),
('CUS179', 'CUS179', 'Võ Thị Bình', 'vothibinh@example.com', '0900100179', '175 Lý Thường Kiệt, Hà Nội', '2024-11-29', '2024-11-29'),
('CUS180', 'CUS180', 'Võ Văn Huy', 'vovanhuy@example.com', '0900100180', '166 Lê Lợi, Hà Nội', '2024-11-30', '2024-11-30'),
('CUS181', 'CUS181', 'Võ Văn Bình', 'vovanbinh@example.com', '0900100181', '124 Nguyễn Trãi, Hà Nội', '2024-11-01', '2024-11-01'),
('CUS182', 'CUS182', 'Nguyễn Thị Hạnh', 'nguyễnthihanh@example.com', '0900100182', '97 Trần Hưng Đạo, Hà Nội', '2024-11-02', '2024-11-02'),
('CUS183', 'CUS183', 'Trương Thị Lan', 'truongthilan@example.com', '0900100183', '17 Hai Bà Trưng, Hà Nội', '2024-11-03', '2024-11-03'),
('CUS184', 'CUS184', 'Phan Thị Lan', 'phanthilan@example.com', '0900100184', '2 Bà Triệu, Hà Nội', '2024-11-04', '2024-11-04'),
('CUS185', 'CUS185', 'Võ Văn Huy', 'vovanhuy@example.com', '0900100185', '129 Phan Chu Trinh, Hà Nội', '2024-11-05', '2024-11-05'),
('CUS186', 'CUS186', 'Phạm Văn Huy', 'phamvanhuy@example.com', '0900100186', '159 Nguyễn Du, Hà Nội', '2024-11-06', '2024-11-06'),
('CUS187', 'CUS187', 'Hoàng Văn Huy', 'hoangvanhuy@example.com', '0900100187', '146 Trần Phú, Hà Nội', '2024-11-07', '2024-11-07'),
('CUS188', 'CUS188', 'Trần Văn Huy', 'trầnvanhuy@example.com', '0900100188', '170 Lý Thường Kiệt, Hà Nội', '2024-11-08', '2024-11-08'),
('CUS189', 'CUS189', 'Lê Thị Mai', 'lethimai@example.com', '0900100189', '69 Lê Lợi, Hà Nội', '2024-11-09', '2024-11-09'),
('CUS190', 'CUS190', 'Hoàng Văn Quang', 'hoangvanquang@example.com', '0900100190', '29 Nguyễn Trãi, Hà Nội', '2024-11-10', '2024-11-10'),
('CUS191', 'CUS191', 'Võ Văn Huy', 'vovanhuy@example.com', '0900100191', '54 Trần Hưng Đạo, Hà Nội', '2024-11-11', '2024-11-11'),
('CUS192', 'CUS192', 'Phan Thị Lan', 'phanthilan@example.com', '0900100192', '22 Hai Bà Trưng, Hà Nội', '2024-11-12', '2024-11-12'),
('CUS193', 'CUS193', 'Lê Thị Lan', 'lethilan@example.com', '0900100193', '154 Bà Triệu, Hà Nội', '2024-11-13', '2024-11-13'),
('CUS194', 'CUS194', 'Hoàng Văn Quang', 'hoangvanquang@example.com', '0900100194', '108 Phan Chu Trinh, Hà Nội', '2024-11-14', '2024-11-14'),
('CUS195', 'CUS195', 'Phạm Văn Phúc', 'phamvanphuc@example.com', '0900100195', '89 Nguyễn Du, Hà Nội', '2024-11-15', '2024-11-15'),
('CUS196', 'CUS196', 'Trần Thị Mai', 'trầnthimai@example.com', '0900100196', '144 Trần Phú, Hà Nội', '2024-11-16', '2024-11-16'),
('CUS197', 'CUS197', 'Trần Thị Dung', 'trầnthidung@example.com', '0900100197', '37 Lý Thường Kiệt, Hà Nội', '2024-11-17', '2024-11-17'),
('CUS198', 'CUS198', 'Phạm Văn Bình', 'phamvanbinh@example.com', '0900100198', '198 Lê Lợi, Hà Nội', '2024-11-18', '2024-11-18'),
('CUS199', 'CUS199', 'Nguyễn Thị Bình', 'nguyễnthibinh@example.com', '0900100199', '59 Nguyễn Trãi, Hà Nội', '2024-11-19', '2024-11-19'),
('CUS200', 'CUS200', 'Lê Thị Hạnh', 'lethihanh@example.com', '0900100200', '73 Trần Hưng Đạo, Hà Nội', '2024-11-20', '2024-11-20');

INSERT INTO orders (order_id, customer_id, order_date, completed_date, order_channel, direct_delivery, subtotal, shipping_cost, final_total, status, payment_status, payment_method, staff_id, delivery_staff_id)
VALUES
('ORD1','CUS1','2024-11-05 10:15:00','2024-11-06 14:20:00','Online',FALSE,6020000,20000,6040000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE01','SHIP01'),
('ORD2','CUS2','2024-11-07 11:30:00','2024-11-08 16:00:00','Trực tiếp',TRUE,3050000,0,3050000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD3','CUS3','2024-11-10 09:45:00','2024-11-11 12:30:00','Online',FALSE,420000,15000,435000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS03','SHIP02'),
('ORD4','CUS4','2024-11-12 14:00:00',NULL,'Trực tiếp',TRUE,3000000,0,3000000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE01',NULL),
('ORD5','CUS5','2024-11-15 13:20:00',NULL,'Trực tiếp',TRUE,2500000,0,2500000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE02',NULL),
('ORD6','CUS6','2024-11-16 10:30:00','2024-11-17 15:00:00','Online',FALSE,4500000,20000,4520000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS01','SHIP01'),
('ORD7','CUS7','2024-11-18 11:15:00',NULL,'Trực tiếp',TRUE,30200000,0,30200000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE01',NULL),
('ORD8','CUS8','2024-11-20 14:20:00','2024-11-21 16:45:00','Online',FALSE,520000,25000,545000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS02','SHIP02'),
('ORD9','CUS9','2024-11-22 09:50:00',NULL,'Trực tiếp',TRUE,280000,0,280000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE03',NULL),
('ORD10','CUS10','2024-11-24 13:10:00','2024-11-25 14:30:00','Online',FALSE,6000000,30000,6030000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS01','SHIP03'),
('ORD11','CUS11','2024-11-26 10:00:00',NULL,'Trực tiếp',TRUE,3100000,0,3100000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD12','CUS12','2024-11-28 15:30:00','2024-11-29 16:20:00','Online',FALSE,4000000,20000,4020000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS03','SHIP01'),

-- Tháng 12/2024 (CUS13 – CUS21)

('ORD13','CUS13','2024-12-02 09:15:00','2024-12-03 11:30:00','Online',FALSE,5000000,20000,5020000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS01','SHIP02'),
('ORD14','CUS14','2024-12-04 10:20:00',NULL,'Trực tiếp',TRUE,3500000,0,3500000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD15','CUS15','2024-12-06 11:45:00','2024-12-07 14:50:00','Online',FALSE,420000,15000,435000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS03','SHIP03'),
('ORD16','CUS16','2024-12-08 14:10:00',NULL,'Trực tiếp',TRUE,300000,0,300000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE01',NULL),
('ORD17','CUS17','2024-12-10 10:05:00','2024-12-11 13:20:00','Online',FALSE,460000,20000,480000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS02','SHIP01'),
('ORD18','CUS18','2024-12-12 12:30:00',NULL,'Trực tiếp',TRUE,3200000,0,3200000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL),
('ORD19','CUS19','2024-12-14 09:50:00','2024-12-15 11:40:00','Online',FALSE,510000,25000,535000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE01','SHIP02'),
('ORD20','CUS20','2024-12-16 15:10:00',NULL,'Trực tiếp',TRUE,28000000,0,28000000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD21','CUS21','2024-12-18 11:25:00','2024-12-19 13:30:00','Online',FALSE,600000,30000,630000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS03','SHIP03'),
('ORD22','CUS22','2025-01-03 09:30:00','2025-01-04 12:00:00','Online',FALSE,5000000,20000,5020000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS01','SHIP01'),
('ORD23','CUS23','2025-01-05 10:45:00',NULL,'Trực tiếp',TRUE,35000000,0,35000000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD24','CUS24','2025-01-07 11:50:00','2025-01-08 14:20:00','Online',FALSE,420000,15000,435000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS03','SHIP02'),
('ORD25','CUS25','2025-01-09 13:10:00',NULL,'Trực tiếp',TRUE,3000000,0,3000000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE01',NULL),
('ORD26','CUS26','2025-01-11 10:25:00','2025-01-12 12:50:00','Online',FALSE,460000,20000,480000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS02','SHIP03'),
('ORD27','CUS27','2025-01-13 14:30:00',NULL,'Trực tiếp',TRUE,3200000,0,3200000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL),
('ORD28','CUS28','2025-01-15 09:55:00','2025-01-16 11:40:00','Online',FALSE,510000,25000,535000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS01','SHIP01'),
('ORD29','CUS29','2025-01-17 15:05:00',NULL,'Trực tiếp',TRUE,2800000,0,2800000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD30','CUS30','2025-01-19 11:20:00','2025-01-20 13:10:00','Online',FALSE,6000000,30000,6030000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS03','SHIP02');

-- Tháng 02/2025 (CUS31 – CUS39)
INSERT INTO orders (order_id, customer_id, order_date, completed_date, order_channel, direct_delivery, subtotal, shipping_cost, final_total, status, payment_status, payment_method, staff_id, delivery_staff_id)
VALUES
('ORD31','CUS31','2025-02-01 09:00:00','2025-02-02 11:30:00','Online',FALSE,5020000,20000,5040000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS01','SHIP01'),
('ORD32','CUS32','2025-02-03 10:10:00',NULL,'Trực tiếp',TRUE,34000000,0,34000000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD33','CUS33','2025-02-05 11:20:00','2025-02-06 13:50:00','Online',FALSE,480000,15000,495000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03','SHIP02'),
('ORD34','CUS34','2025-02-07 14:30:00',NULL,'Trực tiếp',TRUE,310000,0,310000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE01',NULL),
('ORD35','CUS35','2025-02-09 09:45:00','2025-02-10 12:10:00','Online',FALSE,500000,20000,520000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS02','SHIP03'),
('ORD36','CUS36','2025-02-11 12:00:00',NULL,'Trực tiếp',TRUE,3300000,0,3300000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL),
('ORD37','CUS37','2025-02-13 10:15:00','2025-02-14 11:50:00','Online',FALSE,510000,25000,535000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS01','SHIP01'),
('ORD38','CUS38','2025-02-15 13:30:00',NULL,'Trực tiếp',TRUE,2900000,0,2900000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD39','CUS39','2025-02-17 11:40:00','2025-02-18 14:00:00','Online',FALSE,600000,30000,630000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','SALE03','SHIP02'),
('ORD40','CUS40','2025-03-01 09:20:00','2025-03-02 12:10:00','Online',FALSE,530000,20000,550000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS01','SHIP03'),
('ORD41','CUS41','2025-03-03 10:35:00',NULL,'Trực tiếp',TRUE,3600000,0,3600000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD42','CUS42','2025-03-05 11:50:00','2025-03-06 13:40:00','Online',FALSE,470000,15000,485000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS03','SHIP01'),
('ORD43','CUS43','2025-03-07 14:05:00',NULL,'Trực tiếp',TRUE,3200000,0,3200000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE01',NULL),
('ORD44','CUS44','2025-03-09 10:15:00','2025-03-10 12:50:00','Online',FALSE,500000,20000,520000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS02','SHIP02'),
('ORD45','CUS45','2025-03-11 12:30:00',NULL,'Trực tiếp',TRUE,3100000,0,3100000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL),
('ORD46','CUS46','2025-03-13 09:45:00','2025-03-14 11:30:00','Online',FALSE,520000,25000,545000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','SALE01','SHIP03'),
('ORD47','CUS47','2025-03-15 13:00:00',NULL,'Trực tiếp',TRUE,30000000,0,30000000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE02',NULL),
('ORD48','CUS48','2025-03-17 11:20:00','2025-03-18 13:10:00','Online',FALSE,6010000,30000,6040000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS03','SHIP01'),

-- Tháng 04/2025 (CUS49 – CUS57

('ORD49','CUS49','2025-04-01 09:10:00','2025-04-02 12:00:00','Online',FALSE,5040000,20000,5060000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS01','SHIP02'),
('ORD50','CUS50','2025-04-03 10:25:00',NULL,'Trực tiếp',TRUE,3500000,0,3500000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD51','CUS51','2025-04-05 11:40:00','2025-04-06 13:50:00','Online',FALSE,4080000,15000,4095000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS03','SHIP03'),
('ORD52','CUS52','2025-04-07 14:00:00',NULL,'Trực tiếp',TRUE,320000,0,320000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','OS01',NULL),
('ORD53','CUS53','2025-04-09 10:10:00','2025-04-10 12:40:00','Online',FALSE,5000000,20000,5020000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS02','SHIP01'),
('ORD54','CUS54','2025-04-11 12:30:00',NULL,'Trực tiếp',TRUE,3100000,0,3100000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL),
('ORD55','CUS55','2025-04-13 09:50:00','2025-04-14 11:45:00','Online',FALSE,5020000,25000,5045000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS01','SHIP02'),
('ORD56','CUS56','2025-04-15 13:10:00',NULL,'Trực tiếp',TRUE,300000,0,300000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE02',NULL),
('ORD57','CUS57','2025-04-17 11:25:00','2025-04-18 13:20:00','Online',FALSE,6010000,30000,6040000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS03','SHIP03'),
('ORD58','CUS58','2025-05-01 09:15:00','2025-05-02 11:30:00','Online',FALSE,530000,20000,550000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS01','SHIP01'),
('ORD59','CUS59','2025-05-03 10:20:00',NULL,'Trực tiếp',TRUE,360000,0,360000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD60','CUS60','2025-05-05 11:45:00','2025-05-06 14:00:00','Online',FALSE,4080000,15000,4095000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS03','SHIP02'),
('ORD61','CUS61','2025-05-07 14:00:00',NULL,'Trực tiếp',TRUE,320000,0,320000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE01',NULL),
('ORD62','CUS62','2025-05-09 10:10:00','2025-05-10 12:40:00','Online',FALSE,5000000,20000,5020000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS02','SHIP03'),
('ORD63','CUS63','2025-05-11 12:30:00',NULL,'Trực tiếp',TRUE,310000,0,310000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL),
('ORD64','CUS64','2025-05-13 09:50:00','2025-05-14 11:45:00','Online',FALSE,5020000,25000,5045000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS01','SHIP01'),
('ORD65','CUS65','2025-05-15 13:10:00',NULL,'Trực tiếp',TRUE,3000000,0,3000000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE02',NULL),
('ORD66','CUS66','2025-05-17 11:25:00','2025-05-18 13:20:00','Online',FALSE,6010000,30000,6040000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS03','SHIP02'),
('ORD67','CUS67','2025-06-01 09:20:00','2025-06-02 12:10:00','Online',FALSE,530000,20000,550000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS01','SHIP03'),
('ORD68','CUS68','2025-06-03 10:35:00',NULL,'Trực tiếp',TRUE,3600000,0,3600000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD69','CUS69','2025-06-05 11:50:00','2025-06-06 13:40:00','Online',FALSE,4070000,15000,4085000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03','SHIP01'),
('ORD70','CUS70','2025-06-07 14:05:00',NULL,'Trực tiếp',TRUE,3200000,0,3200000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE01',NULL),
('ORD71','CUS71','2025-06-09 10:15:00','2025-06-10 12:50:00','Online',FALSE,5000000,20000,5020000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS02','SHIP02'),
('ORD72','CUS72','2025-06-11 12:30:00',NULL,'Trực tiếp',TRUE,3100000,0,3100000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL),
('ORD73','CUS73','2025-06-13 09:50:00','2025-06-14 11:45:00','Online',FALSE,5200000,25000,5045000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS01','SHIP03'),
('ORD74','CUS74','2025-06-15 13:10:00',NULL,'Trực tiếp',TRUE,3000000,0,3000000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE02',NULL),
('ORD75','CUS75','2025-06-17 11:25:00','2025-06-18 13:20:00','Online',FALSE,6010000,30000,6040000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS03','SHIP01'),
('ORD76','CUS76','2025-07-01 09:15:00','2025-07-02 11:30:00','Online',FALSE,5030000,20000,5050000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS01','SHIP02'),
('ORD77','CUS77','2025-07-03 10:20:00',NULL,'Trực tiếp',TRUE,360000,0,360000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD78','CUS78','2025-07-05 11:45:00','2025-07-06 14:00:00','Online',FALSE,4800000,15000,4815000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS03','SHIP03'),
('ORD79','CUS79','2025-07-07 14:00:00',NULL,'Trực tiếp',TRUE,3200000,0,3200000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE01',NULL),
('ORD80','CUS80','2025-07-09 10:10:00','2025-07-10 12:40:00','Online',FALSE,500000,20000,520000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS02','SHIP01');
INSERT INTO orders (order_id, customer_id, order_date, completed_date, order_channel, direct_delivery, subtotal, shipping_cost, final_total, status, payment_status, payment_method, staff_id, delivery_staff_id)
VALUES
('ORD81','CUS81','2025-07-11 12:30:00',NULL,'Trực tiếp',TRUE,310000,0,310000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL),
('ORD82','CUS82','2025-07-13 09:50:00','2025-07-14 11:45:00','Online',FALSE,520000,25000,545000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS01','SHIP02'),
('ORD83','CUS83','2025-07-15 13:10:00',NULL,'Trực tiếp',TRUE,300000,0,300000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE02',NULL),
('ORD84','CUS84','2025-07-17 11:25:00','2025-07-18 13:20:00','Online',FALSE,610000,30000,640000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS03','SHIP03'),
('ORD85','CUS85','2025-07-18 09:20:00','2025-07-20 12:10:00','Online',FALSE,530000,20000,550000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS01','SHIP01'),
('ORD86','CUS86','2025-07-19 10:35:00',NULL,'Trực tiếp',TRUE,360000,0,360000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD87','CUS87','2025-07-29 11:50:00','2025-07-30 13:40:00','Online',FALSE,470000,15000,485000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS03','SHIP02'),
('ORD88','CUS88','2025-07-30 14:05:00',NULL,'Trực tiếp',TRUE,320000,0,320000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE01',NULL),
('ORD89','CUS89','2025-07-30 10:15:00','2025-07-31 12:50:00','Online',FALSE,500000,20000,520000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS02','SHIP03'),
('ORD90','CUS90','2025-07-31 12:30:00',NULL,'Trực tiếp',TRUE,310000,0,310000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL);
-- Tháng 08/2025 (CUS85 – CUS93)
INSERT INTO orders (order_id, customer_id, order_date, completed_date, order_channel, direct_delivery, subtotal, shipping_cost, final_total, status, payment_status, payment_method, staff_id, delivery_staff_id)
VALUES
('ORD91','CUS91','2025-08-13 09:50:00','2025-08-14 11:45:00','Online',FALSE,520000,25000,545000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS01','SHIP01'),
('ORD92','CUS92','2025-08-15 13:10:00',NULL,'Trực tiếp',TRUE,30000000,0,30000000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE02',NULL),
('ORD93','CUS93','2025-08-17 11:25:00','2025-08-18 13:20:00','Online',FALSE,610000,30000,640000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS03','SHIP02'),
('ORD94','CUS94','2025-09-01 09:15:00','2025-09-02 11:30:00','Online',FALSE,530000,20000,550000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS01','SHIP03'),
('ORD95','CUS95','2025-09-03 10:20:00',NULL,'Trực tiếp',TRUE,360000,0,360000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD96','CUS96','2025-09-05 11:45:00','2025-09-06 14:00:00','Online',FALSE,480000,15000,495000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS03','SHIP01'),
('ORD97','CUS97','2025-09-07 14:00:00',NULL,'Trực tiếp',TRUE,320000,0,320000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE01',NULL),
('ORD98','CUS98','2025-09-09 10:10:00','2025-09-10 12:40:00','Online',FALSE,500000,20000,520000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS02','SHIP02'),
('ORD99','CUS99','2025-09-11 12:30:00',NULL,'Trực tiếp',TRUE,310000,0,310000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL),
('ORD100','CUS100','2025-09-13 09:50:00','2025-09-14 11:45:00','Online',FALSE,520000,25000,545000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS01','SHIP03'),
('ORD101','CUS101','2025-09-15 13:10:00',NULL,'Trực tiếp',TRUE,30000000,0,30000000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE02',NULL),
('ORD102','CUS102','2025-09-17 11:25:00','2025-09-18 13:20:00','Online',FALSE,610000,30000,640000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS03','SHIP01'),


-- Tháng 10/2025 (CUS103 – CUS111)

('ORD103','CUS103','2025-10-01 09:20:00','2025-10-02 12:10:00','Online',FALSE,530000,20000,550000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS01','SHIP02'),
('ORD104','CUS104','2025-10-03 10:35:00',NULL,'Trực tiếp',TRUE,360000,0,360000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD105','CUS105','2025-10-05 11:50:00','2025-10-06 13:40:00','Online',FALSE,470000,15000,485000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS03','SHIP03'),
('ORD106','CUS106','2025-10-07 14:05:00',NULL,'Trực tiếp',TRUE,320000,0,320000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE01',NULL),
('ORD107','CUS107','2025-10-09 10:15:00','2025-10-10 12:50:00','Online',FALSE,500000,20000,520000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS02','SHIP01'),
('ORD108','CUS108','2025-10-11 12:30:00',NULL,'Trực tiếp',TRUE,310000,0,310000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL),
('ORD109','CUS109','2025-10-13 09:50:00','2025-10-14 11:45:00','Online',FALSE,520000,25000,545000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS01','SHIP02'),
('ORD110','CUS110','2025-10-15 13:10:00',NULL,'Trực tiếp',TRUE,300000,0,300000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE02',NULL),
('ORD111','CUS111','2025-10-17 11:25:00','2025-10-18 13:20:00','Online',FALSE,610000,30000,640000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS03','SHIP03'),
('ORD112','CUS112','2025-10-21 09:15:00','2025-10-22 11:30:00','Online',FALSE,530000,20000,550000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS01','SHIP01'),
('ORD113','CUS113','2025-10-23 10:20:00',NULL,'Trực tiếp',TRUE,36000000,0,36000000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD114','CUS114','2025-10-25 11:45:00','2025-10-26 14:00:00','Online',FALSE,480000,15000,495000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS03','SHIP02'),
('ORD115','CUS115','2025-10-27 14:00:00',NULL,'Trực tiếp',TRUE,320000,0,320000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE01',NULL);
-- tháng 11/2025
INSERT INTO `orders` 
(order_id, customer_id, order_date, completed_date, order_channel, direct_delivery, subtotal, shipping_cost, final_total, status, payment_status, payment_method, staff_id, delivery_staff_id)
VALUES
-- Đơn tháng 11/2025
('ORD116','CUS116','2025-11-15 09:30:00',NULL,'Online',FALSE,500000,20000,520000,'Đang Giao','Chưa Thanh Toán','Tiền mặt','OS02','SHIP01'),
('ORD117','CUS117','2025-11-16 10:10:00','2025-11-16 10:10:00','Trực tiếp',TRUE,450000,0,450000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL),
('ORD118','CUS101','2025-11-17 12:20:00','2025-11-18 13:45:00','Online',FALSE,600000,25000,625000,'Hoàn Thành','Đã Thanh Toán','Thẻ tín dụng','OS01','SHIP02'),
('ORD119','CUS102','2025-11-18 09:50:00','2025-11-18 09:50:00','Trực tiếp',TRUE,30000000,0,30000000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE01',NULL),
('ORD120','CUS103','2025-11-19 11:15:00',NULL,'Online',FALSE,520000,20000,540000,'Đang Xử Lý','Chưa Thanh Toán','Tiền mặt','OS03','SHIP03'),
('ORD121','CUS104','2025-11-20 10:30:00','2025-11-20 10:30:00','Trực tiếp',TRUE,370000,0,370000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE02',NULL),
('ORD122','CUS105','2025-11-21 14:10:00','2025-11-22 12:50:00','Online',FALSE,550000,15000,565000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','OS02','SHIP01'),
('ORD123','CUS106','2025-11-22 09:05:00','2025-11-22 09:05:00','Trực tiếp',TRUE,31000000,0,31000000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL),
('ORD124','CUS107','2025-11-23 13:25:00',NULL,'Online',FALSE,480000,20000,500000,'Đang Giao','Chưa Thanh Toán','Thẻ tín dụng','OS01','SHIP02'),
('ORD125','CUS108','2025-11-24 10:45:00','2025-11-24 10:45:00','Trực tiếp',TRUE,40000000,0,40000000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE01',NULL),
('ORD126','CUS109','2025-11-25 11:55:00','2025-11-26 13:30:00','Online',FALSE,6000000,25000,6025000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','OS03','SHIP03'),
('ORD127','CUS110','2025-11-26 09:40:00','2025-11-26 09:40:00','Trực tiếp',TRUE,350000,0,350000,'Hoàn Thành','Đã Thanh Toán','Chuyển khoản','SALE02',NULL),
('ORD128','CUS111','2025-11-26 10:50:00',NULL,'Online',FALSE,500000,20000,520000,'Đang Xử Lý','Chưa Thanh Toán','Tiền mặt','OS01','SHIP01'),
('ORD129','CUS112','2025-11-26 12:30:00','2025-11-26 12:30:00','Trực tiếp',TRUE,450000,0,450000,'Hoàn Thành','Đã Thanh Toán','Tiền mặt','SALE03',NULL),
('ORD130','CUS113','2025-11-26 09:15:00',NULL,'Online',FALSE,520000,20000,540000,'Đang Giao','Chưa Thanh Toán','Thẻ tín dụng','OS02','SHIP02');

INSERT INTO order_details (order_id, product_id, quantity, price_at_order) VALUES
('ORD1','P0148',2,55887),
('ORD1','P0001',2,120000),
('ORD1','P0177',5,113425),
('ORD1','P0112',4,65627),
('ORD2','P0038',1,89650),
('ORD2','P0034',1,111521),
('ORD2','P0167',2,132690),
('ORD2','P0110',4,88077),
('ORD2','P0156',4,133895),
('ORD3','P0008',1,131619),
('ORD3','P0044',5,51606),
('ORD3','P0099',2,159078),
('ORD4','P0041',5,190486),
('ORD4','P0059',2,178216),
('ORD4','P0087',1,100212),
('ORD5','P0133',1,172240),
('ORD5','P0014',3,133263),
('ORD5','P0180',4,60825),
('ORD5','P0168',3,137491),
('ORD6','P0032',4,194035),
('ORD6','P0081',5,108686),
('ORD6','P0075',4,192852),
('ORD6','P0119',4,68035),
('ORD6','P0072',5,94702),
('ORD7','P0085',3,109626),
('ORD7','P0126',3,110767),
('ORD7','P0060',5,110534),
('ORD8','P0048',3,175605),
('ORD8','P0132',5,153198),
('ORD8','P0061',2,92664),
('ORD9','P0058',1,136313),
('ORD9','P0145',4,111045),
('ORD9','P0140',3,153159),
('ORD10','P0063',5,116285),
('ORD10','P0161',4,94945),
('ORD10','P0111',3,87305),
('ORD10','P0032',1,91453),
('ORD10','P0072',4,96056),
('ORD11','P0058',3,175882),
('ORD11','P0038',1,113466),
('ORD11','P0065',1,119562),
('ORD11','P0054',4,64221),
('ORD11','P0027',5,70464),
('ORD12','P0039',4,56936),
('ORD12','P0162',5,72290),
('ORD12','P0077',5,128673),
('ORD12','P0090',2,110538),
('ORD12','P0009',1,114713),
('ORD13','P0069',5,87979),
('ORD13','P0007',1,146928),
('ORD13','P0106',2,55068),
('ORD14','P0058',3,147888),
('ORD14','P0040',4,72116),
('ORD14','P0131',3,169000),
('ORD15','P0038',4,65295),
('ORD15','P0091',2,154335),
('ORD15','P0142',4,177533),
('ORD16','P0050',2,178226),
('ORD16','P0124',5,165026),
('ORD16','P0098',4,166259),
('ORD16','P0027',5,198881),
('ORD16','P0149',5,192977),
('ORD17','P0097',5,129142),
('ORD17','P0085',4,170896),
('ORD17','P0058',3,186598),
('ORD17','P0123',4,120358),
('ORD17','P0033',1,74750),
('ORD18','P0070',4,106930),
('ORD18','P0005',1,75428),
('ORD18','P0164',2,165058),
('ORD19','P0062',2,52040),
('ORD19','P0029',5,144632),
('ORD19','P0124',2,165149),
('ORD19','P0160',5,196906),
('ORD19','P0021',4,170806),
('ORD20','P0080',2,145815),
('ORD20','P0037',2,121555),
('ORD20','P0178',5,159672),
('ORD20','P0119',2,189035),
('ORD21','P0093',3,126502),
('ORD21','P0134',3,170312),
('ORD21','P0164',4,116893),
('ORD22','P0035',4,155906),
('ORD22','P0005',1,154854),
('ORD22','P0164',2,118813),
('ORD22','P0158',2,61495),
('ORD23','P0152',5,128788),
('ORD23','P0158',4,137075),
('ORD23','P0082',4,131282),
('ORD24','P0036',4,150634),
('ORD24','P0144',3,54534),
('ORD24','P0094',4,169993),
('ORD24','P0146',5,124070),
('ORD24','P0177',3,56411),
('ORD25','P0063',3,154798),
('ORD25','P0112',1,124505),
('ORD25','P0102',1,57868),
('ORD26','P0039',5,90287),
('ORD26','P0107',2,125730),
('ORD26','P0126',1,88791),
('ORD27','P0116',4,63628),
('ORD27','P0166',5,86855),
('ORD27','P0037',3,197775),
('ORD27','P0050',3,118936),
('ORD27','P0066',5,169130),
('ORD28','P0043',3,56116),
('ORD28','P0175',5,116496),
('ORD28','P0024',5,109668),
('ORD28','P0068',1,61297),
('ORD28','P0026',3,178654),
('ORD29','P0172',3,188652),
('ORD29','P0133',5,169181),
('ORD29','P0029',3,150199),
('ORD29','P0139',2,51843),
('ORD29','P0148',2,119537),
('ORD30','P0078',3,125973),
('ORD30','P0100',2,56017),
('ORD30','P0123',3,76204),
('ORD30','P0169',5,133615),
('ORD31','P0153',1,101443),
('ORD31','P0131',5,98564),
('ORD31','P0155',3,101796),
('ORD31','P0115',1,163696),
('ORD31','P0137',4,143272),
('ORD32','P0169',5,147868),
('ORD32','P0134',1,167413),
('ORD32','P0019',5,147448),
('ORD32','P0092',5,111198),
('ORD33','P0007',3,94518),
('ORD33','P0144',2,132515),
('ORD33','P0082',5,58677),
('ORD33','P0059',5,162358),
('ORD33','P0053',1,192221),
('ORD34','P0074',2,152960),
('ORD34','P0096',5,123204),
('ORD34','P0085',4,128178),
('ORD35','P0152',3,154175),
('ORD35','P0147',2,145412),
('ORD35','P0100',1,170828),
('ORD35','P0064',2,150085),
('ORD36','P0151',3,58786),
('ORD36','P0054',2,126334),
('ORD36','P0165',1,135214),
('ORD36','P0085',5,112986),
('ORD36','P0058',4,137273),
('ORD37','P0139',2,74135),
('ORD37','P0118',1,79301),
('ORD37','P0053',1,105878),
('ORD37','P0090',4,150185),
('ORD38','P0169',5,187513),
('ORD38','P0165',3,57174),
('ORD38','P0178',5,82641),
('ORD38','P0160',5,180517),
('ORD39','P0057',1,132221),
('ORD39','P0158',1,169592),
('ORD39','P0008',3,104373),
('ORD39','P0120',3,139793),
('ORD39','P0034',4,102123),
('ORD40','P0104',4,134404),
('ORD40','P0036',1,104778),
('ORD40','P0075',4,164019),
('ORD40','P0078',5,96727),
('ORD40','P0114',1,59873),
('ORD41','P0088',3,168201),
('ORD41','P0063',3,113824),
('ORD41','P0047',4,148284),
('ORD41','P0141',3,114490),
('ORD41','P0069',5,181753),
('ORD42','P0059',1,161512),
('ORD42','P0047',3,183665),
('ORD42','P0099',5,145754),
('ORD42','P0053',5,95441),
('ORD42','P0101',5,174475),
('ORD43','P0121',5,122946),
('ORD43','P0084',1,152453),
('ORD43','P0013',5,169830),
('ORD43','P0033',5,108377),
('ORD44','P0121',5,164547),
('ORD44','P0116',1,79749),
('ORD44','P0084',3,70470),
('ORD45','P0064',2,108262),
('ORD45','P0168',4,149514),
('ORD45','P0029',1,197167),
('ORD45','P0124',1,124311),
('ORD45','P0117',5,61080),
('ORD46','P0101',1,154344),
('ORD46','P0091',5,167268),
('ORD46','P0035',2,94901),
('ORD46','P0099',5,191370),
('ORD46','P0178',1,61425),
('ORD47','P0157',2,174057),
('ORD47','P0113',3,56627),
('ORD47','P0085',2,170257),
('ORD47','P0148',1,113247),
('ORD48','P0158',4,76946),
('ORD48','P0111',1,169172),
('ORD48','P0058',2,128202),
('ORD48','P0156',1,99634),
('ORD48','P0057',3,81632),
('ORD49','P0163',2,199850),
('ORD49','P0004',1,142160),
('ORD49','P0073',4,148122),
('ORD50','P0036',4,137051),
('ORD50','P0142',1,166181),
('ORD50','P0122',1,196832),
('ORD51','P0114',4,80394),
('ORD51','P0125',5,122297),
('ORD51','P0005',3,84867),
('ORD51','P0160',2,73460),
('ORD52','P0043',1,57335),
('ORD52','P0131',1,52316),
('ORD52','P0134',2,139760),
('ORD52','P0175',5,63595),
('ORD53','P0137',3,158207),
('ORD53','P0044',2,79998),
('ORD53','P0170',5,116178),
('ORD53','P0072',4,84750),
('ORD53','P0008',3,107339),
('ORD54','P0038',3,162856),
('ORD54','P0031',2,96823),
('ORD54','P0173',2,161989),
('ORD54','P0072',5,66439),
('ORD55','P0046',5,92631),
('ORD55','P0003',4,136310),
('ORD55','P0088',2,191772),
('ORD56','P0159',4,176910),
('ORD56','P0142',1,193153),
('ORD56','P0091',5,171137),
('ORD57','P0042',3,96689),
('ORD57','P0052',5,128212),
('ORD57','P0179',1,176374),
('ORD57','P0004',5,189761),
('ORD57','P0105',3,90032),
('ORD58','P0131',5,155545),
('ORD58','P0125',3,181249),
('ORD58','P0163',3,112661),
('ORD58','P0164',1,108930),
('ORD58','P0132',1,92598),
('ORD59','P0151',1,177035),
('ORD59','P0162',4,64367),
('ORD59','P0001',2,123865),
('ORD60','P0037',2,107886),
('ORD60','P0125',2,147494),
('ORD60','P0036',5,136565),
('ORD60','P0071',1,55069),
('ORD61','P0096',3,62775),
('ORD61','P0022',4,160728),
('ORD61','P0005',4,93898),
('ORD61','P0053',5,100094),
('ORD62','P0117',1,131196),
('ORD62','P0088',4,92026),
('ORD62','P0123',2,132534),
('ORD62','P0084',3,97279),
('ORD62','P0113',3,150815),
('ORD63','P0144',2,147890),
('ORD63','P0096',3,123534),
('ORD63','P0004',2,170143),
('ORD63','P0013',2,78955),
('ORD64','P0119',3,141289),
('ORD64','P0164',1,53242),
('ORD64','P0118',2,52472),
('ORD64','P0044',5,109420),
('ORD64','P0175',5,134120),
('ORD65','P0107',5,156163),
('ORD65','P0149',3,135288),
('ORD65','P0162',4,170888),
('ORD66','P0012',1,174087),
('ORD66','P0110',1,119163),
('ORD66','P0043',2,145897),
('ORD66','P0014',4,51935),
('ORD67','P0150',4,133469),
('ORD67','P0085',1,106015),
('ORD67','P0158',1,95528),
('ORD67','P0088',1,90778),
('ORD68','P0115',3,171226),
('ORD68','P0023',1,176704),
('ORD68','P0067',3,133251),
('ORD69','P0151',5,60224),
('ORD69','P0159',1,96508),
('ORD69','P0067',4,128087),
('ORD70','P0007',3,192855),
('ORD70','P0093',1,154766),
('ORD70','P0140',3,65169),
('ORD70','P0054',2,74634),
('ORD71','P0061',4,154874),
('ORD71','P0045',1,120838),
('ORD71','P0173',4,182197),
('ORD72','P0176',4,68939),
('ORD72','P0050',3,82295),
('ORD72','P0028',5,145049),
('ORD73','P0040',1,174974),
('ORD73','P0134',4,165238),
('ORD73','P0112',1,150698),
('ORD74','P0055',5,173872),
('ORD74','P0051',3,96138),
('ORD74','P0011',4,134860),
('ORD75','P0083',3,197187),
('ORD75','P0113',4,188420),
('ORD75','P0174',1,189943),
('ORD75','P0122',2,64626),
('ORD75','P0152',3,124856),
('ORD76','P0049',2,58099),
('ORD76','P0017',3,119143),
('ORD76','P0151',5,114667),
('ORD77','P0162',2,139794),
('ORD77','P0043',4,198317),
('ORD77','P0101',5,77762),
('ORD77','P0171',1,199309),
('ORD78','P0080',2,136103),
('ORD78','P0095',1,184252),
('ORD78','P0015',1,59280),
('ORD78','P0130',3,59047),
('ORD79','P0036',4,183417),
('ORD79','P0140',3,182645),
('ORD79','P0151',3,103118),
('ORD80','P0122',1,174981),
('ORD80','P0065',1,178647),
('ORD80','P0064',3,174942),
('ORD81','P0063',2,81132),
('ORD81','P0171',1,69557),
('ORD81','P0065',2,63621),
('ORD81','P0086',3,191612),
('ORD82','P0095',2,80042),
('ORD82','P0157',3,69728),
('ORD82','P0137',3,169922),
('ORD82','P0155',4,135320),
('ORD82','P0050',5,52430),
('ORD83','P0052',3,77439),
('ORD83','P0123',5,143452),
('ORD83','P0176',1,188814),
('ORD83','P0172',3,61514),
('ORD84','P0046',2,156705),
('ORD84','P0073',1,77602),
('ORD84','P0086',5,85264),
('ORD84','P0082',5,97946),
('ORD85','P0134',2,146098),
('ORD85','P0087',3,112801),
('ORD85','P0027',3,155740),
('ORD86','P0113',5,166078),
('ORD86','P0159',3,105838),
('ORD86','P0114',4,68274),
('ORD86','P0135',3,136029),
('ORD86','P0175',5,90513),
('ORD87','P0072',2,111374),
('ORD87','P0128',1,69618),
('ORD87','P0049',1,193469),
('ORD87','P0096',4,91772),
('ORD87','P0131',3,146149),
('ORD88','P0004',5,110967),
('ORD88','P0073',5,176911),
('ORD88','P0022',4,180443),
('ORD88','P0066',5,57430),
('ORD88','P0036',5,113898),
('ORD89','P0090',4,75094),
('ORD89','P0026',4,118885),
('ORD89','P0096',1,123465),
('ORD89','P0108',3,173617),
('ORD89','P0148',2,105974),
('ORD90','P0139',5,82581),
('ORD90','P0042',1,54741),
('ORD90','P0023',5,161486),
('ORD91','P0177',4,118781),
('ORD91','P0058',5,154919),
('ORD91','P0047',4,184446),
('ORD92','P0044',4,69067),
('ORD92','P0131',2,122176),
('ORD92','P0169',2,61541),
('ORD92','P0088',3,71904),
('ORD93','P0027',4,148091),
('ORD93','P0021',5,60979),
('ORD93','P0077',2,50251),
('ORD94','P0165',2,178653),
('ORD94','P0022',1,75261),
('ORD94','P0084',1,148003),
('ORD94','P0047',2,142277),
('ORD95','P0107',3,90568),
('ORD95','P0073',1,50178),
('ORD95','P0022',3,132756),
('ORD95','P0034',3,129722),
('ORD95','P0045',3,91088),
('ORD96','P0126',2,132407),
('ORD96','P0089',4,141763),
('ORD96','P0023',4,67883),
('ORD96','P0026',3,144328),
('ORD96','P0062',3,185880),
('ORD97','P0012',5,113863),
('ORD97','P0146',4,84310),
('ORD97','P0087',1,56716),
('ORD98','P0115',5,85040),
('ORD98','P0037',2,174975),
('ORD98','P0083',1,108142),
('ORD98','P0047',1,133150),
('ORD99','P0164',2,115403),
('ORD99','P0156',1,133313),
('ORD99','P0006',4,120666),
('ORD99','P0098',5,149099),
('ORD99','P0160',5,192509),
('ORD100','P0034',5,55209),
('ORD100','P0068',1,183175),
('ORD100','P0079',2,169819),
('ORD100','P0175',1,89985),
('ORD101','P0036',5,146594),
('ORD101','P0026',1,163783),
('ORD101','P0158',5,158123),
('ORD101','P0083',3,60785),
('ORD101','P0134',1,135067),
('ORD102','P0153',2,89627),
('ORD102','P0130',4,78429),
('ORD102','P0029',4,175488),
('ORD103','P0118',1,53609),
('ORD103','P0162',1,65476),
('ORD103','P0160',3,118162),
('ORD104','P0164',4,195182),
('ORD104','P0136',2,56139),
('ORD104','P0055',4,152753),
('ORD104','P0123',4,146480),
('ORD105','P0173',5,196078),
('ORD105','P0101',2,93665),
('ORD105','P0128',1,160783),
('ORD106','P0166',4,101562),
('ORD106','P0093',1,153079),
('ORD106','P0046',2,123791),
('ORD106','P0045',4,126532),
('ORD107','P0042',1,114247),
('ORD107','P0165',4,120368),
('ORD107','P0089',4,107718),
('ORD108','P0092',1,96662),
('ORD108','P0178',3,87968),
('ORD108','P0061',2,147334),
('ORD109','P0075',3,62038),
('ORD109','P0020',3,60070),
('ORD109','P0137',4,63726),
('ORD109','P0033',4,161675),
('ORD110','P0087',1,170386),
('ORD110','P0118',2,126459),
('ORD110','P0082',3,50817),
('ORD110','P0048',1,176512),
('ORD110','P0147',5,190219),
('ORD111','P0148',4,178708),
('ORD111','P0162',3,129716),
('ORD111','P0092',3,113479),
('ORD111','P0165',4,187558),
('ORD112','P0143',2,117773),
('ORD112','P0081',2,96309),
('ORD112','P0166',2,87462),
('ORD112','P0064',2,112210),
('ORD112','P0025',5,134817),
('ORD113','P0087',3,58573),
('ORD113','P0056',4,140648),
('ORD113','P0168',4,80031),
('ORD113','P0017',5,181655),
('ORD113','P0005',3,121637),
('ORD114','P0148',4,175296),
('ORD114','P0066',2,196644),
('ORD114','P0065',3,161542),
('ORD114','P0069',3,108976),
('ORD115','P0146',2,80982),
('ORD115','P0091',4,131068),
('ORD115','P0139',4,171701),
('ORD115','P0120',1,87525),
('ORD115','P0140',1,55024),
('ORD115','P0156',1,154663),
('ORD115','P0160',1,96422),
('ORD116','P0028',1,81088),
('ORD116','P0094',1,101760),
('ORD116','P0022',1,104351),
('ORD116','P0046',1,137854),
('ORD116','P0061',2,170510),
('ORD116','P0167',2,64306),
-- ORD117
('ORD117','P0011',1,150000),
-- ORD118
('ORD118','P0010',2,1200000),
('ORD118','P0009',1,80000),
-- ORD119
('ORD119','P0001',1,100000),
-- ORD120
('ORD120','P0003',2,120000),
('ORD120','P0012',1,120000),
-- ORD121
('ORD121','P0006',1,60000),
-- ORD122
('ORD122','P0014',2,80000),
('ORD122','P0015',1,20000),
-- ORD123
('ORD123','P0016',1,100000),
-- ORD124
('ORD124','P0017',2,700000),
('ORD124','P0018',1,500000),
-- ORD125
('ORD125','P0004',1,15000),
-- ORD126
('ORD126','P0008',2,50000),
('ORD126','P0009',1,80000),
-- ORD127
('ORD127','P0011',1,150000),
-- ORD128
('ORD128','P0012',2,120000),
('ORD128','P0013',1,150000),
-- ORD129
('ORD129','P0002',1,300000),
-- ORD130
('ORD130','P0005',2,15000),
('ORD130','P0006',1,60000);
-- Bật lại kiểm tra khóa ngoại
-- 1. Thêm cột full_name vào bảng users
SET SQL_SAFE_UPDATES = 0;


-- 2. Cập nhật dữ liệu tên cho tài khoản OS01 (để đăng nhập không bị lỗi hiển thị)

SET SQL_SAFE_UPDATES = 1;
SET FOREIGN_KEY_CHECKS = 1;




-- ================================================================
-- MIGRATION: Optional product variant support
-- Purpose: add `product_variants` table and link existing stock/order details
-- IMPORTANT: Backup your database before running these statements.
-- Run on staging first. Some steps are destructive if you drop columns.
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1) Create product_variants table (stores per-size/color variants)
CREATE TABLE IF NOT EXISTS `product_variants` (
  `variant_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` VARCHAR(20) NOT NULL,
  `sku` VARCHAR(64) DEFAULT NULL,
  `size` VARCHAR(64) DEFAULT NULL,
  `color` VARCHAR(128) DEFAULT NULL,
  `price` DECIMAL(18,2) NOT NULL,
  `cost_price` DECIMAL(18,2) NOT NULL,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_variant_product (`product_id`),
  UNIQUE KEY uq_product_variant (`product_id`,`size`,`color`),
  CONSTRAINT fk_variant_product FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Create a default variant for every existing product.
--    This preserves current behavior: a product without explicit variants becomes one default variant.
INSERT INTO product_variants (product_id, sku, size, color, price, cost_price, stock_quantity)
SELECT product_id, CONCAT(product_id,'-DEF'), NULL, NULL, price, cost_price, stock_quantity
FROM products
ON DUPLICATE KEY UPDATE price=VALUES(price), cost_price=VALUES(cost_price);

-- 3) Add nullable `variant_id` to stock_in_details and order_details to preserve history.
ALTER TABLE `stock_in_details` 
  ADD COLUMN `variant_id` BIGINT UNSIGNED NULL AFTER `product_id`;

ALTER TABLE `order_details`
  ADD COLUMN `variant_id` BIGINT UNSIGNED NULL AFTER `product_id`;

-- 4) Populate `variant_id` for existing stock_in_details and order_details using default variant created above.
UPDATE `stock_in_details` sid
JOIN `product_variants` pv ON pv.product_id = sid.product_id
SET sid.variant_id = pv.variant_id
WHERE sid.variant_id IS NULL;

UPDATE `order_details` od
JOIN `product_variants` pv ON pv.product_id = od.product_id
SET od.variant_id = pv.variant_id
WHERE od.variant_id IS NULL;

-- 5) If you want variant-level stock to reflect previous product-level `stock_quantity`, we've set default variant stock to products.stock_quantity.
--    To keep products.stock_quantity consistent with sum of variants, update products.stock_quantity from product_variants.
UPDATE products p
JOIN (
  SELECT product_id, COALESCE(SUM(stock_quantity),0) AS total_qty
  FROM product_variants
  GROUP BY product_id
) pvsum ON pvsum.product_id = p.product_id
SET p.stock_quantity = pvsum.total_qty;

-- 6) Add foreign keys on variant_id (optional). Use SET NULL to avoid cascade deletion of historical details.
ALTER TABLE `stock_in_details`
  ADD CONSTRAINT `fk_stockin_detail_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`variant_id`) ON DELETE SET NULL;

ALTER TABLE `order_details`
  ADD CONSTRAINT `fk_order_detail_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`variant_id`) ON DELETE SET NULL;

-- 7) Recommended: update application code to prefer `variant_id` when creating stock_in_details / order_details.
--    Keep writing `product_id` for compatibility, but set `variant_id` for variant-aware operations.

-- 8) OPTIONAL: If you want to split product into multiple variants based on CSV `sizes` and `colors` columns,
--    you can run a more advanced script to generate combinations per product. That script is potentially destructive
--    and should be run only after manual review. Example outline (do NOT run blindly):
--
--  BEGIN TRANSACTION;
--  -- For each product with sizes or colors, generate variants from combinations, then map existing stock_in_details
--  -- to appropriate variant by matching size/color in stock_in_details metadata (if available).
--  COMMIT;

-- 9) Quick approach (if you prefer not to use variants): the `products` table already has `sizes` and `colors` columns.
--    You can update `products.sizes` and `products.colors` with CSV values per product. Example:
--    ALTER TABLE products ADD COLUMN sizes VARCHAR(255) DEFAULT NULL; -- already present in this schema
--    UPDATE products SET sizes = 'S,M,L' WHERE product_id = 'P0001';

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================
-- USAGE NOTES
-- ==========================
-- 1) Backup the database before running this migration.
-- 2) Run on staging to confirm your application handles `variant_id` correctly.
-- 3) After migration, update server code to:
--    - Create/choose `product_variants` when adding products with sizes/colors.
--    - Use `variant_id` in `stock_in_details` and `order_details` when operations are variant-specific.
-- 4) If you want a migration script that splits variants automatically by parsing `products.sizes` and `products.colors`,
--    tell me and I will add that script (it needs rules for combining sizes/colors and handling legacy stock mapping).



