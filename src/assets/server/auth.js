import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import pool from '../db/client.js';
import { validate } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';

const router = express.Router();

const signupSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(255),
  password: z.string().min(6).max(255),
  phone: z.string().max(20).optional(),
  role: z.enum(['attendee', 'organizer']).default('attendee'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
});

const profileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().max(20).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  notification_prefs: z.object({
    email: z.boolean(),
    in_app: z.boolean(),
    reminders: z.boolean(),
  }).optional(),
});

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  return { accessToken, refreshToken };
};

// Signup
router.post('/signup', validate(signupSchema), async (req, res, next) => {
  const { name, email, password, phone, role } = req.body;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, email, passwordHash, phone, role]
    );
    const userId = result.rows[0].id;

    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(verifyToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      `INSERT INTO auth_tokens (user_id, token_hash, type, expires_at) 
       VALUES ($1, $2, 'email_verify', $3)`,
      [userId, tokenHash, expiresAt]
    );

    const verifyLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verifyToken}`;
    await sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      body: `Welcome ${name}! Please verify your email by clicking the link: ${verifyLink}`,
    });

    res.status(201).json({ message: 'Registration successful. Please check your email for verification.' });
  } catch (error) {
    next(error);
  }
});

// Verify Email
router.get('/verify-email', async (req, res, next) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const tokenHash = hashToken(token);

  try {
    const tokenResult = await pool.query(
      `SELECT id, user_id, expires_at FROM auth_tokens 
       WHERE token_hash = $1 AND type = 'email_verify' AND used_at IS NULL`,
      [tokenHash]
    );

    if (tokenResult.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or already used token' });
    }

    const { id: tokenId, user_id: userId, expires_at: expiresAt } = tokenResult.rows[0];

    if (new Date() > new Date(expiresAt)) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    // Begin transaction
    await pool.query('BEGIN');
    await pool.query('UPDATE users SET is_email_verified = TRUE WHERE id = $1', [userId]);
    await pool.query('UPDATE auth_tokens SET used_at = now() WHERE id = $1', [tokenId]);
    await pool.query('COMMIT');

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account is suspended' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    const refreshHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO auth_tokens (user_id, token_hash, type, expires_at) 
       VALUES ($1, $2, 'refresh', $3)`,
      [user.id, refreshHash, expiresAt]
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Refresh Token Rotation
router.post('/refresh', async (req, res, next) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  const tokenHash = hashToken(refreshToken);

  try {
    const tokenResult = await pool.query(
      `SELECT id, user_id, expires_at FROM auth_tokens 
       WHERE token_hash = $1 AND type = 'refresh' AND used_at IS NULL`,
      [tokenHash]
    );

    if (tokenResult.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const { id: tokenId, user_id: userId, expires_at: expiresAt } = tokenResult.rows[0];

    if (new Date() > new Date(expiresAt)) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Fetch user and make sure they are active
    const userResult = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    if (userResult.rowCount === 0 || !userResult.rows[0].is_active) {
      return res.status(403).json({ error: 'Account disabled or deleted' });
    }
    const user = userResult.rows[0];

    // Token rotation
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(userId);
    const newRefreshHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query('BEGIN');
    // Invalidate old token
    await pool.query('UPDATE auth_tokens SET used_at = now() WHERE id = $1', [tokenId]);
    // Save new token
    await pool.query(
      `INSERT INTO auth_tokens (user_id, token_hash, type, expires_at) 
       VALUES ($1, $2, 'refresh', $3)`,
      [userId, newRefreshHash, newExpiresAt]
    );
    await pool.query('COMMIT');

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
});

// Logout
router.post('/logout', async (req, res, next) => {
  const { refreshToken } = req.cookies;
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    try {
      await pool.query(
        "UPDATE auth_tokens SET used_at = now() WHERE token_hash = $1 AND type = 'refresh'",
        [tokenHash]
      );
    } catch (error) {
      // Log error but continue clearing cookie
      console.error('Logout token revocation error:', error);
    }
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ message: 'Logged out successfully' });
});

// Forgot Password
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  const { email } = req.body;

  try {
    const userResult = await pool.query('SELECT id, name FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    if (userResult.rowCount === 0) {
      // Avoid enumerating users by responding with success even if email not found
      return res.json({ message: 'If that email exists, a password reset link has been sent.' });
    }

    const user = userResult.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await pool.query(
      `INSERT INTO auth_tokens (user_id, token_hash, type, expires_at) 
       VALUES ($1, $2, 'password_reset', $3)`,
      [user.id, tokenHash, expiresAt]
    );

    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: email,
      subject: 'Reset Your Password',
      body: `Hi ${user.name},\n\nYou requested a password reset. Reset your password by clicking here: ${resetLink}`,
    });

    res.json({ message: 'If that email exists, a password reset link has been sent.' });
  } catch (error) {
    next(error);
  }
});

// Reset Password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  const { token, password } = req.body;
  const tokenHash = hashToken(token);

  try {
    const tokenResult = await pool.query(
      `SELECT id, user_id, expires_at FROM auth_tokens 
       WHERE token_hash = $1 AND type = 'password_reset' AND used_at IS NULL`,
      [tokenHash]
    );

    if (tokenResult.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or already used password reset token' });
    }

    const { id: tokenId, user_id: userId, expires_at: expiresAt } = tokenResult.rows[0];

    if (new Date() > new Date(expiresAt)) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query('BEGIN');
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    await pool.query('UPDATE auth_tokens SET used_at = now() WHERE id = $1', [tokenId]);
    // Revoke all refresh tokens for this user for security
    await pool.query("UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND type = 'refresh'", [userId]);
    await pool.query('COMMIT');

    res.json({ message: 'Password reset successful. Please login with your new password.' });
  } catch (error) {
    await pool.query('ROLLBACK');
    next(error);
  }
});

// Get profile
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, avatar_url, role, is_email_verified, notification_prefs FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/profile', authenticate, validate(profileSchema), async (req, res, next) => {
  const { name, phone, avatar_url, notification_prefs } = req.body;

  try {
    const userResult = await pool.query('SELECT name, phone, avatar_url, notification_prefs FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const current = userResult.rows[0];
    const newName = name !== undefined ? name : current.name;
    const newPhone = phone !== undefined ? phone : current.phone;
    const newAvatarUrl = avatar_url !== undefined ? avatar_url : current.avatar_url;
    const newPrefs = notification_prefs !== undefined ? JSON.stringify(notification_prefs) : JSON.stringify(current.notification_prefs);

    await pool.query(
      `UPDATE users 
       SET name = $1, phone = $2, avatar_url = $3, notification_prefs = $4, updated_at = now() 
       WHERE id = $5`,
      [newName, newPhone, newAvatarUrl, newPrefs, req.user.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
