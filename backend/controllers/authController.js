const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { replaceSession, clearSession, revokeToken, isTokenRevoked } = require('../authState');

const JWT_SECRET = process.env.JWT_SECRET || 'bakery-secret';
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

function getTokenFromHeader(req) {
  const authHeader = req.header('Authorization') || req.header('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [normalizeEmail(email)]);
    if (!rows.length) {
      return res.status(401).json({ success: false, error: 'Invalid Email or Password.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid Email or Password.' });
    }

    const token = jwt.sign({ id: user.user_id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '12h' });
    replaceSession(user.user_id, token);

    return res.json({ success: true, token, user: { userName: user.user_name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Unable to sign you in right now.' });
  }
}

async function logout(req, res) {
  const token = getTokenFromHeader(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      clearSession(decoded.id);
      revokeToken(token);
    } catch (error) {
      console.error('Logout token handling error:', error);
    }
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
}

async function me(req, res) {
  const token = getTokenFromHeader(req);
  if (!token || isTokenRevoked(token)) {
    return res.status(401).json({ success: false, error: 'Session expired.' });
  }
  return res.json({ success: true, user: req.user });
}

module.exports = { login, logout, me };
