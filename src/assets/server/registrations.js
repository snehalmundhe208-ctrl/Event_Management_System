import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import pool from '../db/client.js';
import { validate } from '../middleware/validation.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { addJob } from '../services/queue.js';

const router = express.Router();

const registerSchema = z.object({
  is_group_booking: z.boolean().default(false),
  group_size: z.number().int().min(1).default(1),
  custom_field_responses: z.record(z.any()).default({}),
  members: z.array(
    z.object({
      name: z.string().min(2).max(120),
      email: z.string().email().max(255),
      phone: z.string().max(20).optional(),
    })
  ).default([]),
});

// Helper: Generate signed ticket for registration
export const issueTicket = async (registrationId, client) => {
  const code = 'TCK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const hmac = crypto.createHmac('sha256', process.env.TICKET_HMAC_SECRET || 'fallback_secret');
  hmac.update(code);
  const qrHash = hmac.digest('hex');

  const ticketResult = await client.query(
    `INSERT INTO tickets (registration_id, ticket_code, qr_payload_hash) 
     VALUES ($1, $2, $3) RETURNING *`,
    [registrationId, code, qrHash]
  );
  
  const ticket = ticketResult.rows[0];
  
  // Schedule PDF generation asynchronously in background
  addJob('tickets', 'ticket_pdf_generate', { ticketId: ticket.id }).catch((err) => {
    console.error('Failed to queue PDF ticket generation:', err);
  });

  return ticket;
};

// Helper: Promote waitlisted attendees if capacity permits
const promoteWaitlist = async (eventId, client) => {
  // Lock the event and get capacity info
  const eventRes = await client.query(
    `SELECT capacity, requires_approval FROM events WHERE id = $1 FOR UPDATE`,
    [eventId]
  );
  if (eventRes.rowCount === 0) return;
  const { capacity, requires_approval } = eventRes.rows[0];

  // Count current confirmed registrations
  const countRes = await client.query(
    `SELECT COALESCE(SUM(group_size), 0) as total FROM registrations 
     WHERE event_id = $1 AND status IN ('confirmed', 'pending_approval')`,
    [eventId]
  );
  const currentConfirmed = parseInt(countRes.rows[0].total, 10);
  let available = capacity - currentConfirmed;

  if (available <= 0) return;

  // Get waitlist ordered by date
  const waitlistRes = await client.query(
    `SELECT id, group_size, user_id FROM registrations 
     WHERE event_id = $1 AND status = 'waitlisted' 
     ORDER BY registered_at ASC FOR UPDATE`,
    [eventId]
  );

  for (const waitItem of waitlistRes.rows) {
    if (waitItem.group_size <= available) {
      const nextStatus = requires_approval ? 'pending_approval' : 'confirmed';
      
      // Update registration status
      await client.query(
        `UPDATE registrations SET status = $1 WHERE id = $2`,
        [nextStatus, waitItem.id]
      );

      // Create ticket if confirmed
      if (nextStatus === 'confirmed') {
        await issueTicket(waitItem.id, client);
      }

      available -= waitItem.group_size;
      
      // Log audit
      console.log(`[Waitlist] Promoted registration ${waitItem.id} to status ${nextStatus}`);

      if (available <= 0) break;
    }
  }
};

