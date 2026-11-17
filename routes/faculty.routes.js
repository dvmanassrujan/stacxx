/**
 * Faculty Management Routes
 * KSIT CSE (ICB) Department Management Portal
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/faculty
 */
router.get('/', (req, res) => {
  const store = db.getDbStore();
  res.json(store.teachers || []);
});

/**
 * POST /api/faculty
 * Add faculty (Department only)
 */
router.post('/', authenticateToken, requireRole('department'), async (req, res) => {
  const store = db.getDbStore();
  const { name, employee_id, designation, department, qualification } = req.body;

  if (!name || !employee_id) {
    return res.status(400).json({ success: false, error: 'Faculty name and Employee ID are required.' });
  }

  const cleanEmpId = employee_id.trim().toUpperCase();
  if (store.teachers.some(t => t.employee_id === cleanEmpId)) {
    return res.status(409).json({ success: false, error: `Faculty with ID ${cleanEmpId} already exists.` });
  }

  const newId = store.teachers.length + 1;
  const newUserId = store.users.length + 1;

  const newUser = {
    id: newUserId,
    username: cleanEmpId.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    password_hash: 'password123',
    role: 'teacher',
    name: name.trim(),
    email: `${cleanEmpId.toLowerCase()}@ksit.edu.in`,
    phone: '+91 98450 00000',
    avatar_url: '/assets/avatars/teacher1.png'
  };
  await db.insertRecord('users', newUser);

  const newTeacher = {
    id: newId,
    user_id: newUserId,
    employee_id: cleanEmpId,
    name: name.trim(),
    designation: designation || 'Assistant Professor',
    department: department || 'CSE (ICB)',
    qualification: qualification || 'M.Tech',
    classes_today: 3,
    total_students: 45,
    pending_evaluations: 0,
    notices_count: 0
  };
  await db.insertRecord('teachers', newTeacher);

  res.status(201).json({
    success: true,
    message: `Faculty ${newTeacher.name} enrolled successfully!`,
    faculty: newTeacher
  });
});

/**
 * PUT /api/faculty/:id
 */
router.put('/:id', authenticateToken, requireRole('department'), async (req, res) => {
  const store = db.getDbStore();
  const id = parseInt(req.params.id, 10);
  const teacher = store.teachers.find(t => t.id === id);

  if (!teacher) {
    return res.status(404).json({ success: false, error: 'Faculty member not found.' });
  }

  const { name, designation, qualification } = req.body;
  if (name) teacher.name = name.trim();
  if (designation) teacher.designation = designation;
  if (qualification) teacher.qualification = qualification;

  db.saveMemoryDb();

  res.json({
    success: true,
    message: 'Faculty details updated successfully!',
    faculty: teacher
  });
});

module.exports = router;
