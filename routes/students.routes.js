/**
 * Students Management Routes
 * KSIT CSE (ICB) Department Management Portal
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/students
 * List all students with search and semester filtering
 */
router.get('/', (req, res) => {
  const store = db.getDbStore();
  let students = [...store.students];
  const { search, semester, section } = req.query;

  if (semester && semester !== 'all') {
    students = students.filter(s => s.semester === parseInt(semester, 10));
  }

  if (section && section !== 'all') {
    students = students.filter(s => s.section.toLowerCase() === section.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    students = students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.usn.toLowerCase().includes(q) ||
      (s.mentor_name && s.mentor_name.toLowerCase().includes(q))
    );
  }

  res.json(students);
});

/**
 * POST /api/students
 * Add new student record (Teacher & Department)
 */
router.post('/', authenticateToken, requireRole('teacher', 'department'), async (req, res) => {
  const store = db.getDbStore();
  const { name, usn, semester, section, mentor_name, blood_group } = req.body;

  if (!name || !usn) {
    return res.status(400).json({ success: false, error: 'Student Name and USN are required.' });
  }

  const cleanUsn = usn.trim().toUpperCase();
  if (store.students.some(s => s.usn === cleanUsn)) {
    return res.status(409).json({ success: false, error: `Student with USN ${cleanUsn} already exists.` });
  }

  const newId = store.students.length + 1;
  const newUserId = store.users.length + 1;

  // Create corresponding user account
  const newUser = {
    id: newUserId,
    username: cleanUsn.toLowerCase(),
    password_hash: 'password123',
    role: 'student',
    name: name.trim(),
    email: `${cleanUsn.toLowerCase()}@ksit.edu.in`,
    phone: '+91 98450 00000',
    avatar_url: '/assets/avatars/student.png'
  };
  await db.insertRecord('users', newUser,
    'INSERT INTO users (id, username, password_hash, role, name, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [newUser.id, newUser.username, newUser.password_hash, newUser.role, newUser.name, newUser.email, newUser.phone]
  );

  const newStudent = {
    id: newId,
    user_id: newUserId,
    usn: cleanUsn,
    name: name.trim(),
    year: '1st Year',
    semester: parseInt(semester, 10) || 1,
    section: section ? section.toUpperCase() : 'A',
    department: 'CSE (ICB)',
    cgpa: 8.00,
    present_days: 0,
    total_days: 0,
    attendance_pct: 100,
    blood_group: blood_group || 'O+',
    mentor_name: mentor_name || 'Prof. Kavya K. S. (Math)'
  };

  await db.insertRecord('students', newStudent,
    'INSERT INTO students (id, user_id, usn, name, year, semester, section, department, cgpa, present_days, total_days, blood_group, mentor_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [newStudent.id, newStudent.user_id, newStudent.usn, newStudent.name, newStudent.year, newStudent.semester, newStudent.section, newStudent.department, newStudent.cgpa, newStudent.present_days, newStudent.total_days, newStudent.blood_group, newStudent.mentor_name]
  );

  res.status(201).json({
    success: true,
    message: `Student ${newStudent.name} (${cleanUsn}) enrolled successfully!`,
    student: newStudent
  });
});

/**
 * PUT /api/students/:id
 * Update student record (Teacher & Department)
 */
router.put('/:id', authenticateToken, requireRole('teacher', 'department'), async (req, res) => {
  const store = db.getDbStore();
  const id = parseInt(req.params.id, 10);
  const student = store.students.find(s => s.id === id);

  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found.' });
  }

  const { name, semester, section, mentor_name, cgpa, blood_group } = req.body;
  if (name) student.name = name.trim();
  if (semester) student.semester = parseInt(semester, 10);
  if (section) student.section = section.toUpperCase();
  if (mentor_name) student.mentor_name = mentor_name;
  if (cgpa !== undefined) student.cgpa = parseFloat(cgpa);
  if (blood_group) student.blood_group = blood_group;

  db.saveMemoryDb();

  res.json({
    success: true,
    message: 'Student record updated successfully!',
    student
  });
});

/**
 * DELETE /api/students/:id
 * Delete student record (Department Admin only)
 */
router.delete('/:id', authenticateToken, requireRole('department'), async (req, res) => {
  const store = db.getDbStore();
  const id = parseInt(req.params.id, 10);
  const index = store.students.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Student not found.' });
  }

  const [removed] = store.students.splice(index, 1);
  db.saveMemoryDb();

  res.json({
    success: true,
    message: `Student record ${removed.name} (${removed.usn}) deleted successfully!`
  });
});

module.exports = router;
