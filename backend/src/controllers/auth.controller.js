const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { setAuthCookies, clearAuthCookies } = require('../utils/generateToken');
const env = require('../config/env');
const authService = require('../services/auth.service');

// POST /api/v1/auth/signup
const signup = catchAsync(async (req, res) => {
  const user = await authService.registerUser(req.body);
  const { accessToken, refreshToken } = await authService.issueTokens(user, req);

  setAuthCookies(res, accessToken, refreshToken);

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: user.toSafeObject(), accessToken },
        'Account created successfully.'
      )
    );
});

// POST /api/v1/auth/login
const login = catchAsync(async (req, res) => {
  const user = await authService.loginUser(req.body);
  const { accessToken, refreshToken } = await authService.issueTokens(user, req);

  setAuthCookies(res, accessToken, refreshToken);

  res
    .status(200)
    .json(new ApiResponse(200, { user: user.toSafeObject(), accessToken }, 'Logged in successfully.'));
});

// GET /api/v1/auth/google -> handled by passport.authenticate in routes
// GET /api/v1/auth/google/callback
const googleCallback = catchAsync(async (req, res) => {
  // req.user set by passport GoogleStrategy
  const { accessToken, refreshToken } = await authService.issueTokens(req.user, req);
  setAuthCookies(res, accessToken, refreshToken);

  // Redirect back to frontend after successful OAuth
  res.redirect(`${env.CLIENT_URL}/auth/callback`);
});

// POST /api/v1/auth/refresh
const refresh = catchAsync(async (req, res) => {
  const oldRefreshToken = req.cookies?.refreshToken;
  if (!oldRefreshToken) throw new ApiError(401, 'No refresh token provided.');

  const { user, accessToken, refreshToken } = await authService.rotateRefreshToken(
    oldRefreshToken,
    req
  );

  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json(new ApiResponse(200, { user: user.toSafeObject(), accessToken }, 'Token refreshed.'));
});

// POST /api/v1/auth/logout
const logout = catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  await authService.revokeSession(refreshToken);
  clearAuthCookies(res);

  if (req.user) {
    req.user.status = 'offline';
    await req.user.save();
  }

  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully.'));
});

// GET /api/v1/auth/me
const getMe = catchAsync(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { user: req.user.toSafeObject() }, 'Current user fetched.'));
});

// POST /api/v1/auth/forgot-password
const forgotPassword = catchAsync(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  res
    .status(200)
    .json(new ApiResponse(200, null, 'If an account exists with that email, a reset link has been sent.'));
});

// POST /api/v1/auth/reset-password
const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  res.status(200).json(new ApiResponse(200, null, 'Password reset successful. Please log in.'));
});

// GET /api/v1/auth/verify-email?token=...
const verifyEmail = catchAsync(async (req, res) => {
  const user = await authService.verifyEmailToken(req.query.token);
  res
    .status(200)
    .json(new ApiResponse(200, { user: user.toSafeObject() }, 'Email verified successfully.'));
});

module.exports = {
  signup,
  login,
  googleCallback,
  refresh,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
