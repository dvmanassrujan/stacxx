/**
 * CSE (ICB) Department Integrated Academic and Information Portal
 * Express Backend Server
 * K. S. Institute of Technology (KSIT), Bengaluru
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

// Modular Route Handlers
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const studentsRoutes = require('./routes/students.routes');
const facultyRoutes = require('./routes/faculty.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const assignmentsRoutes = require('./routes/assignments.routes');
const examinationsRoutes = require('./routes/examinations.routes');
const resourcesRoutes = require('./routes/resources.routes');
const noticesRoutes = require('./routes/notices.routes');
const eventsRoutes = require('./routes/events.routes');
const profileRoutes = require('./routes/profile.routes');
const notificationsRoutes = require('./routes/notifications.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Parsing Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets/raw', express.static(path.join(__dirname)));

// ---------------- SYSTEM HEALTH & DB CONFIG ----------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    portal: 'CSE (ICB) Department Integrated Academic & Information Portal',
    institution: 'K. S. Institute of Technology (KSIT), Bengaluru',
    team: 'STACK X (D V Manas Srujan, Hussain Basha, M Pavani Gowda, Purvi B V)',
    database: db.getStatus()
  });
});

app.post('/api/db/configure', async (req, res) => {
  const { host, port, user, password, database } = req.body;
  if (host) process.env.DB_HOST = host;
  if (port) process.env.DB_PORT = port;
  if (user) process.env.DB_USER = user;
  if (password !== undefined) process.env.DB_PASSWORD = password;
  if (database) process.env.DB_NAME = database;

  const result = await db.initDb();
  res.json({
    message: result.success ? 'Connected to MySQL successfully!' : 'Falling back to Integrated Relational Store: ' + result.error,
    database: db.getStatus()
  });
});

// ---------------- MODULAR API ROUTES ----------------

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/examinations', examinationsRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationsRoutes);

// Compatibility aliases for direct endpoints
app.get('/api/library', (req, res) => {
  const store = db.getDbStore();
  res.json(store.library_resources || []);
});

app.get('/api/marks/student/:id', (req, res) => {
  const store = db.getDbStore();
  res.json(store.exam_marks || []);
});

app.get('/api/placements', (req, res) => {
  const store = db.getDbStore();
  res.json(store.placements || []);
});

app.get('/api/community-project', (req, res) => {
  const store = db.getDbStore();
  res.json(store.community_activities || []);
});

// Single Page Application Fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'An internal server error occurred.'
  });
});

// Start Server
async function start() {
  await db.initDb();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n================================================================`);
    console.log(`  KSIT CSE (ICB) Academic & Information Portal is running!`);
    console.log(`  Local URL: http://localhost:${PORT}`);
    console.log(`  Student, Teacher & Department Portals are active`);
    console.log(`================================================================\n`);
  });
}

start();

module.exports = app;
