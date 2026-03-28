const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const auth = require('../middleware/auth');

router.get('/', auth, projectController.getProjects);
router.post('/', auth, auth.manager, projectController.createProject);

module.exports = router;
