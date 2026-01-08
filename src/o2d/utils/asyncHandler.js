// Async error handler wrapper for Express routes
// Ensures all async errors are caught and passed to error middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;





