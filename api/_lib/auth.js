const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { parse, serialize } = require('cookie');

const BCRYPT_ROUNDS = 12;
const SESSION_COOKIE_NAME = 'portfolio_session';
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string' || plainPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

async function verifyPassword(plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function createSession(db, admin) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_SECONDS * 1000);

  await db.collection('sessions').insertOne({
    tokenHash,
    adminId: admin._id,
    adminEmail: admin.email,
    createdAt: now,
    expiresAt
  });

  return { rawToken, expiresAt };
}

async function validateSession(db, rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const tokenHash = hashToken(rawToken);

  const session = await db.collection('sessions').findOne({
    tokenHash,
    expiresAt: { $gt: new Date() }
  });

  if (!session) return null;

  const admin = await db.collection('admins').findOne(
    { _id: session.adminId },
    { projection: { passwordHash: 0 } }
  );

  if (!admin) return null;

  return { session, admin };
}

async function destroySession(db, rawToken) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await db.collection('sessions').deleteOne({ tokenHash });
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  try {
    return parse(header);
  } catch (err) {
    return {};
  }
}

function serializeSessionCookie(rawToken, maxAgeSeconds = SESSION_DURATION_SECONDS) {
  const isProd = process.env.NODE_ENV === 'production';
  return serialize(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds
  });
}

function clearSessionCookie() {
  const isProd = process.env.NODE_ENV === 'production';
  return serialize(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0)
  });
}

async function getAdminSession(req, db) {
  const cookies = parseCookies(req);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken) return null;
  return validateSession(db, rawToken);
}

async function requireAdminAuth(req, res, explicitDb = null) {
  const cookies = parseCookies(req);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Please log in as the portfolio owner.'
    });
    return null;
  }

  let db = explicitDb;
  if (!db) {
    try {
      const { connectToDatabase } = require('./db');
      const conn = await connectToDatabase();
      db = conn.db;
    } catch (err) {
      res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Database connection is not configured or unavailable. Please check MONGODB_URI.'
      });
      return null;
    }
  }

  const auth = await validateSession(db, rawToken);
  if (!auth) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired session. Please log in again.'
    });
    return null;
  }
  return { ...auth, db };
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  hashPassword,
  verifyPassword,
  createSession,
  validateSession,
  destroySession,
  parseCookies,
  serializeSessionCookie,
  clearSessionCookie,
  getAdminSession,
  requireAdminAuth
};
