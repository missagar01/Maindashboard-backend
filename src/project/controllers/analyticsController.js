const Analytics = require('../models/analyticsModel');

exports.getOperationalSummary = async (req, res) => {
    try {
        const summary = await Analytics.getOperationalSummary();
        res.json(summary);
    } catch (err) {
        console.error('Analytics Fetch Error:', err);
        res.status(500).json({ error: err.message });
    }
};
