const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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
    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid Email or Password.' });
    }

    let isMatch = false;
    if (user.password) {
      isMatch = await bcrypt.compare(password, user.password);
    }

    // Support admin default passwords fallback (e.g. Admin@123, sujithagopal, or env DEFAULT_ADMIN_PASSWORD)
    const isAdminPassword =
      user.role === 'admin' &&
      (password === 'Admin@123' ||
       password === 'sujithagopal' ||
       password === (process.env.DEFAULT_ADMIN_PASSWORD || ''));

    if (!isMatch && isAdminPassword) {
      isMatch = true;
      try {
        const newHash = await bcrypt.hash(password, 10);
        await User.updateById(user.id || user._id, { password: newHash });
      } catch (e) {}
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid Email or Password.' });
    }

    const userId = String(user.id || user._id);
    const token = jwt.sign(
      { id: userId, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    replaceSession(userId, token);

    return res.json({
      success: true,
      token,
      user: { userName: user.user_name, email: user.email, role: user.role }
    });
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
