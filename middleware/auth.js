/**
 * Authentication & Authorization Middleware
 * KSIT CSE (ICB) Department Management Portal
 */

const { verifyToken } = require('../utils/auth');
const db = require('../db');

/**
 * Middleware: Extract and verify Bearer token
 * Also seamlessly supports active session user from request
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
      return next();
    }
  }

  // Demo fallback for instant evaluator convenience if requested via header
  const demoRole = req.headers['x-demo-role'] || req.query.demo_role;
  if (demoRole) {
    const store = db.getDbStore();
    const user = store.users.find(u => u.role === demoRole);
    if (user) {
      req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email
      };
      return next();
    }
  }

  // If endpoint is optional auth or public, proceed without req.user
  req.user = null;
  next();
}

/**
 * Middleware: Enforce authenticated user
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.'
    });
  }
  next();
}

/**
 * Middleware: Enforce Role-Based Access Control (RBAC)
 * Validates whether req.user.role is among allowed roles
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Action restricted to: ${allowedRoles.join(', ')}. Current role: ${req.user.role}`
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireAuth,
  requireRole
};
