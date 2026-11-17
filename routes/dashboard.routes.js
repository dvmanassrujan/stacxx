/**
 * Role-Based Dashboard Routes
 * KSIT CSE (ICB) Department Management Portal
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/dashboard/student
 */
router.get('/student', (req, res) => {
  const store = db.getDbStore();
  const student = store.students[0]; // Primary student Hussain Basha

  res.json({
    student: {
      name: student.name,
      usn: student.usn,
      year: student.year,
      semester: student.semester,
      department: student.department,
      institution: 'K. S. Institute of Technology, Bengaluru',
      welcomeQuote: 'The future belongs to those who keep learning.',
      subQuoteTag: 'Learn • Build • Grow',
      date: 'Monday, 29 Sep 2025',
      weather: '28°C Partly Cloudy Bengaluru'
    },
    summaryCards: {
      attendance: {
        percentage: `${student.attendance_pct}%`,
        sublabel: `Present Days: ${student.present_days} / ${student.total_days}`,
        icon: 'attendance'
      },
      cgpa: {
        score: student.cgpa.toFixed(2),
        grade: 'A+',
        sublabel: 'Sem 1 • 1st Year',
        icon: 'cgpa'
      },
      upcomingExams: {
        count: store.examinations ? store.examinations.length : 2,
        sublabel: 'Next: Maths (12 Oct 2025)',
        icon: 'exam'
      }
    },
    schedule: store.timetable || [],
    quickLinks: [
      { id: 1, label: 'View Attendance', icon: 'attendance', color: '#10b981', target: 'attendance' },
      { id: 2, label: 'Exam Results', icon: 'exam', color: '#8b5cf6', target: 'examination' },
      { id: 3, label: 'Library Portal', icon: 'library', color: '#f97316', target: 'academics' }
    ],
    announcements: (store.notices || []).filter(n => n.target_role === 'student' || n.target_role === 'all').slice(0, 5),
    upcomingEvents: (store.events || []).slice(0, 3)
  });
});

/**
 * GET /api/dashboard/teacher
 */
router.get('/teacher', (req, res) => {
  const store = db.getDbStore();
  const teacher = (store.teachers && store.teachers[0]) || {};

  res.json({
    teacher: {
      name: teacher.name || 'Prof. Kavya K. S. (Math)',
      designation: teacher.designation || 'Assistant Professor (Mathematics)',
      department: teacher.department || 'Mathematics • CSE (ICB)',
      quote: '"Education is the most powerful weapon which you can use to change the world." - Nelson Mandela',
      date: 'Monday, 29 Sep 2025',
      academicYear: '2025 - 26'
    },
    summaryCards: {
      totalStudents: {
        count: store.students ? store.students.length : teacher.total_students,
        label: 'Total Students (Your Classes)',
        sublabel: '+2 new enrollments',
        icon: 'students'
      },
      classesToday: {
        count: teacher.classes_today,
        label: 'Classes Today',
        sublabel: '3 completed | 1 upcoming',
        icon: 'classes'
      },
      pendingEvaluations: {
        count: (store.assignments || []).filter(a => a.status === 'pending' || a.status === 'submitted').length,
        label: 'Pending Evaluations',
        sublabel: 'Assignments / Test Papers',
        icon: 'evaluations'
      },
      notices: {
        count: store.notices ? store.notices.length : teacher.notices_count,
        label: 'Notices & Updates',
        sublabel: 'Department notices',
        icon: 'notices'
      }
    },
    todaySchedule: [
      { period: 'P1', time: '08:30 - 09:25', subject: 'Mathematics (CSE-ICB)', room: 'Room: C-204 | 3rd Sem', status: 'Completed' },
      { period: 'P2', time: '09:25 - 10:20', subject: 'Physics (CSE-ICB)', room: 'Room: C-204 | 3rd Sem', status: 'Completed' },
      { period: 'BREAK', time: '10:20 - 10:35', subject: 'Tea Break', room: 'Faculty Lounge', status: 'Break' },
      { period: 'P3', time: '10:35 - 11:30', subject: 'Programming in C (CSE-ICB)', room: 'Room: C-204 | 3rd Sem', status: 'Completed' },
      { period: 'P4', time: '11:30 - 12:25', subject: 'Engineering Graphics (CSE-ICB)', room: 'Room: C-204 | 3rd Sem', status: 'Upcoming' }
    ],
    classOverview: store.teacher_overview ? store.teacher_overview.class_metrics : {
      class_name: '3rd Sem CSE (ICB)',
      classes_conducted: 24,
      classes_conducted_pct: 80,
      attendance_rate: 92.4,
      attendance_delta: '+2.1% this week',
      average_marks: 8.4,
      total_students: store.students ? store.students.length : 45
    },
    recentNotices: (store.notices || []).slice(0, 4)
  });
});

/**
 * GET /api/dashboard/department
 */
router.get('/department', (req, res) => {
  const store = db.getDbStore();
  const dept = store.department_overview || {};

  res.json({
    admin: {
      name: 'Dr. Kushal Kumar B. N.',
      title: 'Head of Department | CSE (ICB)',
      quote: '"Education is the most powerful weapon which you can use to change the world." - Nelson Mandela',
      date: 'Monday, 29 Sep 2025',
      academicYear: '2025 - 26'
    },
    summaryCards: {
      totalStudents: {
        count: store.students ? store.students.length : dept.total_students,
        delta: '+12 new this month',
        label: 'Total Students (Department)'
      },
      facultyMembers: {
        count: store.teachers ? store.teachers.length : dept.faculty_members,
        delta: '+1 new joiner',
        label: 'Faculty Members'
      },
      activeCourses: {
        count: store.subjects ? store.subjects.length : dept.active_courses,
        delta: 'AY 2025-26',
        label: 'Active Courses'
      },
      upcomingExams: {
        count: store.examinations ? store.examinations.length : dept.upcoming_examinations,
        delta: '(Internal Assessment 1)',
        label: 'Upcoming Examinations'
      },
      pendingApprovals: {
        count: (store.exam_marks || []).filter(m => m.status === 'Pending').length || 7,
        delta: '(Marks & Result Moderation)',
        label: 'Pending Approvals'
      }
    },
    classesOverview: dept.classes_overview || [],
    attendanceOverview: dept.attendance_analytics || {
      overall_pct: 92,
      present_pct: 92,
      absent_pct: 5,
      onduty_pct: 2,
      leave_pct: 1
    },
    examinationSummary: dept.examination_summary || [],
    upcomingEvents: (store.events || []).slice(0, 3),
    recentNotices: (store.notices || []).slice(0, 4)
  });
});

module.exports = router;
