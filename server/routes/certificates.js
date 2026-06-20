import express from 'express';
import pool from '../db/client.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/certificates', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, e.title AS event_title
       FROM certificates c
       JOIN events e ON c.event_id = e.id
       WHERE c.user_id = $1
       ORDER BY c.issued_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
