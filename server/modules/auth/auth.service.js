const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, roles: user.roles },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

const signup = async ({ email, password, name, roles }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existingUser.rows.length > 0) {
    const error = new Error('Email already registered');
    error.statusCode = 400;
    throw error;
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const userRes = await db.query(
    'INSERT INTO users (email, password_hash, name, roles) VALUES ($1, $2, $3, $4) RETURNING id, email, name, roles',
    [normalizedEmail, passwordHash, name, roles]
  );
  const user = userRes.rows[0];

  const tokens = generateTokens(user);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokens.refreshToken, expiresAt]
  );

  return { user, ...tokens };
};

const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const userRes = await db.query(
    'SELECT id, email, password_hash, name, roles, is_suspended FROM users WHERE email = $1',
    [normalizedEmail]
  );
  if (userRes.rows.length === 0) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const user = userRes.rows[0];
  if (user.is_suspended) {
    const error = new Error('Account suspended');
    error.statusCode = 403;
    throw error;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const tokens = generateTokens(user);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokens.refreshToken, expiresAt]
  );

  return {
    user: { id: user.id, email: user.email, name: user.name, roles: user.roles },
    ...tokens
  };
};

const refresh = async ({ refreshToken }) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const tokenRes = await db.query(
      'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token = $1',
      [refreshToken]
    );
    if (tokenRes.rows.length === 0) {
      const error = new Error('Invalid refresh token');
      error.statusCode = 401;
      throw error;
    }

    const dbToken = tokenRes.rows[0];
    if (new Date() > new Date(dbToken.expires_at)) {
      await db.query('DELETE FROM refresh_tokens WHERE id = $1', [dbToken.id]);
      const error = new Error('Refresh token expired');
      error.statusCode = 401;
      throw error;
    }

    const userRes = await db.query(
      'SELECT id, email, roles, is_suspended FROM users WHERE id = $1',
      [dbToken.user_id]
    );
    if (userRes.rows.length === 0 || userRes.rows[0].is_suspended) {
      const error = new Error('User not found or suspended');
      error.statusCode = 401;
      throw error;
    }

    const user = userRes.rows[0];
    const tokens = generateTokens(user);

    await db.query('DELETE FROM refresh_tokens WHERE id = $1', [dbToken.id]);

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokens.refreshToken, newExpiresAt]
    );

    return tokens;
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 401;
      error.message = 'Invalid token';
    }
    throw error;
  }
};

const getProfile = async (userId) => {
  const userRes = await db.query(
    'SELECT id, email, name, roles, is_suspended, created_at FROM users WHERE id = $1',
    [userId]
  );
  if (userRes.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return userRes.rows[0];
};

const updateProfile = async (userId, { email, name, roles }) => {
  const currentRes = await db.query('SELECT email, name, roles FROM users WHERE id = $1', [userId]);
  if (currentRes.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const current = currentRes.rows[0];
  const newEmail = email ? email.toLowerCase().trim() : current.email;
  const newName = name || current.name;
  const newRoles = roles || current.roles;

  if (email && newEmail !== current.email) {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [newEmail]);
    if (existing.rows.length > 0) {
      const error = new Error('Email already taken');
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedRes = await db.query(
    'UPDATE users SET email = $1, name = $2, roles = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, email, name, roles',
    [newEmail, newName, newRoles, userId]
  );
  return updatedRes.rows[0];
};

module.exports = {
  signup,
  login,
  refresh,
  getProfile,
  updateProfile
};
