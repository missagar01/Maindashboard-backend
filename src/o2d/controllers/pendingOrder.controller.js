const pendingOrderService = require('../services/pendingOrder.service');

const getPendingOrders = async (req, res) => {
    try {
        const orders = await pendingOrderService.getPendingOrders();

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};




const getCompletedOrders = async (req, res) => {
    try {
        const orders = await pendingOrderService.getCompletedOrders();
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getPendingOrders, getCompletedOrders };
