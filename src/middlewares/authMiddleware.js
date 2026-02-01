const jwt = require('jsonwebtoken');
const { Customer, Courier } = require('../models');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('JWT_SECRET not defined in environment!');
        return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    jwt.verify(token, secret, async (err, decoded) => {
        if (err) {
            console.error('Token verification failed:', err.message);
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }

        try {
            // Check if user is blocked
            let user;
            if (decoded.role === 'customer') {
                user = await Customer.findByPk(decoded.id);
            } else if (decoded.role === 'courier') {
                user = await Courier.findByPk(decoded.id);
            }

            if (user && user.is_blocked) {
                return res.status(403).json({ success: false, message: 'تم حظرك بسبب مخالفة سياسة التطبيق' });
            }

            req.user = decoded;
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });
};

module.exports = { authenticateToken };

