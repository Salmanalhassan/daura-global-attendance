const express = require('express');

const {
    protect,
    requireAdmin
} = require('../middleware/authMiddleware');

const {
    addSchool,
    getAllSchools,
    getSchoolById,
    updateSchool
} = require('../controllers/schoolController');

const router = express.Router();


router.post('/', protect, requireAdmin, addSchool);

router.get('/', protect, requireAdmin, getAllSchools);

router.get('/:id', protect, requireAdmin, getSchoolById);

router.put('/:id', protect, requireAdmin, updateSchool);


module.exports = router;