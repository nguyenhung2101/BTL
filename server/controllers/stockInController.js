// /server/controllers/stockInController.js
const stockInModel = require('../models/stockInModel');

const stockInController = {
    listStockInReceipts: async (req, res) => {
        try {
            const receipts = await stockInModel.getAllStockInReceipts();
            res.status(200).json(receipts);
        } catch (error) {
            console.error("Error listing stock in receipts:", error);
            res.status(500).json({ message: 'Lỗi khi lấy danh sách phiếu nhập kho.' });
        }
    },

    listStockInItems: async (req, res) => {
        try {
            const items = await stockInModel.getAllStockInItems();
            res.status(200).json(items);
        } catch (error) {
            console.error("Error listing stock in items:", error);
            res.status(500).json({ message: 'Lỗi khi lấy danh sách chi tiết nhập kho.' });
        }
    },

    createStockInItem: async (req, res) => {
        try {
            const { productId, quantity, priceImport, note } = req.body;
            
            if (!productId || !quantity || !priceImport) {
                return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
            }

            const result = await stockInModel.createStockInItem({
                productId,
                quantity: parseInt(quantity),
                priceImport: parseFloat(priceImport),
                note: note || ''
            });

            res.status(201).json({ message: 'Thêm chi tiết nhập kho thành công.', data: result });
        } catch (error) {
            console.error("Error creating stock in item:", error);
            // Nếu model ném lỗi có thông điệp rõ ràng, trả về cho client để hiển thị
            if (error && error.message) {
                const status = /Không tồn tại|không hợp lệ|Invalid|not found/i.test(error.message) ? 400 : 500;
                return res.status(status).json({ message: error.message });
            }
            res.status(500).json({ message: 'Lỗi khi thêm chi tiết nhập kho.' });
        }
    },

    deleteStockInItem: async (req, res) => {
        try {
            const { id } = req.params;
            // id format: "stockInId_productId"
            const [stockInId, productId] = id.split('_');
            
            if (!stockInId || !productId) {
                return res.status(400).json({ message: 'ID không hợp lệ.' });
            }

            await stockInModel.deleteStockInItem(stockInId, productId);
            res.status(200).json({ message: 'Xóa chi tiết nhập kho thành công.' });
        } catch (error) {
            console.error("Error deleting stock in item:", error);
            res.status(500).json({ message: 'Lỗi khi xóa chi tiết nhập kho.' });
        }
    }
};
module.exports = stockInController;