/**
 * Migration Script: Local JSON → Cloud Firestore
 * Run with: npm run migrate
 * Migrates all existing users.json and products.json data to Cloud Firestore.
 * Safe to re-run — skips records that already exist (no duplicates).
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { initializeDatabase } = require('./db');
const User = require('./models/User');
const Product = require('./models/Product');
const Inventory = require('./models/Inventory');
const ExpiryTracking = require('./models/ExpiryTracking');

const usersFile = path.join(__dirname, 'data', 'users.json');
const productsFile = path.join(__dirname, 'data', 'products.json');

async function migrateUsers() {
  if (!fs.existsSync(usersFile)) {
    console.log('⚠️ users.json not found, skipping user migration.');
    return;
  }

  const raw = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  console.log(`\n📋 Found ${raw.length} user(s) to migrate`);

  let inserted = 0;
  let skipped = 0;

  for (const u of raw) {
    const email = String(u.email || '').trim().toLowerCase();
    const exists = await User.findOne({ email });

    if (exists) {
      console.log(`   ⏭  Skipping existing user: ${email}`);
      skipped++;
      continue;
    }

    await User.create({
      user_name:  u.user_name || u.name || 'User',
      email,
      password:   u.password,
      role:       u.role || 'user',
      created_at: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString()
    });

    console.log(`   ✅ Migrated user: ${email}`);
    inserted++;
  }

  console.log(`   → Users done: ${inserted} inserted, ${skipped} skipped`);
}

async function migrateProducts() {
  if (!fs.existsSync(productsFile)) {
    console.log('⚠️ products.json not found, skipping product migration.');
    return;
  }

  const raw = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  console.log(`\n📦 Found ${raw.length} product(s) to migrate`);

  let inserted = 0;
  let skipped = 0;

  for (const p of raw) {
    const product_name = p.product_name || p.name || 'Product';
    const created_at   = p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString();

    const exists = await Product.findOne({ product_name, created_at });

    if (exists) {
      console.log(`   ⏭  Skipping existing product: ${product_name}`);
      skipped++;
      continue;
    }

    const updated_at = p.updated_at ? new Date(p.updated_at).toISOString() : created_at;

    const product = await Product.create({
      product_name,
      category:           p.category || 'General',
      manufacturing_date: p.manufacturing_date,
      expiry_date:        p.expiry_date,
      quantity:           Number(p.quantity || 0),
      status:             p.status || 'fresh',
      created_at,
      updated_at
    });

    const productId = String(product.id || product._id);

    // Mirror: Inventory
    await Inventory.create({
      product_id:         productId,
      quantity_available: product.quantity,
      last_updated:       updated_at
    });

    // Mirror: ExpiryTracking
    await ExpiryTracking.create({
      product_id:    productId,
      expiry_status: product.status,
      alert_date:    product.expiry_date
    });

    console.log(`   ✅ Migrated product: ${product_name} (${p.category})`);
    inserted++;
  }

  console.log(`   → Products done: ${inserted} inserted, ${skipped} skipped`);
}

async function main() {
  console.log('🔌 Connecting to Cloud Firestore...');
  await initializeDatabase();
  console.log('✅ Connected to Cloud Firestore\n');

  await migrateUsers();
  await migrateProducts();

  console.log('\n🎉 Migration complete! All data is now stored in Cloud Firestore.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Migration failed:', err.stack || err.message);
  process.exit(1);
});
