const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const { initializeDatabase } = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Backend is healthy' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, error: 'Unable to process your request right now.' });
});

async function startServer(port) {
  try {
    await initializeDatabase();
    const listenPort = port !== undefined ? port : PORT;
    const server = app.listen(listenPort, '0.0.0.0', () => {
      console.log(`Server running on port ${listenPort}`);
    });
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };