const express = require('express');
const router = express.Router();
const sizeMasterController = require('../controllers/sizeMaster.controller');

// Get all size master data
router.get('/', sizeMasterController.getSizeMasterData);

// Create new enquiry (MUST be before /:id to avoid conflict)
router.post('/enquiry', sizeMasterController.createEnquiry);

// Get size master by ID
router.get('/:id', sizeMasterController.getSizeMasterById);

// Get current month enquiry report
router.get('/report/current-month', sizeMasterController.getCurrentMonthEnquiryReport);

module.exports = router;
