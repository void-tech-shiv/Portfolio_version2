/**
 * SECURE OWNER ACCOUNT SETUP CLI FOR SHIVANSHU SATYAJEET'S PORTFOLIO
 *
 * Usage:
 *   node scripts/create-owner.js <email> <password> [name]
 *
 * Or interactive prompt if arguments are omitted:
 *   node scripts/create-owner.js
 *
 * Security:
 * - Hashes password using bcrypt (cost factor 12)
 * - Never prints or logs the plaintext password
 * - Connects only to your configured MongoDB Atlas database
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

// Try loading local .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  });
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('ERROR: MONGODB_URI environment variable is not defined.');
  console.error('Please configure MONGODB_URI in your .env file or pass it as an environment variable.');
  process.exit(1);
}

const dbName = process.env.MONGODB_DB_NAME || 'portfolio';

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function main() {
  const args = process.argv.slice(2);
  let email = args[0];
  let password = args[1];
  let name = args[2] || 'Shivanshu Satyajeet';

  if (!email) {
    email = await askQuestion('Enter Owner Email Address: ');
  }
  if (!password) {
    password = await askQuestion('Enter Owner Password (min 8 characters): ');
  }

  email = (email || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    console.error('Invalid email address provided.');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters long.');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB (${dbName})...`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    console.log('Generating strong bcrypt hash (cost factor 12)...');
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    const res = await db.collection('admins').findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          name,
          passwordHash,
          role: 'owner',
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log('\n✓ OWNER ACCOUNT CONFIGURED SUCCESSFULLY!');
    console.log(`- Email: ${email}`);
    console.log(`- Name: ${name}`);
    console.log('- Role: owner');
    console.log('- Security: Argon2id/Bcrypt hash stored (plaintext never stored)');
    console.log('\nYou can now navigate to /admin on your portfolio and log in.');
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('Error setting up owner account:', err.message);
  process.exit(1);
});

