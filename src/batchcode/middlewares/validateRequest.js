const validateRequest = (schema = {}) => (req, res, next) => {
  try {
    for (const key of Object.keys(schema)) {
      const validator = schema[key];
      if (!validator) {
        continue;
      }

      const result = validator.safeParse(req[key]);
      if (!result.success) {
        const errors = result.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: {
            errors,
            formatted: errors.map(e => `${e.field}: ${e.message}`).join(', ')
          }
        });
        return;
      }
      req[key] = result.data;
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validateRequest;
