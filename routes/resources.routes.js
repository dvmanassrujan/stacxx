/**
 * Academic Resource Hub Routes (Study Materials, Syllabus, PYQ, Papers)
 * KSIT CSE (ICB) Department Management Portal
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/resources
 */
router.get('/', (req, res) => {
  const store = db.getDbStore();
  let items = [...(store.study_materials || [])];
  const { category, semester, search } = req.query;

  if (category && category !== 'all') {
    items = items.filter(r => r.category.toLowerCase() === category.toLowerCase());
  }

  if (semester && semester !== 'all') {
    items = items.filter(r => r.semester === parseInt(semester, 10));
  }

  if (search) {
    const s = search.toLowerCase();
    items = items.filter(r =>
      r.title.toLowerCase().includes(s) ||
      (r.description && r.description.toLowerCase().includes(s)) ||
      (r.subject_name && r.subject_name.toLowerCase().includes(s))
    );
  }

  res.json({
    total: items.length,
    resources: items
  });
});

/**
 * POST /api/resources
 * Faculty uploads new study material or external link
 */
router.post('/', authenticateToken, requireRole('teacher', 'department'), async (req, res) => {
  const store = db.getDbStore();
  const { title, description, category, semester, subject_name, external_url } = req.body;

  if (!title || !category) {
    return res.status(400).json({ success: false, error: 'Title and Category are required.' });
  }

  const uploaderName = req.user ? req.user.name : 'Prof. Kavya K. S. (Math)';
  const newResource = {
    id: store.study_materials.length + 1,
    title: title.trim(),
    description: description || 'Academic lecture notes & reference material.',
    category,
    subject_id: 1,
    subject_name: subject_name || 'General Engineering',
    semester: parseInt(semester, 10) || 1,
    file_url: `/downloads/resource_${Date.now()}.pdf`,
    external_url: external_url || null,
    file_size: '2.4 MB',
    file_type: external_url ? 'LINK' : 'PDF',
    uploaded_by: uploaderName,
    downloads_count: 0,
    created_at: new Date().toISOString().split('T')[0]
  };

  await db.insertRecord('study_materials', newResource,
    'INSERT INTO study_materials (id, title, description, category, subject_id, semester, file_url, external_url, file_size, file_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [newResource.id, newResource.title, newResource.description, newResource.category, newResource.subject_id, newResource.semester, newResource.file_url, newResource.external_url, newResource.file_size, newResource.file_type, newResource.uploaded_by]
  );

  // Notify students
  store.notifications.unshift({
    id: store.notifications.length + 1,
    user_id: 1,
    title: 'New Study Material Available',
    message: `${newResource.title} has been uploaded to Academic Hub.`,
    type: 'resource',
    is_read: false,
    time: 'Just now'
  });
  db.saveMemoryDb();

  res.status(201).json({
    success: true,
    message: `Resource "${newResource.title}" published successfully!`,
    resource: newResource
  });
});

/**
 * DELETE /api/resources/:id
 */
router.delete('/:id', authenticateToken, requireRole('teacher', 'department'), async (req, res) => {
  const store = db.getDbStore();
  const id = parseInt(req.params.id, 10);
  const index = store.study_materials.findIndex(r => r.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Resource not found.' });
  }

  const [removed] = store.study_materials.splice(index, 1);
  db.saveMemoryDb();

  res.json({
    success: true,
    message: `Resource "${removed.title}" deleted successfully!`
  });
});

/**
 * GET /api/resources/:id/download
 */
router.get('/:id/download', (req, res) => {
  const store = db.getDbStore();
  const id = parseInt(req.params.id, 10);
  const resource = store.study_materials.find(r => r.id === id);

  if (!resource) {
    return res.status(404).json({ success: false, error: 'Resource not found.' });
  }

  resource.downloads_count = (resource.downloads_count || 0) + 1;
  db.saveMemoryDb();

  res.json({
    success: true,
    message: `Download started for "${resource.title}"`,
    file_url: resource.file_url || resource.external_url,
    downloads_count: resource.downloads_count
  });
});

module.exports = router;
