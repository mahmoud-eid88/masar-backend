/**
 * Role-Based Access Control Middleware
 * Restricts access based on user role permissions
 */

// Permissions map - what each role can do
const permissions = {
    admin: ['all'], // Admin has full access
    support: [
        'support:view',
        'support:reply',
        'support:assign',
        'support:resolve',
        'support:tickets',
        'orders:view' // Can view orders for context
    ]
};

// Verify role has specific permission
const hasPermission = (role, permission) => {
    const rolePerms = permissions[role];
    if (!rolePerms) return false;
    return rolePerms.includes('all') || rolePerms.includes(permission);
};

/**
 * Middleware: Require specific permission
 */
exports.requirePermission = (permission) => (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    if (hasPermission(role, permission)) {
        return next();
    }

    return res.status(403).json({
        success: false,
        error: 'Access denied - insufficient permissions'
    });
};

/**
 * Middleware: Require support or admin role
 */
exports.requireSupportRole = (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    if (role === 'admin' || role === 'support') {
        return next();
    }

    return res.status(403).json({
        success: false,
        error: 'Support staff access required'
    });
};

/**
 * Middleware: Admin only
 */
exports.requireAdmin = (req, res, next) => {
    const role = req.user?.role;

    if (role === 'admin') {
        return next();
    }

    return res.status(403).json({
        success: false,
        error: 'Admin access required'
    });
};

/**
 * Middleware: Extract user from token (simplified - should use JWT verify in production)
 */
exports.extractUser = (req, res, next) => {
    // This should be replaced with actual JWT verification
    // For now, we'll check the Authorization header
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        // In production, decode and verify the JWT token here
        // For now, we'll accept the user info from req.body or query
        req.user = req.user || {};
    }

    next();
};

module.exports = exports;
