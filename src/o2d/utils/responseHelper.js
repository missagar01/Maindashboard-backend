// Helper function to ensure CORS headers are set before sending response
function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const corsOriginsEnv = process.env.CORS_ORIGINS;
  const corsOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(",").map((origin) => origin.trim()).filter(Boolean)
    : ["*"];

  if (origin) {
    const isAllowed = corsOrigins.includes("*") || corsOrigins.includes(origin);
    if (isAllowed && !res.getHeader('Access-Control-Allow-Origin')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    }
  } else if (corsOrigins.includes("*") && !res.getHeader('Access-Control-Allow-Origin')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}

// Helper to send JSON response with CORS headers
function sendJsonResponse(req, res, statusCode, data) {
  setCorsHeaders(req, res);
  return res.status(statusCode).json(data);
}

module.exports = { setCorsHeaders, sendJsonResponse };





