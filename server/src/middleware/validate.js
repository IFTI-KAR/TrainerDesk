const AppError = require('../utils/AppError');

function validate(schemas = {}) {
  return (req, _res, next) => {
    const errors = [];

    for (const target of ['params', 'query', 'body']) {
      const schema = schemas[target];
      if (!schema) continue;

      const parsed = schema.safeParse(req[target]);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push({
            location: target,
            field: issue.path.join('.') || target,
            message: issue.message,
          });
        }
      } else {
        req[target] = parsed.data;
      }
    }

    if (errors.length > 0) {
      return next(new AppError(400, 'Validation failed', 'VALIDATION_ERROR', errors));
    }

    return next();
  };
}

module.exports = validate;
