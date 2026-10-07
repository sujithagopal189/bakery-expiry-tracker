const mongoose = require('mongoose');
require('dotenv').config();

let isConnected = false;

async function initializeDatabase() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables. Set it in Vercel project settings.');
  }

  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log('✅ Connected to MongoDB Atlas');

    // Seed default admin user if not already present
    const User = require('./models/User');
    const adminExists = await User.findOne({ email: 'sujithagopal158@gmail.com' });
    if (!adminExists) {
      await User.create({
        user_name: 'Sujitha',
        email: 'sujithagopal158@gmail.com',
        // bcrypt hash of "sujithagopal"
        password: '$2a$10$0oslFiJoquF0xGK/nGdhMuHS9BF1iDIZuTjBrlO7K94fSBpT9QT9.',
        role: 'admin',
        created_at: new Date('2026-07-01T16:58:29.569Z')
      });
      console.log('✅ Default admin user seeded');
    }

    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB Atlas connection error:', error.message);
    throw error;
  }
}

module.exports = { initializeDatabase };
