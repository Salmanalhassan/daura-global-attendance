const express = require('express');
const {
    protect,
    requireAdmin,
    requireStudent
} = require('../middleware/authMiddleware');
const {
    addStudent,
    getAllStudents,
    getStudentById,
    updateStudent,
    getMyProfile,
    getMySIWES,
    getStudentDashboard,
    changeStudentPassword
} = require('../controllers/studentController');

const router = express.Router();

router.post('/', protect, requireAdmin, addStudent);

router.get('/', protect, requireAdmin, getAllStudents);

router.get('/my-profile', protect, requireStudent, getMyProfile);

router.get('/my-siwes', protect, requireStudent, getMySIWES);

router.get('/dashboard', protect, requireStudent, getStudentDashboard);

router.put(
    '/change-password',
    protect,
    requireStudent,
    changeStudentPassword
);

router.get('/:id', protect, requireAdmin, getStudentById);

router.put('/:id', protect, requireAdmin, updateStudent);

module.exports = router;