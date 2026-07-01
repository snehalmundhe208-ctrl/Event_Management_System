const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const userRes = await db.query(
      'SELECT id, email, roles, is_suspended FROM users WHERE id = $1',
      [decoded.id]
    );
    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }
    const user = userRes.rows[0];
    if (user.is_suspended) {
      return res.status(403).json({ message: 'User account is suspended' });
    }
    req.user = {
      id: user.id,
      email: user.email,
      roles: user.roles
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const userRes = await db.query(
      'SELECT id, email, roles, is_suspended FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0 || userRes.rows[0].is_suspended) {
      return next();
    }

    const user = userRes.rows[0];
    req.user = {
      id: user.id,
      email: user.email,
      roles: user.roles
    };
    next();
  } catch (error) {
    next();
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole
};
