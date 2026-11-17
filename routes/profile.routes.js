/**
 * User & Profile Management Routes
 * KSIT CSE (ICB) Department Management Portal
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAuth } = require('../middleware/auth');

/**
 * GET /api/profile
 */
router.get('/', authenticateToken, (req, res) => {
  const store = db.getDbStore();
  const userId = req.user ? req.user.id : 1;
  const user = store.users.find(u => u.id === userId) || store.users[0];

  let profile = {};
  if (user.role === 'student') {
    profile = store.students.find(s => s.user_id === user.id) || store.students[0];
  } else if (user.role === 'teacher') {
    profile = store.teachers.find(t => t.user_id === user.id) || store.teachers[0];
  } else {
    profile = { designation: 'Head of Department', department: 'CSE (ICB)', employee_id: 'KSIT-HOD-001' };
  }

  res.json({
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
 * PUT /api/profile
 * Update user profile details
 */
router.put('/', authenticateToken, async (req, res) => {
  const store = db.getDbStore();
  const userId = req.user ? req.user.id : 1;
  const user = store.users.find(u => u.id === userId) || store.users[0];

  const { name, email, phone, blood_group, mentor_name, qualification, designation } = req.body;

  if (name) user.name = name.trim();
  if (email) user.email = email.trim();
  if (phone) user.phone = phone.trim();

  let profile = null;
  if (user.role === 'student') {
    profile = store.students.find(s => s.user_id === user.id) || store.students[0];
    if (profile) {
      if (name) profile.name = user.name;
      if (blood_group) profile.blood_group = blood_group;
      if (mentor_name) profile.mentor_name = mentor_name;
    }
  } else if (user.role === 'teacher') {
    profile = store.teachers.find(t => t.user_id === user.id) || store.teachers[0];
    if (profile) {
      if (name) profile.name = user.name;
      if (qualification) profile.qualification = qualification;
      if (designation) profile.designation = designation;
    }
  }

  db.saveMemoryDb();

  res.json({
    success: true,
    message: 'Profile information saved and synchronized with database!',
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone
    },
    profile
  });
});

module.exports = router;
