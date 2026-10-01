const express = require('express');
const {
    protect,
    requireAdmin
} = require('../middleware/authMiddleware');

const {
    createQRSession,
    getAllQRSessions,
    getQRSessionById
} = require('../controllers/qrController');

const router = express.Router();

router.post('/', protect, createQRSession);

router.get('/', protect, getAllQRSessions);

router.get('/:id', protect, getQRSessionById);

module.exports = router;