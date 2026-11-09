const { requireAdminAuth } = require('../_lib/auth');
const { validateCertificateInput } = require('../_lib/validation');

module.exports = async function handler(req, res) {
  const auth = await requireAdminAuth(req, res);
  if (!auth) return;
  const db = auth.db;

  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: 'MISSING_ID', message: 'Certificate ID is required.' });
  }

  // PUT: Update certificate
  if (req.method === 'PUT') {
    const validation = validateCertificateInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'VALIDATION_FAILED', message: validation.error });
    }

    try {
      const updateData = validation.data;
      updateData.updatedAt = new Date();

      const result = await db.collection('certificates').findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result.value && !result) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Certificate not found.' });
      }

      return res.status(200).json({ success: true, certificate: result.value || result });
    } catch (err) {
      console.error('Certificate update error:', err.message);
      return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  // PATCH: Quick update (published toggle, order)
  if (req.method === 'PATCH') {
    const updates = {};
    const body = req.body || {};

    if (typeof body.published === 'boolean') updates.published = body.published;
    if (Number.isInteger(body.order)) updates.order = body.order;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'NO_UPDATES', message: 'No valid update fields.' });
    }

    updates.updatedAt = new Date();

    try {
      const result = await db.collection('certificates').findOneAndUpdate(
        { id },
        { $set: updates },
        { returnDocument: 'after' }
      );

      if (!result.value && !result) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Certificate not found.' });
      }

      return res.status(200).json({ success: true, certificate: result.value || result });
    } catch (err) {
      return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  // DELETE: Delete certificate
  if (req.method === 'DELETE') {
    try {
      const result = await db.collection('certificates').deleteOne({ id });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Certificate not found.' });
      }
      return res.status(200).json({ success: true, message: 'Certificate deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  res.setHeader('Allow', 'PUT, PATCH, DELETE');
  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
};
