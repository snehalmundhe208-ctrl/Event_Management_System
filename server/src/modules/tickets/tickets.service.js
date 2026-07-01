const crypto = require('crypto');
const db = require('../../config/db');

const generateTicket = async (registrationId, client) => {
  const ticketCode = 'TIC-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  const hmacSignature = crypto
    .createHmac('sha256', process.env.TICKET_HMAC_SECRET || 'secret')
    .update(ticketCode)
    .digest('hex');

  const dbClient = client || db;
  const ticketRes = await dbClient.query(
    'INSERT INTO tickets (registration_id, ticket_code, hmac_signature) VALUES ($1, $2, $3) RETURNING *',
    [registrationId, ticketCode, hmacSignature]
  );
  return ticketRes.rows[0];
};

const getTicketDetails = async (ticketId, userId) => {
  const res = await db.query(
    `SELECT t.*, r.event_id, r.user_id as attendee_id, e.organizer_id, e.title as event_title, e.start_date, e.location, e.type as event_type, u.name as attendee_name
     FROM tickets t
     JOIN registrations r ON t.registration_id = r.id
     JOIN events e ON r.event_id = e.id
     JOIN users u ON r.user_id = u.id
     WHERE t.id = $1`,
    [ticketId]
  );
  if (res.rows.length === 0) {
    const error = new Error('Ticket not found');
    error.statusCode = 404;
    throw error;
  }
  const ticket = res.rows[0];
  const isOwner = ticket.attendee_id === userId;
  const isOrganizer = ticket.organizer_id === userId;
  const isAdmin = false;
  if (!isOwner && !isOrganizer) {
    const userRoleRes = await db.query('SELECT roles FROM users WHERE id = $1', [userId]);
    const roles = userRoleRes.rows[0]?.roles || [];
    if (!roles.includes('admin') && !roles.includes('organizer')) {
      const error = new Error('Forbidden');
      error.statusCode = 403;
      throw error;
    }
  }
  return ticket;
};

module.exports = {
  generateTicket,
  getTicketDetails
};
