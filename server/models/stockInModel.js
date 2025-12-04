// /server/models/stockInModel.js (VERSION CUỐI CÙNG)


const db = require('../config/db.config');

const stockInModel = {
    getAllStockInReceipts: async () => {
        const query = `
            SELECT 
                si.stock_in_id AS id, 
                si.supplier_name AS supplierName, 
                DATE_FORMAT(si.import_date, '%Y-%m-%d') AS importDate, 
                si.total_cost AS totalCost, 
                u.full_name AS staffName
            FROM stock_in si
            JOIN users u ON si.user_id = u.user_id
            ORDER BY si.import_date DESC
        `;
        try {
            const [rows] = await db.query(query);
            return rows;
        } catch (error) {
            console.error("❌ Database Error listing stock in receipts:", error);
            throw new Error(`Database Query Failed for Stock In: ${error.message}`);
        }
    },

    getAllStockInItems: async () => {
        const query = `
            SELECT 
                sid.stock_in_id AS stockInId,
                sid.product_id AS productId,
                sid.quantity,
                sid.cost_price AS priceImport,
                p.name AS productName
            FROM stock_in_details sid
            JOIN products p ON sid.product_id = p.product_id
            ORDER BY sid.stock_in_id DESC, sid.product_id
        `;
        try {
            const [rows] = await db.query(query);
            return rows.map(row => ({
                _id: `${row.stockInId}_${row.productId}`,
                stockInId: row.stockInId,
                productId: {
                    id: row.productId,
                    name: row.productName
                },
                quantity: row.quantity,
                priceImport: parseFloat(row.priceImport || 0),
                note: ''
            }));
        } catch (error) {
            console.error("❌ Database Error listing stock in items:", error);
            throw new Error(`Database Query Failed for Stock In Items: ${error.message}`);
        }
    },

    // item: { productId (id or name), quantity, priceImport, stockInId?, supplierName?, userId? }
    // conn: optional connection object from mysql2/promise to participate in caller-managed transaction
    createStockInItem: async (item, conn) => {
        const { productId, quantity, priceImport, stockInId: providedId, supplierName: supplier = 'Nhà cung cấp mặc định', userId: providedUserId } = item;

        const qty = parseInt(quantity, 10);
        const price = parseFloat(priceImport);

        if (!productId || !qty || isNaN(price)) {
            throw new Error('Thông tin chi tiết nhập kho không hợp lệ');
        }

        const executor = conn ? conn.query.bind(conn) : db.query;
        const manageTransaction = !conn;

        if (manageTransaction) {
            await db.query('START TRANSACTION');
        }

        // determine stockInId using executor so it's consistent in transactional mode
        let stockInId = providedId;
        try {
            if (!stockInId) {
                const [lastRows] = await executor('SELECT stock_in_id FROM stock_in ORDER BY import_date DESC LIMIT 1');
                if (lastRows && lastRows.length > 0) {
                    const lastId = lastRows[0].stock_in_id || '';
                    const m = lastId.match(/^SI(\d+)$/);
                    if (m) {
                        const next = String(parseInt(m[1], 10) + 1).padStart(m[1].length, '0');
                        stockInId = `SI${next}`;
                    } else {
                        stockInId = `SI${Date.now().toString().slice(-6)}`;
                    }
                } else {
                    stockInId = 'SI000001';
                }
            }
        } catch (err) {
            stockInId = `SI${Date.now().toString().slice(-6)}`;
        }

        const userId = providedUserId || 'WH01';
        const totalCost = qty * price;

        try {
            // Resolve product by id or name
            const search = String(productId).trim();
            const [found] = await executor(
                `SELECT product_id, name FROM products
                 WHERE LOWER(product_id) = LOWER(?)
                 OR LOWER(name) = LOWER(?)
                 OR LOWER(name) LIKE LOWER(CONCAT('%', ?, '%'))
                 LIMIT 5`,
                [search, search, search]
            );

            // If not found, auto-create minimal product with PR-xxxx id
            if (!found || found.length === 0) {
                const prefix = 'PR-';
                const [lastPidRows] = await executor("SELECT product_id FROM products WHERE product_id REGEXP '^PR-?[0-9]+' ORDER BY CAST(REPLACE(UPPER(product_id),'PR-','') AS UNSIGNED) DESC LIMIT 1");
                let newNumeric = 1;
                if (lastPidRows && lastPidRows.length > 0) {
                    const m = String(lastPidRows[0].product_id).match(/^PR-?0*(\d+)$/i);
                    if (m) {
                        newNumeric = parseInt(m[1], 10) + 1;
                    }
                }
                const nextStr = String(newNumeric).padStart(4, '0');
                const newPid = `${prefix}${nextStr}`;

                await executor(
                    `INSERT INTO products (product_id, name, category_id, price, cost_price, stock_quantity, is_active, sizes, colors, material)
                     VALUES (?, ?, NULL, 0, ?, 0, 1, NULL, NULL, NULL)`,
                    [newPid, search, price]
                );

                console.log('Auto-created product', newPid, 'for input', search);
                found.push({ product_id: newPid });
            }

            if (found.length > 1) {
                console.warn('Multiple products matched for input', search, 'Returning first match:', found.map(r => r.product_id).join(','));
            }

            const resolvedProductId = found[0].product_id;
            const pid = resolvedProductId;

            // Create or update stock_in receipt
            const [existing] = await executor('SELECT stock_in_id FROM stock_in WHERE stock_in_id = ?', [stockInId]);
            if (!existing || existing.length === 0) {
                await executor(
                    `INSERT INTO stock_in (stock_in_id, supplier_name, import_date, total_cost, user_id)
                     VALUES (?, ?, NOW(), ?, ?)`,
                    [stockInId, supplier, totalCost, userId]
                );
            } else {
                await executor('UPDATE stock_in SET total_cost = total_cost + ? WHERE stock_in_id = ?', [totalCost, stockInId]);
            }

            // Insert or update stock_in_details
            await executor(
                `INSERT INTO stock_in_details (stock_in_id, product_id, quantity, cost_price)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 quantity = quantity + VALUES(quantity),
                 cost_price = VALUES(cost_price)`,
                [stockInId, pid, qty, price]
            );

            // Update product stock and average cost
            const [prodRows] = await executor('SELECT stock_quantity, cost_price FROM products WHERE product_id = ?', [pid]);
            let oldQty = 0;
            let oldCost = 0;
            if (prodRows && prodRows.length > 0) {
                oldQty = parseInt(prodRows[0].stock_quantity || 0, 10);
                oldCost = parseFloat(prodRows[0].cost_price || 0);
            }

            const newQty = oldQty + qty;
            let newAvgCost = price;
            if (newQty > 0) {
                newAvgCost = ((oldQty * oldCost) + (qty * price)) / newQty;
            }

            await executor('UPDATE products SET stock_quantity = ?, cost_price = ? WHERE product_id = ?', [newQty, newAvgCost, pid]);

            if (manageTransaction) {
                await db.query('COMMIT');
            }

            return { success: true, stockInId };
        } catch (error) {
            if (manageTransaction) {
                await db.query('ROLLBACK');
            }
            console.error('❌ Error in createStockInItem transaction:', error);
            throw error;
        }
    },

    deleteStockInItem: async (stockInId, productId, conn) => {
        const executor = conn ? conn.query.bind(conn) : db.query;
        const manageTransaction = !conn;

        if (manageTransaction) {
            await db.query('START TRANSACTION');
        }

        try {
            const [item] = await executor(
                'SELECT quantity, cost_price FROM stock_in_details WHERE stock_in_id = ? AND product_id = ?',
                [stockInId, productId]
            );

            if (item.length === 0) {
                throw new Error('Item not found');
            }

            const { quantity, cost_price } = item[0];
            const totalCost = parseFloat(quantity) * parseFloat(cost_price);

            await executor('DELETE FROM stock_in_details WHERE stock_in_id = ? AND product_id = ?', [stockInId, productId]);

            await executor('UPDATE stock_in SET total_cost = total_cost - ? WHERE stock_in_id = ?', [totalCost, stockInId]);

            await executor('UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?', [quantity, productId]);

            const [remaining] = await executor('SELECT COUNT(*) as count FROM stock_in_details WHERE stock_in_id = ?', [stockInId]);
            if (remaining[0].count === 0) {
                await executor('DELETE FROM stock_in WHERE stock_in_id = ?', [stockInId]);
            }

            if (manageTransaction) {
                await db.query('COMMIT');
            }
            return { success: true };
        } catch (error) {
            if (manageTransaction) {
                await db.query('ROLLBACK');
            }
            console.error('❌ Error deleting stock in item:', error);
            throw error;
        }
    }
};

module.exports = stockInModel;