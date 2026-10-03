const express = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  signupValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../validators/auth.validator');

const router = express.Router();

// Local auth
router.post('/signup', authLimiter, signupValidator, validate, authController.signup);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.post('/logout', protect, authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', protect, authController.getMe);

// Password reset
router.post(
  '/forgot-password',
  authLimiter,
  forgotPasswordValidator,
  validate,
  authController.forgotPassword
);
router.post(
  '/reset-password',
  authLimiter,
  resetPasswordValidator,
  validate,
  authController.resetPassword
);

// Email verification
router.get('/verify-email', authController.verifyEmail);

// Google OAuth 2.0 Redirect Flow
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  authController.googleCallback
);

module.exports = router;
