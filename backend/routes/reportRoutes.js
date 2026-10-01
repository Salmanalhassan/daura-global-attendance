const express = require('express');

const {
    protect,
    requireAdmin
} = require('../middleware/authMiddleware');

const {
    getDepartmentsBySchool,
    getAttendanceReport
} = require('../controllers/reportController');


const router = express.Router();


// =====================================================
// GET DEPARTMENTS BY SCHOOL
// =====================================================

router.get(
    '/departments',
    protect,
    requireAdmin,
    getDepartmentsBySchool
);


// =====================================================
// GET ATTENDANCE REPORT
// =====================================================

router.get(
    '/attendance',
    protect,
    requireAdmin,
    getAttendanceReport
);


module.exports = router;