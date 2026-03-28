const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

router.get('/operational-summary', auth, analyticsController.getOperationalSummary);

module.exports = router;
