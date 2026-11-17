/**
 * Authentication & Security Utilities
 * KSIT CSE (ICB) Department Management Portal
 * Native Node.js crypto for zero-dependency secure hashing & signed tokens
 */

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'ksit_cse_icb_secret_key_2026_portal_secure';
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hash password with salt using PBKDF2
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash or fallback plain-text (auto-upgrade)
 */
function verifyPassword(password, storedPassword) {
  if (!storedPassword || !password) return false;

  // If stored as salt:hash
  if (storedPassword.includes(':')) {
    const [salt, originalHash] = storedPassword.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  }

  // Fallback for seed plain-text passwords (e.g., 'password123')
  return password === storedPassword;
}

/**
 * Generate HMAC-SHA256 signed bearer token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    email: user.email,
    exp: Date.now() + TOKEN_EXPIRY_MS
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode HMAC-SHA256 bearer token
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken
};
