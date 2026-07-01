const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/error');

const authRoutes = require('./modules/auth/auth.routes');
const eventsRoutes = require('./modules/events/events.routes');
const registrationsRoutes = require('./modules/registrations/registrations.routes');
const ticketsRoutes = require('./modules/tickets/tickets.routes');
const checkinRoutes = require('./modules/checkin/checkin.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const feedbackRoutes = require('./modules/feedback/feedback.routes');
const galleryRoutes = require('./modules/gallery/gallery.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const commentsRoutes = require('./modules/comments/comments.routes');
const followsRoutes = require('./modules/follows/follows.routes');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/events', eventsRoutes);
app.use('/api/v1/registrations', registrationsRoutes);
app.use('/api/v1/tickets', ticketsRoutes);
app.use('/api/v1/checkin', checkinRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/gallery', galleryRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/events/:eventId/comments', commentsRoutes);
app.use('/api/v1/follows', followsRoutes);

app.use(errorHandler);

module.exports = app;
