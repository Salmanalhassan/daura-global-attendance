const jwt = require('jsonwebtoken');

const JWT_SECRET = 'daura_global_secret_key';


// PROTECT — CHECK JWT TOKEN
const protect = (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });

    }
};


// ADMIN ONLY
const requireAdmin = (req, res, next) => {

    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }

    next();
};


// STUDENT ONLY
const requireStudent = (req, res, next) => {

    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.role !== 'student') {
        return res.status(403).json({
            success: false,
            message: 'Student access required'
        });
    }

    next();
};


module.exports = {
    protect,
    requireAdmin,
    requireStudent
};