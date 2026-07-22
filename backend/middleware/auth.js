const jwt = require('jsonwebtoken');
const { isTokenRevoked } = require('../authState');

const auth = (req, res, next) => {
  const authHeader = req.header('Authorization') || req.header('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access denied' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'bakery-secret';
    if (isTokenRevoked(token)) {
      return res.status(401).json({ success: false, error: 'Session expired.' });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Session expired.' });
  }
};

module.exports = auth;