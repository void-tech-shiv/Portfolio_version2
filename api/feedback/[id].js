const { ObjectId } = require('mongodb');
const { requireAdminAuth } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  const auth = await requireAdminAuth(req, res);
  if (!auth) return;
  const db = auth.db;

  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: 'MISSING_ID', message: 'Feedback ID is required.' });
  }

  let query;
  try {
    query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
  } catch (e) {
    query = { _id: id };
  }

  // PATCH: Update status (or isPublic)
  if (req.method === 'PATCH') {
    const body = req.body || {};
    const updates = {};

    if (body.status && ['new', 'read', 'archived'].includes(body.status)) {
      updates.status = body.status;
    }
    if (typeof body.isPublic === 'boolean') {
      updates.isPublic = body.isPublic;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'NO_UPDATES', message: 'No valid update fields.' });
    }

    updates.updatedAt = new Date();

    try {
      const result = await db.collection('feedback').findOneAndUpdate(
        query,
        { $set: updates },
        { returnDocument: 'after' }
      );

      if (!result.value && !result) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Feedback not found.' });
      }

      return res.status(200).json({ success: true, feedback: result.value || result });
    } catch (err) {
      return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  // DELETE: Delete feedback
  if (req.method === 'DELETE') {
    try {
      const result = await db.collection('feedback').deleteOne(query);
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Feedback not found.' });
      }
      return res.status(200).json({ success: true, message: 'Feedback deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
};
