// /server/routes/stockInRoutes.js

const express = require('express');
const router = express.Router();
const stockInController = require('../controllers/stockInController');

router.get('/', stockInController.listStockInReceipts); 
router.get('/items', stockInController.listStockInItems);
router.post('/items', stockInController.createStockInItem);
router.delete('/items/:id', stockInController.deleteStockInItem);

module.exports = router;