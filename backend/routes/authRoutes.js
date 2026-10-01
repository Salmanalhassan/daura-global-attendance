const express = require('express');

const {
    registerAdmin,
    loginAdmin,
    loginStudent
} = require('../controllers/authController');

const router = express.Router();

router.post('/register-admin', registerAdmin);

router.post('/login', loginAdmin);

router.post('/student-login', loginStudent);

module.exports = router;