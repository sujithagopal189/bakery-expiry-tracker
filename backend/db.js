const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let dbInstance = null;
let isInitialized = false;

function loadServiceAccount() {
  // 1. Direct JSON or Base64 string in env variable (e.g. on Render, Vercel, Heroku)
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_CREDENTIALS;
  if (envKey) {
    try {
      return JSON.parse(envKey);
    } catch (e) {
      try {
        const decoded = Buffer.from(envKey, 'base64').toString('utf8');
        return JSON.parse(decoded);
      } catch (err) {}
    }
  }

  // 2. Discrete environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    // Handle escaped newlines from environment variables
    privateKey = privateKey.replace(/\\n/g, '\n');
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey
    };
  }

  // 3. Candidate file paths (local workspace, Render Secret Files, etc.)
  const candidatePaths = [
    process.env.FIREBASE_CREDENTIALS_PATH,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    '/etc/secrets/serviceAccountKey.json',
    '/etc/secrets/serviceAccountKey.json.json',
    path.resolve(__dirname, 'serviceAccountKey.json'),
    path.resolve(__dirname, 'serviceAccountKey.json.json'),
    path.resolve(process.cwd(), 'backend', 'serviceAccountKey.json'),
    path.resolve(process.cwd(), 'backend', 'serviceAccountKey.json.json'),
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(process.cwd(), 'serviceAccountKey.json.json')
  ].filter(Boolean);

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      } catch (err) {
        console.warn(`Could not read service account key at ${filePath}:`, err.message);
      }
    }
  }

  return null;
}

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const apps = typeof admin.getApps === 'function' ? admin.getApps() : (admin.apps || []);
  if (!apps.length) {
    const cred = loadServiceAccount();
    if (cred) {
      admin.initializeApp({
        credential: admin.cert(cred),
        projectId: cred.project_id || process.env.FIREBASE_PROJECT_ID || 'expiery-f05e4'
      });
    } else {
      console.warn('⚠️ No Firebase service account credentials found. Attempting Application Default Credentials...');
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'expiery-f05e4'
      });
    }
  }

  dbInstance = getFirestore();
  dbInstance.settings({ ignoreUndefinedProperties: true });
  return dbInstance;
}

async function initializeDatabase() {
  const db = getDb();

  if (isInitialized) {
    return db;
  }

  try {
    const usersRef = db.collection('users');
    const adminSnapshot = await usersRef.where('email', '==', 'sujithagopal158@gmail.com').limit(1).get();

    if (adminSnapshot.empty) {
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'sujithagopal';
      const hashedPassword = bcrypt.hashSync(defaultPassword, 10);

      await usersRef.add({
        user_name: 'Sujitha',
        email: 'sujithagopal158@gmail.com',
        password: hashedPassword,
        role: 'admin',
        created_at: new Date('2026-07-01T16:58:29.569Z').toISOString()
      });
      console.log('✅ Default admin user seeded in Firestore');
    }

    isInitialized = true;
    console.log('✅ Connected to Cloud Firestore');
    return db;
  } catch (error) {
    console.error('❌ Cloud Firestore connection error:', error.message);
    throw error;
  }
}

module.exports = {
  getDb,
  initializeDatabase,
  admin
};
