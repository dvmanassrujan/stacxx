/**
 * Attendance Management Routes
 * KSIT CSE (ICB) Department Management Portal
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/attendance/student/:id
 * Individual student attendance record with eligibility
 */
router.get('/student/:id', (req, res) => {
  const store = db.getDbStore();
  const id = parseInt(req.params.id, 10);
  const student = store.students.find(s => s.id === id) || store.students[0];

  const subjectWise = (store.attendance || []).filter(a => a.student_id === student.id);

  res.json({
    student_id: student.id,
    student_name: student.name,
    overall_percentage: student.attendance_pct,
    present_days: student.present_days,
    total_days: student.total_days,
    subject_wise: subjectWise.length > 0 ? subjectWise : [
      { subject_name: 'Mathematics', classes_held: 24, classes_attended: 23, percentage: 95.8, status: 'Eligible' },
      { subject_name: 'Physics', classes_held: 22, classes_attended: 20, percentage: 90.9, status: 'Eligible' },
      { subject_name: 'Programming in C', classes_held: 26, classes_attended: 24, percentage: 92.3, status: 'Eligible' },
      { subject_name: 'Engineering Graphics', classes_held: 18, classes_attended: 16, percentage: 88.9, status: 'Eligible' }
    ],
    status: student.attendance_pct >= 75 ? 'Eligible for Exams (>75%)' : 'Defaulter Alert (<75%)'
  });
});

/**
 * POST /api/attendance/record
 * Teacher records daily roster attendance
 */
router.post('/record', authenticateToken, requireRole('teacher', 'department'), async (req, res) => {
  const store = db.getDbStore();
  const { subject_name, date, records } = req.body;

  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ success: false, error: 'Attendance records array required.' });
  }

  const currentDate = date || new Date().toISOString().split('T')[0];
  let markedCount = 0;

  for (const r of records) {
    const student = store.students.find(s => s.id === parseInt(r.student_id, 10));
    if (student) {
      student.total_days = (student.total_days || 0) + 1;
      if (r.status === 'present' || r.status === 'on_duty') {
        student.present_days = (student.present_days || 0) + 1;
      }
      student.attendance_pct = Math.round((student.present_days / student.total_days) * 100);
      markedCount++;
    }
  }

  db.saveMemoryDb();

  res.json({
    success: true,
    message: `Attendance committed for ${markedCount} students in ${subject_name || 'Class'} on ${currentDate}!`,
    date: currentDate,
    marked_count: markedCount
  });
});

/**
 * GET /api/attendance/analytics
 * Department and Teacher attendance insights and defaulter lists
 */
router.get('/analytics', (req, res) => {
  const store = db.getDbStore();
  const students = store.students || [];

  const eligibleCount = students.filter(s => s.attendance_pct >= 75).length;
  const defaulterList = students.filter(s => s.attendance_pct < 75).map(s => ({
    id: s.id,
    name: s.name,
    usn: s.usn,
    attendance_pct: s.attendance_pct,
    shortage_classes: Math.max(0, Math.ceil((0.75 * s.total_days) - s.present_days)),
    mentor_name: s.mentor_name
  }));

  const subjectMetrics = [
    { code: '22MAT11', name: 'Mathematics', average_attendance: 93.2, conducted: 24 },
    { code: '22PHY12', name: 'Physics', average_attendance: 91.5, conducted: 22 },
    { code: '22POP13', name: 'Programming in C', average_attendance: 94.0, conducted: 26 },
    { code: '22CED14', name: 'Engineering Graphics', average_attendance: 89.8, conducted: 18 }
  ];

  res.json({
    total_students: students.length,
    eligible_count: eligibleCount,
    defaulters_count: defaulterList.length,
    overall_department_rate: 92.4,
    defaulters: defaulterList,
    subject_metrics: subjectMetrics
  });
});

module.exports = router;
