const { StatusCodes } = require('http-status-codes');
const dashboardService = require('../services/dashboard.service');
const { buildResponse } = require('../utils/apiResponse');

const getDashboard = async (req, res) => {
  const dashboardData = await dashboardService.getDashboardData();
  res.status(StatusCodes.OK).json(buildResponse('Dashboard data fetched', dashboardData));
};

module.exports = { getDashboard };









