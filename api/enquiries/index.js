const { connectToDatabase } = require('../_lib/db');
const { requireAdminAuth } = require('../_lib/auth');
const { validateEnquiryInput } = require('../_lib/validation');
const { getClientIp, checkRateLimit } = require('../_lib/rate-limit');

module.exports = async function handler(req, res) {
  // GET: Admin only - List visitor enquiries
  if (req.method === 'GET') {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    const db = auth.db;

    try {
      const statusFilter = req.query.status;
      const filter = statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {};

      const enquiries = await db.collection('enquiries')
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();

      const newCount = await db.collection('enquiries').countDocuments({ status: 'new' });

      return res.status(200).json({
        success: true,
        newCount,
        count: enquiries.length,
        enquiries
      });
    } catch (err) {
      console.error('Enquiries GET error:', err.message);
      return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  // POST: Public visitor enquiry submission
  if (req.method === 'POST') {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`enquiry:${clientIp}`, 5, 10 * 60 * 1000);

    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
      return res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        message: `Too many submissions from this device. Please wait ${rateLimit.retryAfterSeconds} seconds before sending another message.`
      });
    }

    const validation = validateEnquiryInput(req.body);

    // Silent reject on honeypot spam
    if (validation.spam) {
      return res.status(200).json({
        success: true,
        message: 'Thank you for reaching out! Your enquiry has been received.'
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
        message: 'The enquiry service is temporarily unavailable. Please email directly or try again later.'
      });
    }

    try {
      const enquiryData = validation.data;
      enquiryData.ip = clientIp;

      await db.collection('enquiries').insertOne(enquiryData);

      return res.status(201).json({
        success: true,
        message: 'Thank you for reaching out! Your message has been sent directly to Shivanshu Satyajeet. You will receive a response soon.'
      });
    } catch (err) {
      console.error('Enquiry submission error:', err.message);
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message: 'Could not record your message at this time. Please try again shortly or contact via email.'
      });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
};
