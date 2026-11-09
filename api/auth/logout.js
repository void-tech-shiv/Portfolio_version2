const { connectToDatabase } = require('../_lib/db');
const { parseCookies, destroySession, clearSessionCookie, SESSION_COOKIE_NAME } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE_NAME];

    if (token) {
      try {
        const { db } = await connectToDatabase();
        await destroySession(db, token);
      } catch (err) {
        // Ignore DB errors on logout, still clear cookie
      }
    }

    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(200).json({ success: true });
  }
};

