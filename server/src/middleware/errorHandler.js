const AppError = require('../utils/AppError');
const env = require('../config/env');

function notFoundHandler(req, _res, next) {
  next(new AppError(404, `Route not found: ${req.originalUrl}`, 'NOT_FOUND'));
}

function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';
  let details = err.details || undefined;

  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'CONFLICT';
    const fields = Object.keys(err.keyPattern || {});
    message = fields.length > 0 ? `${fields.join(', ')} already exists` : 'Duplicate resource';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    code = 'UPLOAD_ERROR';
    message = err.message;
  }

  if (statusCode >= 500 && !env.isTest) {
    console.error('[Server Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
