const { connectToDatabase } = require('../_lib/db');
const { getAdminSession, parseCookies, SESSION_COOKIE_NAME } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const cookies = parseCookies(req);
  if (!cookies[SESSION_COOKIE_NAME]) {
    return res.status(200).json({
      authenticated: false,
      admin: null
    });
  }

  try {
    const { db } = await connectToDatabase();
    const auth = await getAdminSession(req, db);

    if (!auth) {
      return res.status(200).json({
        authenticated: false,
        admin: null
      });
    }

    return res.status(200).json({
      authenticated: true,
      admin: {
        id: auth.admin._id,
        email: auth.admin.email,
        name: auth.admin.name || 'Site Owner'
      }
    });
  } catch (err) {
    if (err.message.includes('MONGODB_NOT_CONFIGURED')) {
      return res.status(200).json({
        authenticated: false,
        dbConfigured: false
      });
    }
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
