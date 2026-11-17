/**
 * Examination & Marks Management Routes
 * KSIT CSE (ICB) Department Management Portal
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/examinations
 */
router.get('/', (req, res) => {
  const store = db.getDbStore();
  res.json(store.examinations || []);
});

/**
 * GET /api/examinations/marks/student/:id
 */
router.get('/marks/student/:id', (req, res) => {
  const store = db.getDbStore();
  res.json(store.exam_marks || []);
});

/**
 * GET /api/examinations/marks/roster
 * Full roster of marks across subjects for teacher & department
 */
router.get('/marks/roster', (req, res) => {
  const store = db.getDbStore();
  const students = store.students || [];

  const roster = students.map((s, idx) => ({
    student_id: s.id,
    student_name: s.name,
    usn: s.usn,
    section: s.section,
    semester: s.semester,
    ia1_maths: 24,
    ia1_physics: 22,
    ia1_cprog: 25,
    ia1_graphics: 21,
    ia1_total: 92,
    ia1_percentage: 92.0,
    status: idx === 0 ? 'Approved' : 'Pending Moderation'
  }));

  res.json(roster);
});

/**
 * POST /api/examinations/marks/record
 * Teacher enters or updates marks
 */
router.post('/marks/record', authenticateToken, requireRole('teacher', 'department'), async (req, res) => {
  const store = db.getDbStore();
  const { student_id, subject_name, exam_type, marks_obtained, max_marks } = req.body;

  if (!student_id || !subject_name || marks_obtained === undefined) {
    return res.status(400).json({ success: false, error: 'Student ID, Subject, and Marks are required.' });
  }

  const marks = parseFloat(marks_obtained);
  const max = parseFloat(max_marks) || 25;

  let existing = (store.exam_marks || []).find(m => m.subject === subject_name && m.exam_type === exam_type);
  if (existing) {
    existing.scored = marks;
    existing.max = max;
    existing.grade = marks >= 0.9 * max ? 'O' : marks >= 0.8 * max ? 'A+' : marks >= 0.7 * max ? 'A' : 'B+';
    existing.status = 'Entered (Pending Approval)';
  } else {
    store.exam_marks.push({
      subject: subject_name,
      code: '22CSE11',
      exam_type: exam_type || 'Internal Assessment 1',
      scored: marks,
      max: max,
      grade: marks >= 0.85 * max ? 'A+' : 'A',
      status: 'Entered (Pending Approval)'
    });
  }

  db.saveMemoryDb();

  res.json({
    success: true,
    message: `Marks recorded successfully for ${subject_name} (${marks} / ${max})!`
  });
});

/**
 * POST /api/examinations/:id/approve
 * Department moderates and approves examination marks
 */
router.post('/:id/approve', authenticateToken, requireRole('department'), async (req, res) => {
  const store = db.getDbStore();
  const id = parseInt(req.params.id, 10);
  const exam = (store.examinations || []).find(e => e.id === id);

  if (!exam) {
    // If not found by numeric ID, moderate all marks
    if (store.exam_marks) {
      store.exam_marks.forEach(m => m.status = 'Approved by Department');
    }
  } else {
    exam.status = 'Approved';
  }

  db.saveMemoryDb();

  res.json({
    success: true,
    message: 'Examination and Marks Moderation approved by Dr. Kushal Kumar B. N. (HOD)!'
  });
});

module.exports = router;
