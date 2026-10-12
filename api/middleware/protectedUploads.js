const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../lib/jwtSecret');

/**
 * Block anonymous direct /uploads/* access (patient/vendor documents live here).
 * Set SERVE_UPLOADS_PUBLIC=1 only for emergency rollback — prefer API download routes.
 */
function protectedUploads(req, res, next) {
  if (String(process.env.SERVE_UPLOADS_PUBLIC || '') === '1') {
    return next();
  }

  const authHeader = req.header('Authorization') || req.headers?.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentication required for file access.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded.user) req.user = decoded.user;
    else if (decoded.userId) req.user = decoded;
    else return res.status(401).json({ error: 'Invalid token structure.' });
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = protectedUploads;
