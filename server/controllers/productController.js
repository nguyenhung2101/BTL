// /server/controllers/productController.js
const productModel = require('../models/productModel');
const stockInModel = require('../models/stockInModel');

const productController = {
    listProducts: async (req, res) => {
        // TODO: Cần middleware kiểm tra Auth/Permission
        try {
            const { category_id } = req.query;
            const options = {};
            if (category_id) options.categoryId = category_id;
            const products = await productModel.getAllProducts(options);
            res.status(200).json(products);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi lấy danh sách sản phẩm.' });
        }
    },

    getProduct: async (req, res) => {
        try {
            const id = req.params.id;
            console.log('🔍 getProduct - Requested ID:', id);
            console.log('🔍 getProduct - ID type:', typeof id);
            console.log('🔍 getProduct - Full URL:', req.originalUrl);
            
            if (!id) {
                console.error('❌ getProduct - No ID provided');
                return res.status(400).json({ message: 'product id là bắt buộc.' });
            }
            
            const product = await productModel.getProductById(id);
            console.log('🔍 getProduct - Query result:', product ? 'Found' : 'Not found');
            
            if (!product) {
                console.error('❌ getProduct - Product not found for ID:', id);
                return res.status(404).json({ message: `Không tìm thấy sản phẩm với ID: ${id}` });
            }
            
            console.log('✅ getProduct - Returning product:', product.id, product.name);
            return res.status(200).json(product);
        } catch (error) {
            console.error('❌ Error getting product:', error);
            console.error('❌ Error name:', error.name);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error stack:', error.stack);
            
            // Trả về thông báo lỗi chi tiết hơn trong development
            const errorMessage = process.env.NODE_ENV === 'development' 
                ? `Lỗi khi lấy thông tin sản phẩm: ${error.message}` 
                : 'Lỗi khi lấy thông tin sản phẩm.';
            
            return res.status(500).json({ 
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? {
                    name: error.name,
                    message: error.message,
                    code: error.code
                } : undefined
            });
        }
    },

    createProduct: async (req, res) => {
        try {
            const { id, name, categoryId, price, costPrice, stockQuantity, isActive, sizes, colors, material } = req.body;
            if (!id || !name) {
                return res.status(400).json({ message: 'product id và name là bắt buộc.' });
            }
            // Create product first
            await productModel.createProduct({ id, name, categoryId, price, costPrice, stockQuantity: 0, isActive, sizes, colors, material });

            // If initial stock provided (>0), create a stock-in entry to correctly record inventory and cost
            if (stockQuantity && Number(stockQuantity) > 0) {
                try {
                    const result = await stockInModel.createStockInItem({ productId: id, quantity: Number(stockQuantity), priceImport: Number(costPrice) || 0, note: 'Nhập kho tự động khi tạo sản phẩm' });
                    return res.status(201).json({ message: 'Tạo sản phẩm và phiếu nhập tự động thành công.', data: result });
                } catch (err) {
                    console.error('Error creating automatic stock-in after product create:', err);
                    // product is created, but stock-in failed
                    return res.status(201).json({ message: 'Tạo sản phẩm thành công nhưng tạo phiếu nhập tự động thất bại.', warning: err.message });
                }
            }

            res.status(201).json({ message: 'Tạo sản phẩm thành công.' });
        } catch (error) {
            // Log detailed error for debugging
            console.error('❌ Error in createProduct:', error);
            console.error('❌ name:', error.name, 'code:', error.code, 'message:', error.message);

            const isDev = process.env.NODE_ENV === 'development';
            const payload = {
                message: isDev ? `Lỗi khi tạo sản phẩm: ${error.message}` : 'Lỗi khi tạo sản phẩm.'
            };
            if (isDev) payload.error = { name: error.name, code: error.code, stack: error.stack };

            res.status(500).json(payload);
        }
    }
    ,

    updateProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, categoryId, price, costPrice, stockQuantity, isActive, sizes, colors, material } = req.body;
            if (!id || !name) return res.status(400).json({ message: 'product id và name là bắt buộc.' });
            const result = await productModel.updateProduct(id, { name, categoryId, price, costPrice, stockQuantity, isActive, sizes, colors, material });
            if (result && result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
            res.status(200).json({ message: 'Cập nhật sản phẩm thành công.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi cập nhật sản phẩm.' });
        }
    },

    deleteProduct: async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) return res.status(400).json({ message: 'product id là bắt buộc.' });
            const result = await productModel.deleteProduct(id);
            if (result && result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
            res.status(200).json({ message: 'Xóa sản phẩm thành công.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi xóa sản phẩm.' });
        }
    }
};

module.exports = productController;