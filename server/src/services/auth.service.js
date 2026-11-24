const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Trainer = require('../models/Trainer');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const ACCESS_COOKIE_NAME = 'td_access_token';
const REFRESH_COOKIE_NAME = 'td_refresh_token';

const BCRYPT_ROUNDS = env.isTest ? 6 : 12;
const MAX_ACTIVE_REFRESH_TOKENS = 10;

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function signAccessToken(trainer) {
  return jwt.sign(
    {
      sub: trainer._id.toString(),
      role: trainer.role,
      type: 'access',
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

function signRefreshToken(trainer) {
  return jwt.sign(
    {
      sub: trainer._id.toString(),
      jti: crypto.randomUUID(),
      type: 'refresh',
    },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
}

function getRefreshExpiresAt(token) {
  const decoded = jwt.decode(token);
  if (decoded && decoded.exp) {
    return new Date(decoded.exp * 1000);
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

function pruneAndAddRefreshToken(trainer, rawRefreshToken, userAgent = '') {
  const now = new Date();
  const activeTokens = (trainer.refreshTokens || []).filter((entry) => entry.expiresAt > now);
  activeTokens.push({
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: getRefreshExpiresAt(rawRefreshToken),
    userAgent: String(userAgent).slice(0, 200),
  });
  trainer.refreshTokens = activeTokens.slice(-MAX_ACTIVE_REFRESH_TOKENS);
}

function getCookieOptions() {
  const base = {
    httpOnly: true,
    sameSite: env.cookieSameSite,
    secure: env.isProd || env.cookieSameSite === 'none',
  };
  return {
    access: {
      ...base,
      path: '/',
      maxAge: 15 * 60 * 1000,
    },
    refresh: {
      ...base,
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  const options = getCookieOptions();
  res.cookie(ACCESS_COOKIE_NAME, accessToken, options.access);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, options.refresh);
}

function clearAuthCookies(res) {
  const options = getCookieOptions();
  res.clearCookie(ACCESS_COOKIE_NAME, { ...options.access, maxAge: undefined });
  res.clearCookie(REFRESH_COOKIE_NAME, { ...options.refresh, maxAge: undefined });
}

async function register({ name, email, password, gymName = '', phone = '', userAgent = '' }) {
  const existing = await Trainer.findOne({ email });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists', 'CONFLICT');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const trainer = new Trainer({
    name,
    email,
    passwordHash,
    gymName,
    phone,
  });

  const accessToken = signAccessToken(trainer);
  const refreshToken = signRefreshToken(trainer);
  pruneAndAddRefreshToken(trainer, refreshToken, userAgent);
  await trainer.save();

  return {
    trainer: trainer.toSafeJSON(),
    accessToken,
    refreshToken,
  };
}

async function login({ email, password, userAgent = '' }) {
  const trainer = await Trainer.findOne({ email }).select('+passwordHash +refreshTokens');
  if (!trainer) {
    throw new AppError(401, 'Invalid email or password', 'UNAUTHORIZED');
  }

  const isMatch = await bcrypt.compare(password, trainer.passwordHash);
  if (!isMatch) {
    throw new AppError(401, 'Invalid email or password', 'UNAUTHORIZED');
  }

  const accessToken = signAccessToken(trainer);
  const refreshToken = signRefreshToken(trainer);
  pruneAndAddRefreshToken(trainer, refreshToken, userAgent);
  await trainer.save();

  return {
    trainer: trainer.toSafeJSON(),
    accessToken,
    refreshToken,
  };
}

async function refresh({ refreshToken, userAgent = '' }) {
  if (!refreshToken) {
    throw new AppError(401, 'Refresh token missing', 'UNAUTHORIZED');
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch (_err) {
    throw new AppError(401, 'Invalid or expired refresh token', 'UNAUTHORIZED');
  }

  if (payload.type !== 'refresh' || !payload.sub) {
    throw new AppError(401, 'Invalid refresh token type', 'UNAUTHORIZED');
  }

  const trainer = await Trainer.findById(payload.sub).select('+refreshTokens');
  if (!trainer) {
    throw new AppError(401, 'Trainer account not found', 'UNAUTHORIZED');
  }

  const incomingHash = hashToken(refreshToken);
  const now = new Date();
  const validTokenIndex = (trainer.refreshTokens || []).findIndex(
    (entry) => entry.tokenHash === incomingHash && entry.expiresAt > now
  );

  if (validTokenIndex === -1) {
    throw new AppError(401, 'Refresh token has been revoked or expired', 'UNAUTHORIZED');
  }

  trainer.refreshTokens.splice(validTokenIndex, 1);

  const newAccessToken = signAccessToken(trainer);
  const newRefreshToken = signRefreshToken(trainer);
  pruneAndAddRefreshToken(trainer, newRefreshToken, userAgent);
  await trainer.save();

  return {
    trainer: trainer.toSafeJSON(),
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

async function logout({ refreshToken }) {
  if (!refreshToken) return;

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch (_err) {
    return;
  }

  if (!payload?.sub) return;

  const incomingHash = hashToken(refreshToken);
  await Trainer.updateOne(
    { _id: payload.sub },
    { $pull: { refreshTokens: { tokenHash: incomingHash } } }
  );
}

async function changePassword({ trainerId, currentPassword, newPassword, userAgent = '' }) {
  const trainer = await Trainer.findById(trainerId).select('+passwordHash +refreshTokens');
  if (!trainer) {
    throw new AppError(404, 'Trainer account not found', 'NOT_FOUND');
  }

  const isMatch = await bcrypt.compare(currentPassword, trainer.passwordHash);
  if (!isMatch) {
    throw new AppError(401, 'Current password is incorrect', 'UNAUTHORIZED');
  }

  trainer.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  trainer.refreshTokens = [];

  const accessToken = signAccessToken(trainer);
  const refreshToken = signRefreshToken(trainer);
  pruneAndAddRefreshToken(trainer, refreshToken, userAgent);
  await trainer.save();

  return {
    trainer: trainer.toSafeJSON(),
    accessToken,
    refreshToken,
  };
}

async function updateProfile({ trainerId, updates }) {
  const trainer = await Trainer.findById(trainerId);
  if (!trainer) {
    throw new AppError(404, 'Trainer account not found', 'NOT_FOUND');
  }

  if (updates.name !== undefined) trainer.name = updates.name;
  if (updates.phone !== undefined) trainer.phone = updates.phone;
  if (updates.gymName !== undefined) trainer.gymName = updates.gymName;
  if (updates.bio !== undefined) trainer.bio = updates.bio;

  if (updates.preferences) {
    trainer.preferences = {
      weightUnit: updates.preferences.weightUnit ?? trainer.preferences?.weightUnit ?? 'kg',
      theme: updates.preferences.theme ?? trainer.preferences?.theme ?? 'system',
      defaultSessionDuration:
        updates.preferences.defaultSessionDuration ??
        trainer.preferences?.defaultSessionDuration ??
        60,
      timezone: updates.preferences.timezone ?? trainer.preferences?.timezone ?? 'UTC',
    };
  }

  await trainer.save();
  return trainer.toSafeJSON();
}

module.exports = {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
  clearAuthCookies,
  register,
  login,
  refresh,
  logout,
  changePassword,
  updateProfile,
};
