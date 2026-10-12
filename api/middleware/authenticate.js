// Authentication middleware
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../lib/jwtSecret');

module.exports = function (req, res, next) {
    // Get token from header
    const authHeader = req.header('Authorization');

    // Check if no Authorization header
    if (!authHeader) {
        return res.status(401).json({ msg: 'No token, authorization denied (Missing Authorization header)' });
    }

    // Extract the token from "Bearer TOKEN" format
    const token = authHeader.split(' ')[1];

    // Check if token is actually present after splitting
    if (!token) {
        return res.status(401).json({ msg: 'Invalid token format, authorization denied (Bearer token missing)' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, getJwtSecret());

        // Handle different token structures
        if (decoded.user) {
            req.user = decoded.user;
        } else if (decoded.userId) {
            req.user = decoded;
        } else {
            console.error('Invalid token structure:', decoded);
            return res.status(401).json({ msg: 'Invalid token structure' });
        }
        
        next(); // Proceed to the next middleware/route handler
    } catch (err) {
        // If token is invalid (e.g., expired, tampered)
        console.error('Token verification failed:', err.message);
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

