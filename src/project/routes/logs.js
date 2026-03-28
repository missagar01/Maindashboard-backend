const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');

router.get('/:activityId', auth, taskController.getProgress);
router.post('/', auth, taskController.addProgress);

module.exports = router;
