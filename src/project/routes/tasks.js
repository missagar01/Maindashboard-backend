const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');

router.get('/', auth, taskController.getActivities);
router.get('/:structureId', auth, taskController.getActivitiesByStructure);
router.post('/', auth, auth.manager, taskController.createActivity);

module.exports = router;
