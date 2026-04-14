const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.log('[AUTH FAILED] No token provided');
    return res.status(401).json({ message: 'No authentication token, access denied' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'airbnb_secret_key';
    const decoded = jwt.verify(token, secret);
    console.log('[AUTH SUCCESS] User:', decoded.id);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('[AUTH FAILED] Token starts with:', token.substring(0, 15), 'Error:', err.message);
    res.status(401).json({ message: 'Token is not valid', error: err.message });
  }
};

exports.authenticateToken = auth;
