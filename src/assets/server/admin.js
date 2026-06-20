import express from 'express';
import { z } from 'zod';
import pool from '../db/client.js';
import { validate } from '../middleware/validation.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

const roleSchema = z.object({
  role: z.enum(['attendee', 'organizer', 'admin']),
});

const statusSchema = z.object({
  is_active: z.boolean(),
});

router.get('/admin/users', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, is_email_verified, created_at
       FROM users
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/users/:id/role', authenticate, requireRole(['admin']), validate(roleSchema), async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE users
       SET role = $1, updated_at = now()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, role`,
      [req.body.role, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/users/:id/suspend', authenticate, requireRole(['admin']), validate(statusSchema), async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE users
       SET is_active = $1, updated_at = now()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, is_active`,
      [req.body.is_active, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.get('/admin/audit-logs', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 100`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
