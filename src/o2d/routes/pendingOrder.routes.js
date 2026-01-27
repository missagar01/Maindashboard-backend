const express = require('express');
const router = express.Router();
const pendingOrderController = require('../controllers/pendingOrder.controller');

// Provide simpler aliases for clients expecting just /pending and /history.
router.get('/pending', pendingOrderController.getPendingOrders);
router.get('/history', pendingOrderController.getCompletedOrders);


module.exports = router;


