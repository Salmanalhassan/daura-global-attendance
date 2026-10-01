const express = require('express');
const {
    protect,
    requireAdmin,
    requireStudent
} = require('../middleware/authMiddleware');
const {
    markAttendance,
    getMyAttendance,
    getMyAttendanceSummary,
    getTodayAttendance,
    getAttendanceHistory,
    getAttendanceById,
    getStudentAttendanceReport,
    getSchoolAttendanceReport,
    getBatchAttendanceReport
} = require('../controllers/attendanceController');
const router = express.Router();
router.post(
    '/mark',
    protect,
    requireStudent,
    markAttendance
);

router.get(
    '/my-attendance',
    protect,
    requireStudent,
    getMyAttendance
);

router.get(
    '/my-summary',
    protect,
    requireStudent,
    getMyAttendanceSummary
);

router.get(
    '/today',
    protect,
    requireAdmin,
    getTodayAttendance
);

router.get(
    '/history',
    protect,
    requireAdmin,
    getAttendanceHistory
);

router.get(
    '/student/:student_id',
    protect,
    requireAdmin,
    getStudentAttendanceReport
);

router.get(
    '/school/:school_id',
    protect,
    requireAdmin,
    getSchoolAttendanceReport
);

router.get(
    '/batch/:batch_id',
    protect,
    requireAdmin,
    getBatchAttendanceReport
);

router.get(
    '/:id',
    protect,
    requireAdmin,
    getAttendanceById
);


module.exports = router;