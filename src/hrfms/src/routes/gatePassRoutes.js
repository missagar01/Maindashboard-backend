const express = require('express');
const gatePassController = require('../controllers/gatePassController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.post('/', gatePassController.createGatePass.bind(gatePassController));
router.get('/', gatePassController.getAllGatePasses.bind(gatePassController));
router.get('/:id', gatePassController.getGatePassById.bind(gatePassController));
router.put('/:id', gatePassController.updateGatePass.bind(gatePassController));
router.delete('/:id', gatePassController.deleteGatePass.bind(gatePassController));

module.exports = router;


