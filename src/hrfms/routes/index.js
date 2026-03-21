const express = require('express');

const employeeRoutes = require('../src/routes/employeeRoutes');
const requestRoutes = require('../src/routes/requestRoutes');
const ticketBookRoutes = require('../src/routes/ticketBookRoutes');
const leaveRequestRoutes = require('../src/routes/leaveRequestRoutes');
const resumeRoutes = require('../src/routes/resumeRoutes');
const dashboardRoutes = require('../src/routes/dashboardRoutes');
const planeVisitorRoutes = require('../src/routes/planeVisitorRoutes');
const gatePassRoutes = require('../src/routes/gatePassRoutes');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'hrfms',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

router.use('/employees', employeeRoutes);
router.use('/requests', requestRoutes);
router.use('/tickets', ticketBookRoutes);
router.use('/leave-requests', leaveRequestRoutes);
router.use('/resumes', resumeRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/plant-visitors', planeVisitorRoutes);
router.use('/gatepasses', gatePassRoutes);

module.exports = router;
