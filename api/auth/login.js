const { connectToDatabase } = require('../_lib/db');
const { verifyPassword, createSession, serializeSessionCookie } = require('../_lib/auth');
const { isValidEmail } = require('../_lib/validation');
const { getClientIp, checkRateLimit } = require('../_lib/rate-limit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`login:${clientIp}`, 5, 15 * 60 * 1000);

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    return res.status(429).json({
      error: 'TOO_MANY_REQUESTS',
      message: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`
    });
  }

  const body = req.body || {};
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password || !isValidEmail(email)) {
    return res.status(400).json({
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.'
    });
  }

  try {
    const { db } = await connectToDatabase();

    const admin = await db.collection('admins').findOne({ email });
    if (!admin) {
      // Artificial delay to mitigate timing attacks
      await new Promise(r => setTimeout(r, 200));
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    const isValid = await verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    // Password valid -> Create session and cookie
    const { rawToken } = await createSession(db, admin);
    const cookieHeader = serializeSessionCookie(rawToken);

    await db.collection('admins').updateOne(
      { _id: admin._id },
      { $set: { lastLogin: new Date() } }
    );

    res.setHeader('Set-Cookie', cookieHeader);
    return res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name || 'Site Owner'
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    if (err.message.includes('MONGODB_NOT_CONFIGURED')) {
      return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Database connection is not configured. Please set MONGODB_URI in Vercel environment variables.'
      });
    }
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An unexpected error occurred during authentication.'
    });
  }
};

