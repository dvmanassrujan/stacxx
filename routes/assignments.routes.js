/**
 * Assignments Management Routes (Faculty Management & Evaluations)
 * KSIT CSE (ICB) Department Management Portal
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/assignments
 */
router.get('/', (req, res) => {
  const store = db.getDbStore();
  const { status, subject } = req.query;
  let items = [...(store.assignments || [])];

  if (status && status !== 'all') {
    items = items.filter(a => a.status === status);
  }

  if (subject && subject !== 'all') {
    items = items.filter(a => a.subject_name.toLowerCase().includes(subject.toLowerCase()));
  }

  res.json(items);
});

/**
 * POST /api/assignments
 * Teacher creates a new assignment
 */
router.post('/', authenticateToken, requireRole('teacher', 'department'), async (req, res) => {
  const store = db.getDbStore();
  const { title, subject_name, semester, deadline, max_marks, description } = req.body;

  if (!title || !subject_name || !deadline) {
    return res.status(400).json({ success: false, error: 'Title, Subject, and Deadline are required.' });
  }

  const newAssignment = {
    id: store.assignments.length + 1,
    title: title.trim(),
    subject_name: subject_name.trim(),
    subject_id: 1,
    semester: parseInt(semester, 10) || 1,
    faculty_name: req.user ? req.user.name : 'Prof. Kavya K. S. (Math)',
    description: description || 'Complete the assigned problem set and review guidelines.',
    created_date: new Date().toISOString().split('T')[0],
    deadline,
    max_marks: parseInt(max_marks, 10) || 20,
    status: 'pending',
    submissions_count: 0,
    submitted_date: null,
    marks_obtained: null,
    feedback: null
  };

  await db.insertRecord('assignments', newAssignment,
    'INSERT INTO assignments (id, title, subject_id, semester, faculty_id, description, created_date, deadline, max_marks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [newAssignment.id, newAssignment.title, newAssignment.subject_id, newAssignment.semester, 1, newAssignment.description, newAssignment.created_date, newAssignment.deadline, newAssignment.max_marks]
  );

  // Notify students
  store.notifications.unshift({
    id: store.notifications.length + 1,
    user_id: 1,
    title: `New Assignment: ${newAssignment.title}`,
    message: `${newAssignment.faculty_name} published ${newAssignment.title} for ${newAssignment.subject_name} due on ${newAssignment.deadline}.`,
    type: 'assignment',
    is_read: false,
    time: 'Just now'
  });
  db.saveMemoryDb();

  res.status(201).json({
    success: true,
    message: `Assignment "${newAssignment.title}" published successfully!`,
    assignment: newAssignment
  });
});

/**
 * POST /api/assignments/:id/evaluate
 * Teacher evaluates student submission
 */
router.post('/:id/evaluate', authenticateToken, requireRole('teacher', 'department'), async (req, res) => {
  const store = db.getDbStore();
  const id = parseInt(req.params.id, 10);
  const { marks_obtained, feedback } = req.body;

  const assignment = store.assignments.find(a => a.id === id);
  if (!assignment) {
    return res.status(404).json({ success: false, error: 'Assignment not found.' });
  }

  const marks = parseFloat(marks_obtained);
  if (isNaN(marks) || marks < 0 || marks > assignment.max_marks) {
    return res.status(400).json({ success: false, error: `Marks must be between 0 and ${assignment.max_marks}.` });
  }

  assignment.status = 'evaluated';
  assignment.marks_obtained = marks;
  assignment.feedback = feedback ? feedback.trim() : 'Good work, verified by faculty.';

  db.saveMemoryDb();

  res.json({
    success: true,
    message: `Assignment marked: ${marks} / ${assignment.max_marks}!`,
    assignment
  });
});

/**
 * DELETE /api/assignments/:id
 * Teacher removes an assignment
 */
router.delete('/:id', authenticateToken, requireRole('teacher', 'department'), async (req, res) => {
  const store = db.getDbStore();
  const id = parseInt(req.params.id, 10);
  const index = store.assignments.findIndex(a => a.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Assignment not found.' });
  }

  const [removed] = store.assignments.splice(index, 1);
  db.saveMemoryDb();

  res.json({
    success: true,
    message: `Assignment "${removed.title}" deleted successfully!`
  });
});

module.exports = router;
