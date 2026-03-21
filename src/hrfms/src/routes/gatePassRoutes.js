const express = require('express');
const gatePassController = require('../controllers/gatePassController');
const { authenticateToken } = require('../middleware/auth');
const { uploadGatePassPhoto } = require('../utils/gatePassUpload');

const router = express.Router();

router.use(authenticateToken);

router.post('/', uploadGatePassPhoto, gatePassController.createGatePass.bind(gatePassController));
router.get('/', gatePassController.getAllGatePasses.bind(gatePassController));
router.get('/:id', gatePassController.getGatePassById.bind(gatePassController));
router.put('/:id', uploadGatePassPhoto, gatePassController.updateGatePass.bind(gatePassController));
router.delete('/:id', gatePassController.deleteGatePass.bind(gatePassController));

module.exports = router;



