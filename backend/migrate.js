/**
 * Migration Script: Local JSON → MongoDB Atlas
 * Run once with: npm run migrate
 * Migrates all existing users.json and products.json data to MongoDB Atlas.
 * Safe to re-run — skips records that already exist (no duplicates).
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const User = require('./models/User');
const Product = require('./models/Product');
const Inventory = require('./models/Inventory');
const ExpiryTracking = require('./models/ExpiryTracking');

const usersFile = path.join(__dirname, 'data', 'users.json');
const productsFile = path.join(__dirname, 'data', 'products.json');

async function migrateUsers() {
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
      user_name:  u.user_name  || u.name || 'User',
      email,
      password:   u.password,
      role:       u.role || 'user',
      created_at: u.created_at ? new Date(u.created_at) : new Date()
    });

    console.log(`   ✅ Migrated user: ${email}`);
    inserted++;
  }

  console.log(`   → Users done: ${inserted} inserted, ${skipped} skipped`);
}

async function migrateProducts() {
  const raw = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  console.log(`\n📦 Found ${raw.length} product(s) to migrate`);

  let inserted = 0;
  let skipped = 0;

  for (const p of raw) {
    const product_name = p.product_name || p.name || 'Product';
    const created_at   = p.created_at ? new Date(p.created_at) : new Date();

    // Idempotency check: match by name + created_at timestamp (millisecond precision)
    const exists = await Product.findOne({ product_name, created_at });

    if (exists) {
      console.log(`   ⏭  Skipping existing product: ${product_name}`);
      skipped++;
      continue;
    }

    const updated_at   = p.updated_at ? new Date(p.updated_at) : created_at;

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

    // Mirror: Inventory
    await Inventory.create({
      product_id:         product._id,
      quantity_available: product.quantity,
      last_updated:       updated_at
    });

    // Mirror: ExpiryTracking
    await ExpiryTracking.create({
      product_id:    product._id,
      expiry_status: product.status,
      alert_date:    product.expiry_date
    });

    console.log(`   ✅ Migrated product: ${product_name} (${p.category})`);
    inserted++;
  }

  console.log(`   → Products done: ${inserted} inserted, ${skipped} skipped`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB Atlas\n');

  await migrateUsers();
  await migrateProducts();

  await mongoose.disconnect();
  console.log('\n🎉 Migration complete! All data is now in MongoDB Atlas.');
}

main().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
