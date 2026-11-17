/**
 * Notifications Management Routes
 * KSIT CSE (ICB) Department Management Portal
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/notifications
 */
router.get('/', (req, res) => {
  const store = db.getDbStore();
  res.json(store.notifications || []);
});

/**
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', (req, res) => {
  const store = db.getDbStore();
  const id = parseInt(req.params.id, 10);
  const notif = (store.notifications || []).find(n => n.id === id);

  if (notif) {
    notif.is_read = true;
    db.saveMemoryDb();
  }

  res.json({ success: true, message: 'Notification marked as read.' });
});

/**
 * POST /api/notifications/read-all
 */
router.post('/read-all', (req, res) => {
  const store = db.getDbStore();
  if (store.notifications) {
    store.notifications.forEach(n => n.is_read = true);
    db.saveMemoryDb();
  }

  res.json({ success: true, message: 'All notifications marked as read.' });
});

module.exports = router;
