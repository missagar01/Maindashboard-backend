const express = require('express');
const router = express.Router();
const workAreaController = require('../controllers/workAreaController');
const auth = require('../middleware/auth');

router.get('/:projectId', auth, workAreaController.getWorkAreas);
router.post('/', auth, auth.manager, workAreaController.createWorkArea);

module.exports = router;
