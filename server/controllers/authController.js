import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validateName, validateEmail, validatePassword, collectErrors } from '../utils/validate.js';

// ── Helper: strip password before sending user back to client ────────────────
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Validate inputs
  const errors = collectErrors(
    validateName(name),
    validateEmail(email),
    validatePassword(password)
  );
  if (errors.length > 0) {
    res.status(400);
    throw new Error(errors.join('. '));
  }

  // Reject if email already exists
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    res.status(400);
    throw new Error('An account with that email already exists');
  }

  // ALWAYS force role to "user" — ignore anything sent in body
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: 'user',
  });

  const token = generateToken(user._id, user.role);

  res.status(201).json({
    success: true,
    token,
    user: sanitizeUser(user),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Basic presence check
  const errors = collectErrors(validateEmail(email), validatePassword(password));
  if (errors.length > 0) {
    res.status(400);
    throw new Error(errors.join('. '));
  }

  // Always use the same generic message for wrong email or password
  // so attackers can't enumerate existing accounts
  const GENERIC_ERROR = 'Invalid email or password';

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user) {
    res.status(401);
    throw new Error(GENERIC_ERROR);
  }

  const passwordMatch = await user.matchPassword(password);
  if (!passwordMatch) {
    res.status(401);
    throw new Error(GENERIC_ERROR);
  }

  const token = generateToken(user._id, user.role);

  res.json({
    success: true,
    token,
    user: sanitizeUser(user),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get currently logged-in user
// @route   GET /api/auth/me
// @access  Private (protect middleware)
// ─────────────────────────────────────────────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  // req.user is attached by the protect middleware
  res.json({
    success: true,
    user: sanitizeUser(req.user),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Admin-only test route
// @route   GET /api/auth/admin-check
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
export const adminCheck = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: `Welcome, admin ${req.user.name}! You have admin access.`,
    user: sanitizeUser(req.user),
  });
});
