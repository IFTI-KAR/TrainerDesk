const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

router.get('/me', protect, authController.getMe);
router.patch('/me', protect, validate(updateProfileSchema), authController.updateMe);
router.patch(
  '/password',
  protect,
  validate(changePasswordSchema),
  authController.changePassword
);

module.exports = router;
