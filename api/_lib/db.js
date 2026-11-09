const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;
let indexesCreated = false;

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_NOT_CONFIGURED: MONGODB_URI environment variable is missing.');
  }

  const dbName = process.env.MONGODB_DB_NAME || 'portfolio';

  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000
  });

  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  if (!indexesCreated) {
    ensureIndexes(db).catch(err => {
      console.error('Failed to create MongoDB indexes:', err.message);
    });
    indexesCreated = true;
  }

  return { client, db };
}

async function ensureIndexes(db) {
  try {
    // Admins: unique email
    await db.collection('admins').createIndex({ email: 1 }, { unique: true });

    // Sessions: token lookup + TTL auto-expiry
    await db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true });
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // Projects: ordering and lookup
    await db.collection('projects').createIndex({ id: 1 }, { unique: true });
    await db.collection('projects').createIndex({ published: 1, order: 1 });

    // Certificates: ordering and lookup
    await db.collection('certificates').createIndex({ id: 1 }, { unique: true });
    await db.collection('certificates').createIndex({ published: 1, order: 1 });

    // Enquiries: date descending and status
    await db.collection('enquiries').createIndex({ createdAt: -1 });
    await db.collection('enquiries').createIndex({ status: 1 });

    // Feedback: date descending and status
    await db.collection('feedback').createIndex({ createdAt: -1 });
    await db.collection('feedback').createIndex({ status: 1 });
  } catch (err) {
    console.error('Index creation error:', err.message);
  }
}

module.exports = {
  connectToDatabase,
  ensureIndexes
};

