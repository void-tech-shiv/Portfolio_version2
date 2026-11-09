const { connectToDatabase } = require('../_lib/db');
const { getAdminSession, requireAdminAuth } = require('../_lib/auth');
const { validateProjectInput } = require('../_lib/validation');

module.exports = async function handler(req, res) {
  // POST: Admin only - Create new project
  if (req.method === 'POST') {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    const db = auth.db;

    const validation = validateProjectInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'VALIDATION_FAILED', message: validation.error });
    }

    try {
      const projectData = validation.data;
      projectData.createdAt = new Date();

      // Check for duplicate ID
      const existing = await db.collection('projects').findOne({ id: projectData.id });
      if (existing) {
        projectData.id = `${projectData.id}-${Date.now().toString().slice(-4)}`;
      }

      // If order not explicitly set, place at end
      if (!projectData.order) {
        const last = await db.collection('projects').find().sort({ order: -1 }).limit(1).toArray();
        projectData.order = last.length > 0 ? (last[0].order || 0) + 1 : 1;
      }

      await db.collection('projects').insertOne(projectData);
      return res.status(201).json({ success: true, project: projectData });
    } catch (err) {
      console.error('Project create error:', err.message);
      return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  // GET: Public list of published projects (or full list for authenticated admin)
  if (req.method === 'GET') {
    let db;
    try {
      const conn = await connectToDatabase();
      db = conn.db;
    } catch (err) {
      // If DB is offline, return 503 so frontend gracefully falls back to inline data
      return res.status(503).json({
        error: 'DATABASE_UNAVAILABLE',
        message: 'Database is currently offline. Static fallback content will be displayed.'
      });
    }

    try {
      const auth = await getAdminSession(req, db);
      const includeDrafts = auth && (req.query.includeDrafts === 'true' || req.query.admin === 'true');

      const filter = includeDrafts ? {} : { published: true };
      const projects = await db.collection('projects')
        .find(filter)
        .sort({ order: 1, createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        count: projects.length,
        projects
      });
    } catch (err) {
      console.error('Projects GET error:', err.message);
      return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
};