// 1. Fetch all registrations for the current user
router.get('/my-registrations', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.event_id, r.status, r.registered_at, r.cancelled_at,
              e.title AS event_title, e.start_at,
              t.ticket_code
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN tickets t ON t.registration_id = r.id
       WHERE r.user_id = $1
       ORDER BY r.registered_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// 2. Fetch current user's registration status for an event
router.get('/events/:id/my-registration', authenticate, async (req, res, next) => {
  const eventId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT r.*, t.ticket_code, t.is_valid FROM registrations r
       LEFT JOIN tickets t ON t.registration_id = r.id
       WHERE r.event_id = $1 AND r.user_id = $2`,
      [eventId, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Not registered' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// 3. Register for Event (Race-condition safe)
router.post('/events/:id/register', authenticate, validate(registerSchema), async (req, res, next) => {
  const eventId = req.params.id;
  const { is_group_booking, group_size, custom_field_responses, members } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch event capacity details and lock the row
    const eventRes = await client.query(
      `SELECT capacity, status, registration_deadline, waitlist_enabled, requires_approval 
       FROM events WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [eventId]
    );

    if (eventRes.rowCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventRes.rows[0];

    if (event.status !== 'published') {
      return res.status(400).json({ error: 'Event is not open for registrations' });
    }

    if (event.registration_deadline && new Date() > new Date(event.registration_deadline)) {
      return res.status(400).json({ error: 'Registration deadline has passed' });
    }

    // 2. Count current confirmed bookings
    const countRes = await client.query(
      `SELECT COALESCE(SUM(group_size), 0) as total FROM registrations 
       WHERE event_id = $1 AND status IN ('confirmed', 'pending_approval')`,
      [eventId]
    );
    const currentConfirmed = parseInt(countRes.rows[0].total, 10);
    const available = event.capacity - currentConfirmed;

    // 3. Determine registration status
    let finalStatus = 'confirmed';
    if (group_size > available) {
      if (event.waitlist_enabled) {
        finalStatus = 'waitlisted';
      } else {
        return res.status(400).json({ error: 'Event has reached maximum capacity.' });
      }
    } else if (event.requires_approval) {
      finalStatus = 'pending_approval';
    }

    // 4. Create registration entry
    const regResult = await client.query(
      `INSERT INTO registrations (event_id, user_id, status, is_group_booking, group_size, custom_field_responses) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [eventId, req.user.id, finalStatus, is_group_booking, group_size, JSON.stringify(custom_field_responses)]
    );
    const reg = regResult.rows[0];

    // 5. Create group members entries if group booking
    if (is_group_booking && members.length > 0) {
      for (const m of members) {
        await client.query(
          `INSERT INTO registration_members (registration_id, name, email, phone) 
           VALUES ($1, $2, $3, $4)`,
          [reg.id, m.name, m.email, m.phone || null]
        );
      }
    }

    // 6. Generate ticket if immediately confirmed
    if (finalStatus === 'confirmed') {
      await issueTicket(reg.id, client);
    }

    await client.query('COMMIT');
    res.status(201).json(reg);
  } catch (error) {
    await client.query('ROLLBACK');
    // Handle unique constraint violations (already registered)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'You are already registered for this event.' });
    }
    next(error);
  } finally {
    client.release();
  }
});

// 3. Cancel Registration & Trigger Waitlist Promotion
router.post('/registrations/:id/cancel', authenticate, async (req, res, next) => {
  const regId = req.params.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch registration and check ownership
    const regRes = await client.query(
      'SELECT id, event_id, status, user_id FROM registrations WHERE id = $1 FOR UPDATE',
      [regId]
    );

    if (regRes.rowCount === 0) {
      return res.status(404).json({ error: 'Registration record not found' });
    }

    const reg = regRes.rows[0];
    if (reg.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized cancellation' });
    }

    if (reg.status === 'cancelled') {
      return res.status(400).json({ error: 'Registration is already cancelled' });
    }

    // Cancel registration
    await client.query(
      `UPDATE registrations SET status = 'cancelled', cancelled_at = now() WHERE id = $1`,
      [regId]
    );

    // Invalidate ticket if it exists
    await client.query(
      `UPDATE tickets SET is_valid = FALSE WHERE registration_id = $1`,
      [regId]
    );

    // If cancelled registration was active, promote waitlisted users
    if (reg.status === 'confirmed' || reg.status === 'pending_approval') {
      await promoteWaitlist(reg.event_id, client);
    }

    await client.query('COMMIT');
    res.json({ message: 'Registration cancelled successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// 4. Approve Pending Registration (Organizer/Admin only)
router.post('/registrations/:id/approve', authenticate, requireRole(['organizer', 'admin']), async (req, res, next) => {
  const regId = req.params.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch registration
    const regRes = await client.query(
      'SELECT id, event_id, status, group_size FROM registrations WHERE id = $1 FOR UPDATE',
      [regId]
    );

    if (regRes.rowCount === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const reg = regRes.rows[0];
    if (reg.status !== 'pending_approval') {
      return res.status(400).json({ error: 'Registration status is not pending approval' });
    }

    // Check capacity before approving
    const eventRes = await client.query(
      `SELECT capacity FROM events WHERE id = $1 FOR UPDATE`,
      [reg.event_id]
    );
    const capacity = eventRes.rows[0].capacity;

    const countRes = await client.query(
      `SELECT COALESCE(SUM(group_size), 0) as total FROM registrations 
       WHERE event_id = $1 AND status IN ('confirmed')`,
      [reg.event_id]
    );
    const currentConfirmed = parseInt(countRes.rows[0].total, 10);

    if (currentConfirmed + reg.group_size > capacity) {
      return res.status(400).json({ error: 'Cannot approve: Event is at maximum capacity.' });
    }

    // Update status to confirmed
    await client.query(
      `UPDATE registrations SET status = 'confirmed' WHERE id = $1`,
      [regId]
    );

    // Issue ticket
    await issueTicket(reg.id, client);

    await client.query('COMMIT');
    res.json({ message: 'Registration approved and ticket issued.' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Get ticket details by ticket code (used for viewing and scanning)
router.get('/tickets/:code', async (req, res, next) => {
  const { code } = req.params;

  try {
    const result = await pool.query(
      `SELECT t.*, r.status, u.name as attendee_name, u.email as attendee_email,
              e.id as event_id, e.title as event_title, e.start_at, e.venue_name, e.venue_address, e.online_link, e.event_type
       FROM tickets t
       JOIN registrations r ON t.registration_id = r.id
       JOIN users u ON r.user_id = u.id
       JOIN events e ON r.event_id = e.id
       WHERE t.ticket_code = $1`,
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
