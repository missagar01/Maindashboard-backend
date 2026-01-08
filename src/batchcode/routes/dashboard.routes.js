const { Router } = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middlewares/auth');

const router = Router();

router.get('/dashboard', requireAuth, dashboardController.getDashboard);

module.exports = router;









