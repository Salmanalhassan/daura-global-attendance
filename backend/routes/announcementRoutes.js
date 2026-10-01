const express = require('express');

const {
    protect,
    requireAdmin,
    requireStudent
} = require('../middleware/authMiddleware');

const {
    createAnnouncement,
    getAllAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement,
    publishAnnouncement,
    unpublishAnnouncement,
    getStudentAnnouncements
} = require('../controllers/announcementController');

const router = express.Router();


// =====================================================
// STUDENT
// =====================================================

router.get(
    '/student/my-announcements',
    protect,
    requireStudent,
    getStudentAnnouncements
);


// =====================================================
// ADMIN
// =====================================================

router.post(
    '/',
    protect,
    requireAdmin,
    createAnnouncement
);


router.get(
    '/',
    protect,
    requireAdmin,
    getAllAnnouncements
);


router.put(
    '/publish/:id',
    protect,
    requireAdmin,
    publishAnnouncement
);


router.put(
    '/unpublish/:id',
    protect,
    requireAdmin,
    unpublishAnnouncement
);


router.get(
    '/:id',
    protect,
    requireAdmin,
    getAnnouncementById
);


router.put(
    '/:id',
    protect,
    requireAdmin,
    updateAnnouncement
);


router.delete(
    '/:id',
    protect,
    requireAdmin,
    deleteAnnouncement
);


module.exports = router;