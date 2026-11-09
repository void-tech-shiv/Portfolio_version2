const { connectToDatabase } = require('../_lib/db');
const { hashPassword, createSession, serializeSessionCookie } = require('../_lib/auth');
const { isValidEmail } = require('../_lib/validation');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const body = req.body || {};
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const name = (body.name || 'Shivanshu Satyajeet').trim();
  const setupToken = body.setupToken || '';

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'INVALID_EMAIL', message: 'A valid email address is required.' });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters.' });
  }

  try {
    const { db } = await connectToDatabase();

    // Check if an owner account already exists
    const adminCount = await db.collection('admins').countDocuments();
    const envToken = process.env.ADMIN_SETUP_TOKEN;

    if (adminCount > 0) {
      // If admin already exists, allow reset ONLY if ADMIN_SETUP_TOKEN is configured in Vercel and matches
      if (!envToken || setupToken !== envToken) {
        return res.status(403).json({
          error: 'SETUP_LOCKED',
          message: 'Owner account is already configured. Please log in or use the CLI script to manage accounts.'
        });
      }
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();

    const result = await db.collection('admins').findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          name,
          passwordHash,
          role: 'owner',
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    const admin = result.value || result;
    const { rawToken } = await createSession(db, admin);
    const cookieHeader = serializeSessionCookie(rawToken);

    res.setHeader('Set-Cookie', cookieHeader);
    return res.status(200).json({
      success: true,
      message: 'Owner account created and logged in successfully.',
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (err) {
    console.error('Setup init error:', err.message);
    if (err.message.includes('MONGODB_NOT_CONFIGURED')) {
      return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Database connection is not configured. Please set MONGODB_URI in Vercel environment variables.'
      });
    }
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

