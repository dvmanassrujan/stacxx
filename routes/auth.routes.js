/**
 * Authentication & User Management Routes
 * KSIT CSE (ICB) Department Management Portal
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword, verifyPassword, generateToken } = require('../utils/auth');
const { authenticateToken, requireAuth } = require('../middleware/auth');

/**
 * GET /api/auth/roles
 * List demo accounts for instant role switcher
 */
router.get('/roles', (req, res) => {
  const accounts = [
    { id: 1, username: 'hussain', role: 'student', name: 'Hussain Basha', subtitle: '1st Year • CSE (ICB)', usn: '1KS25IC023' },
    { id: 2, username: 'manas', role: 'student', name: 'D V Manas Srujan', subtitle: '1st Year • CSE (ICB)', usn: '1KS25IC015' },
    { id: 5, username: 'prof_kavya', role: 'teacher', name: 'Prof. Kavya K. S. (Math)', subtitle: 'Assistant Professor (Math) • CSE (ICB)', empid: 'KSIT-FAC-014' },
    { id: 8, username: 'dr_kushal', role: 'department', name: 'Dr. Kushal Kumar B. N.', subtitle: 'Head of Department • CSE (ICB)', empid: 'KSIT-HOD-001' }
  ];
  res.json(accounts);
});

/**
 * POST /api/auth/login
 * Authenticates user and issues signed Bearer token
 */
router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  const store = db.getDbStore();

  let user = null;
  if (username) {
    const uname = username.toLowerCase().trim();
    user = store.users.find(u => u.username.toLowerCase() === uname);
    if (!user && (uname === 'prof_kavya' || uname === 'prof_sharma' || uname === 'kavya')) {
      user = store.users.find(u => u.role === 'teacher');
    }
    if (!user && (uname === 'dr_kushal' || uname === 'dr_kumar' || uname === 'kushal' || uname === 'hod')) {
      user = store.users.find(u => u.role === 'department');
    }
    if (user && password) {
      const isValid = verifyPassword(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid username or password.' });
      }
    }
  } else if (role) {
    // 1-Click Role Switcher
    user = store.users.find(u => u.role === role);
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'User not found. Try demo users: hussain, prof_kavya, or dr_kushal.'
    });
  }

  // Issue real signed token
  const token = generateToken(user);

  // Retrieve role-specific profile
  let profile = {};
  if (user.role === 'student') {
    profile = store.students.find(s => s.user_id === user.id) || store.students[0];
  } else if (user.role === 'teacher') {
    profile = store.teachers.find(t => t.user_id === user.id) || store.teachers[0];
  } else {
    profile = {
      name: 'Dr. Kushal Kumar B. N.',
      designation: 'Head of Department',
      department: 'CSE (ICB)',
      employee_id: 'KSIT-HOD-001',
      office: 'HOD Desk • Academic Block'
    };
  }

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url
    },
    profile
  });
});

/**
 * POST /api/auth/register
 * Register a new student or faculty account with secure password hashing
 */
router.post('/register', async (req, res) => {
  const { username, password, name, email, role, usn, semester, section, employee_id, designation } = req.body;
  const store = db.getDbStore();

  if (!username || !password || !name || !email) {
    return res.status(400).json({ success: false, error: 'Username, password, name, and email are required.' });
  }

  // Check duplicate
  const exists = store.users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(409).json({ success: false, error: 'Username or email already exists in system.' });
  }

  const assignedRole = ['student', 'teacher', 'department'].includes(role) ? role : 'student';
  const hashedPassword = hashPassword(password);
  const newUserId = store.users.length + 1;

  const newUser = {
    id: newUserId,
    username: username.toLowerCase().trim(),
    password_hash: hashedPassword,
    role: assignedRole,
    name: name.trim(),
    email: email.trim(),
    phone: req.body.phone || '+91 98450 00000',
    avatar_url: `/assets/avatars/${assignedRole}.png`
  };

  await db.insertRecord('users', newUser,
    'INSERT INTO users (id, username, password_hash, role, name, email, phone, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [newUser.id, newUser.username, newUser.password_hash, newUser.role, newUser.name, newUser.email, newUser.phone, newUser.avatar_url]
  );

  let profile = {};
  if (assignedRole === 'student') {
    const newStudent = {
      id: store.students.length + 1,
      user_id: newUserId,
      usn: (usn || `1KS25IC${String(newUserId).padStart(3, '0')}`).toUpperCase(),
      name: newUser.name,
      year: '1st Year',
      semester: parseInt(semester, 10) || 1,
      section: section || 'A',
      department: 'CSE (ICB)',
      cgpa: 8.0,
      present_days: 0,
      total_days: 0,
      attendance_pct: 100,
      blood_group: 'O+',
      mentor_name: 'Prof. Kavya K. S. (Math)'
    };
    await db.insertRecord('students', newStudent,
      'INSERT INTO students (id, user_id, usn, name, year, semester, section, department, cgpa, present_days, total_days, blood_group, mentor_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newStudent.id, newStudent.user_id, newStudent.usn, newStudent.name, newStudent.year, newStudent.semester, newStudent.section, newStudent.department, newStudent.cgpa, newStudent.present_days, newStudent.total_days, newStudent.blood_group, newStudent.mentor_name]
    );
    profile = newStudent;
  } else if (assignedRole === 'teacher') {
    const newTeacher = {
      id: store.teachers.length + 1,
      user_id: newUserId,
      employee_id: employee_id || `KSIT-FAC-${String(newUserId).padStart(3, '0')}`,
      name: newUser.name,
      designation: designation || 'Assistant Professor',
      department: 'CSE (ICB)',
      qualification: 'M.Tech',
      classes_today: 3,
      total_students: 45,
      pending_evaluations: 0,
      notices_count: 2
    };
    await db.insertRecord('teachers', newTeacher,
      'INSERT INTO teachers (id, user_id, employee_id, name, designation, department, qualification) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [newTeacher.id, newTeacher.user_id, newTeacher.employee_id, newTeacher.name, newTeacher.designation, newTeacher.department, newTeacher.qualification]
    );
    profile = newTeacher;
  }

  const token = generateToken(newUser);

  res.status(201).json({
    success: true,
    message: 'User registered successfully!',
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      email: newUser.email
    },
    profile
  });
});

/**
 * GET /api/auth/me
 * Protected: Get current user session
 */
router.get('/me', authenticateToken, requireAuth, (req, res) => {
  const store = db.getDbStore();
  const user = store.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  let profile = {};
  if (user.role === 'student') {
    profile = store.students.find(s => s.user_id === user.id) || store.students[0];
  } else if (user.role === 'teacher') {
    profile = store.teachers.find(t => t.user_id === user.id) || store.teachers[0];
  } else {
    profile = { designation: 'Department Administration', department: 'CSE (ICB)', employee_id: 'KSIT-HOD-001' };
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url
    },
    profile
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;
