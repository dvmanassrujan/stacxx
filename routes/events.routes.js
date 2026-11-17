/**
 * Events & Activities Management Routes
 * KSIT CSE (ICB) Department Management Portal
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/events
 */
router.get('/', (req, res) => {
  const store = db.getDbStore();
  res.json(store.events || []);
});

/**
 * POST /api/events/:id/register
 * Student registers for department technical event
 */
router.post('/:id/register', authenticateToken, async (req, res) => {
  const store = db.getDbStore();
  const id = parseInt(req.params.id, 10);
  const event = (store.events || []).find(e => e.id === id);

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found.' });
  }

  event.registered_count = (event.registered_count || 30) + 1;
  event.is_registered = true;

  // Add confirmation notification
  store.notifications.unshift({
    id: store.notifications.length + 1,
    user_id: req.user ? req.user.id : 1,
    title: `Registered: ${event.title}`,
    message: `You are confirmed for ${event.title} at ${event.venue} on ${event.event_date}.`,
    type: 'event',
    is_read: false,
    time: 'Just now'
  });

  db.saveMemoryDb();

  res.json({
    success: true,
    message: `Successfully registered for "${event.title}"! Hall ticket / pass confirmed.`,
    event
  });
});

/**
 * POST /api/events
 * Teacher & Dept create event
 */
router.post('/', authenticateToken, requireRole('teacher', 'department'), async (req, res) => {
  const store = db.getDbStore();
  const { title, category, event_date, time_range, venue, organizer, description } = req.body;

  if (!title || !event_date || !venue) {
    return res.status(400).json({ success: false, error: 'Title, Date, and Venue are required.' });
  }

  const dateObj = new Date(event_date);
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  const newEvent = {
    id: store.events.length + 1,
    title: title.trim(),
    category: category || 'Workshop',
    date_badge: {
      month: monthNames[dateObj.getMonth()] || 'OCT',
      day: String(dateObj.getDate()).padStart(2, '0')
    },
    event_date,
    time_range: time_range || '10:00 AM - 1:00 PM',
    venue: venue.trim(),
    organizer: organizer || 'CSE (ICB) Dept',
    description: description || 'Departmental technical event and workshop.',
    registered_count: 0
  };

  await db.insertRecord('events', newEvent,
    'INSERT INTO events (id, title, category, event_date, time_range, venue, organizer, description, registered_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [newEvent.id, newEvent.title, newEvent.category, newEvent.event_date, newEvent.time_range, newEvent.venue, newEvent.organizer, newEvent.description, 0]
  );

  res.status(201).json({
    success: true,
    message: `Event "${newEvent.title}" scheduled successfully!`,
    event: newEvent
  });
});

module.exports = router;
