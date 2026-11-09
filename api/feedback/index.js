const { connectToDatabase } = require('../_lib/db');
const { requireAdminAuth } = require('../_lib/auth');
const { validateFeedbackInput } = require('../_lib/validation');
const { getClientIp, checkRateLimit } = require('../_lib/rate-limit');

module.exports = async function handler(req, res) {
  // GET: Admin only - List visitor feedback
  if (req.method === 'GET') {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    const db = auth.db;

    try {
      const feedback = await db.collection('feedback')
        .find()
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();

      const newCount = await db.collection('feedback').countDocuments({ status: 'new' });

      return res.status(200).json({
        success: true,
        newCount,
        count: feedback.length,
        feedback
      });
    } catch (err) {
      console.error('Feedback GET error:', err.message);
      return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  // POST: Public visitor feedback submission
  if (req.method === 'POST') {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`feedback:${clientIp}`, 5, 10 * 60 * 1000);

    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
      return res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        message: `Too many submissions. Please wait ${rateLimit.retryAfterSeconds} seconds before sending more feedback.`
      });
    }

    const validation = validateFeedbackInput(req.body);

    // Honeypot silent reject
    if (validation.spam) {
      return res.status(200).json({
        success: true,
        message: 'Thank you for your feedback!'
      });
    }

    if (!validation.valid) {
      return res.status(400).json({ error: 'VALIDATION_FAILED', message: validation.error });
    }

    let db;
    try {
      const conn = await connectToDatabase();
      db = conn.db;
    } catch (err) {
      return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'The feedback service is temporarily unavailable.'
      });
    }

    try {
      const feedbackData = validation.data;
      feedbackData.ip = clientIp;

      await db.collection('feedback').insertOne(feedbackData);

      return res.status(201).json({
        success: true,
        message: 'Thank you! Your feedback has been shared with Shivanshu.'
      });
    } catch (err) {
      console.error('Feedback submit error:', err.message);
      return res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not record feedback.' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
};
