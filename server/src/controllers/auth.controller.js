const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

const register = asyncHandler(async (req, res) => {
  const { trainer, accessToken, refreshToken } = await authService.register({
    ...req.body,
    userAgent: req.get('user-agent') || '',
  });

  authService.setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json({
    success: true,
    data: { trainer },
  });
});

const login = asyncHandler(async (req, res) => {
  const { trainer, accessToken, refreshToken } = await authService.login({
    ...req.body,
    userAgent: req.get('user-agent') || '',
  });

  authService.setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    success: true,
    data: { trainer },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.[authService.REFRESH_COOKIE_NAME];
  const { trainer, accessToken, refreshToken } = await authService.refresh({
    refreshToken: rawRefreshToken,
    userAgent: req.get('user-agent') || '',
  });

  authService.setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    success: true,
    data: { trainer },
  });
});

const logout = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.[authService.REFRESH_COOKIE_NAME];
  await authService.logout({ refreshToken: rawRefreshToken });

  authService.clearAuthCookies(res);

  res.status(200).json({
    success: true,
    message: 'Logged out',
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { trainer: req.trainer.toSafeJSON() },
  });
});

const updateMe = asyncHandler(async (req, res) => {
  const trainer = await authService.updateProfile({
    trainerId: req.trainerId,
    updates: req.body,
  });

  res.status(200).json({
    success: true,
    data: { trainer },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { trainer, accessToken, refreshToken } = await authService.changePassword({
    trainerId: req.trainerId,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
    userAgent: req.get('user-agent') || '',
  });

  authService.setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    success: true,
    message: 'Password updated',
    data: { trainer },
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateMe,
  changePassword,
};
