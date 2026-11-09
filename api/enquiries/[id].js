const { ObjectId } = require('mongodb');
const { requireAdminAuth } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  const auth = await requireAdminAuth(req, res);
  if (!auth) return;
  const db = auth.db;

  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: 'MISSING_ID', message: 'Enquiry ID is required.' });
  }

  let query;
  try {
    query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
  } catch (e) {
    query = { _id: id };
  }

  // PATCH: Update status
  if (req.method === 'PATCH') {
    const body = req.body || {};
    const validStatuses = ['new', 'read', 'replied', 'archived'];
    const status = body.status;

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'INVALID_STATUS',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    try {
      const result = await db.collection('enquiries').findOneAndUpdate(
        query,
        { $set: { status, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      if (!result.value && !result) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Enquiry not found.' });
      }

      return res.status(200).json({ success: true, enquiry: result.value || result });
    } catch (err) {
      return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  // DELETE: Delete enquiry
  if (req.method === 'DELETE') {
    try {
      const result = await db.collection('enquiries').deleteOne(query);
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Enquiry not found.' });
      }
      return res.status(200).json({ success: true, message: 'Enquiry deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
};
