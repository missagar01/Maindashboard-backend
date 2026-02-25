const { fetchCustomerFeedbackFromGoogleSheet } = require("../services/customerFeedback.service.js");

async function fetchCustomerFeedback(req, res) {
  const sheetName = req.query.sheetName || req.query.sheet || "Form Responses 1";

  try {
    const data = await fetchCustomerFeedbackFromGoogleSheet({ sheetName });
    return res.status(200).json({
      success: true,
      data: data.data,
      sourceUrl: data.sourceUrl || null,
      source: data.isStale ? 'cache' : 'live',
      cachedAt: data.cachedAt || null
    });
  } catch (error) {
    console.error("❌ CUSTOMER FEEDBACK SERVICE ERROR:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(502).json({
      success: false,
      message: "Failed to fetch customer feedback from Google Sheet",
      error: error.message,
    });
  }
}

module.exports = { fetchCustomerFeedback };
