/**
 * Notices & Announcements Management Routes
 * KSIT CSE (ICB) Department Management Portal
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/notices
 */
router.get('/', (req, res) => {
  const store = db.getDbStore();
  const { category, search, role } = req.query;
  let items = [...(store.notices || [])];

  if (category && category !== 'all') {
    items = items.filter(n => n.category.toLowerCase() === category.toLowerCase());
  }

  if (role && role !== 'all') {
    items = items.filter(n => n.target_role === role || n.target_role === 'all');
  }

  if (search) {
    const s = search.toLowerCase();
    items = items.filter(n =>
      n.title.toLowerCase().includes(s) ||
      n.description.toLowerCase().includes(s) ||
      (n.author && n.author.toLowerCase().includes(s))
    );
  }

  res.json(items);
});

/**
 * POST /api/notices
 * Teacher and Department post circular
 */
router.post('/', authenticateToken, requireRole('teacher', 'department'), async (req, res) => {
  const store = db.getDbStore();
  const { title, description, category, priority, target_role } = req.body;

  if (!title || !description) {
    return res.status(400).json({ success: false, error: 'Notice Title and Description are required.' });
  }

  const authorName = req.user ? req.user.name : (req.body.author || 'Dr. Kushal Kumar B. N.');
  const newNotice = {
    id: store.notices.length + 1,
    title: title.trim(),
    description: description.trim(),
    category: category || 'General',
    priority: priority || 'Normal',
    is_new: true,
    target_role: target_role || 'all',
    date_posted: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    author: authorName
  };

  await db.insertRecord('notices', newNotice,
    'INSERT INTO notices (id, title, description, category, priority, is_new, target_role, date_posted, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [newNotice.id, newNotice.title, newNotice.description, newNotice.category, newNotice.priority, 1, newNotice.target_role, new Date().toISOString().split('T')[0], newNotice.author]
  );

  // Send notification to users
  store.notifications.unshift({
    id: store.notifications.length + 1,
    user_id: 1,
    title: `Notice: ${newNotice.title}`,
    message: `${newNotice.author} released a new ${newNotice.category} notice.`,
    type: 'notice',
    is_read: false,
    time: 'Just now'
  });
  db.saveMemoryDb();

  res.status(201).json({
    success: true,
    message: `Notice "${newNotice.title}" broadcasted successfully!`,
    notice: newNotice
  });
});

/**
 * DELETE /api/notices/:id
 */
router.delete('/:id', authenticateToken, requireRole('teacher', 'department'), async (req, res) => {
  const store = db.getDbStore();
  const id = parseInt(req.params.id, 10);
  const index = store.notices.findIndex(n => n.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Notice not found.' });
  }

  const [removed] = store.notices.splice(index, 1);
  db.saveMemoryDb();

  res.json({
    success: true,
    message: `Notice "${removed.title}" deleted successfully!`
  });
});

module.exports = router;
