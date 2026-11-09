const { connectToDatabase } = require('../_lib/db');
const { getAdminSession, requireAdminAuth } = require('../_lib/auth');
const { validateCertificateInput } = require('../_lib/validation');

module.exports = async function handler(req, res) {
  // POST: Admin only - Create certificate
  if (req.method === 'POST') {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    const db = auth.db;

    const validation = validateCertificateInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'VALIDATION_FAILED', message: validation.error });
    }

    try {
      const certData = validation.data;
      certData.createdAt = new Date();

      const existing = await db.collection('certificates').findOne({ id: certData.id });
      if (existing) {
        certData.id = `${certData.id}-${Date.now().toString().slice(-4)}`;
      }

      if (!certData.order) {
        const last = await db.collection('certificates').find().sort({ order: -1 }).limit(1).toArray();
        certData.order = last.length > 0 ? (last[0].order || 0) + 1 : 1;
      }

      await db.collection('certificates').insertOne(certData);
      return res.status(201).json({ success: true, certificate: certData });
    } catch (err) {
      console.error('Certificate create error:', err.message);
      return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  // GET: Public list of published certificates
  if (req.method === 'GET') {
    let db;
    try {
      const conn = await connectToDatabase();
      db = conn.db;
    } catch (err) {
      return res.status(503).json({
        error: 'DATABASE_UNAVAILABLE',
        message: 'Database is currently offline. Static fallback content will be displayed.'
      });
    }

    try {
      const auth = await getAdminSession(req, db);
      const includeDrafts = auth && (req.query.includeDrafts === 'true' || req.query.admin === 'true');

      const filter = includeDrafts ? {} : { published: true };
      const certificates = await db.collection('certificates')
        .find(filter)
        .sort({ order: 1, createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        count: certificates.length,
        certificates
      });
    } catch (err) {
      console.error('Certificates GET error:', err.message);
      return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
};
