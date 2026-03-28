const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const auth = require('../middleware/auth');

router.get('/', auth, materialController.getMaterials);
router.post('/', auth, auth.manager, materialController.createMaterial);
router.post('/inward', auth, materialController.recordInward);
router.post('/consumption', auth, materialController.recordConsumption);
router.get('/logs', auth, materialController.getLogs);

module.exports = router;
