const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Trainer = require('../models/Trainer');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const ACCESS_COOKIE_NAME = 'td_access_token';

const protect = asyncHandler(async (req, _res, next) => {
  let token = req.cookies?.[ACCESS_COOKIE_NAME];

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (!token) {
    throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.accessSecret);
  } catch (_err) {
    throw new AppError(401, 'Invalid or expired access token', 'UNAUTHORIZED');
  }

  if (payload.type !== 'access' || !payload.sub) {
    throw new AppError(401, 'Invalid token type', 'UNAUTHORIZED');
  }

  const trainer = await Trainer.findById(payload.sub);
  if (!trainer) {
    throw new AppError(401, 'Trainer account no longer exists', 'UNAUTHORIZED');
  }

  req.trainer = trainer;
  req.trainerId = trainer._id;
  next();
});

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.trainer || !roles.includes(req.trainer.role)) {
      return next(new AppError(403, 'Insufficient permissions', 'FORBIDDEN'));
    }
    return next();
  };
}

module.exports = {
  protect,
  requireRole,
};
