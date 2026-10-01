const express = require('express');
const bcrypt = require('bcryptjs');

const {
    protect,
    requireAdmin
} = require('../middleware/authMiddleware');

const db = require('../config/database');

const router = express.Router();


router.get(
    '/dashboard-stats',
    protect,
    requireAdmin,
    (req, res) => {

       const sql = `
    SELECT

        (SELECT COUNT(*)
         FROM students) AS total_students,

        (SELECT COUNT(*)
         FROM students
         WHERE status = 'active') AS active_students,

        (SELECT COUNT(*)
         FROM schools
         WHERE status = 'active') AS total_schools,

        (SELECT COUNT(*)
         FROM siwes_batches
         WHERE status = 'active') AS active_batches,

        (SELECT COUNT(DISTINCT student_id)
         FROM attendance
         WHERE attendance_date = DATE(
             CONVERT_TZ(NOW(), '+00:00', '+01:00')
         )) AS today_attendance,

        (SELECT COUNT(DISTINCT student_id)
         FROM attendance
         WHERE attendance_date = DATE(
             CONVERT_TZ(NOW(), '+00:00', '+01:00')
         )
         AND status = 'present') AS today_present,

        (SELECT COUNT(DISTINCT student_id)
         FROM attendance
         WHERE attendance_date = DATE(
             CONVERT_TZ(NOW(), '+00:00', '+01:00')
         )
         AND status = 'late') AS today_late
`;





        db.query(sql, (err, results) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch dashboard statistics'
                });
            }

            const stats = results[0];

            const totalStudents =
                Number(stats.total_students) || 0;
const todayAttendance =
    Number(stats.today_attendance) || 0;

const todayPresent =
    Number(stats.today_present) || 0;

const todayLate =
    Number(stats.today_late) || 0;

const todayAbsent = Math.max(
    totalStudents - todayAttendance,
    0
);

const attendancePercentage =
    totalStudents > 0
        ? Number(
            (
                (todayAttendance / totalStudents) * 100
            ).toFixed(2)
        )
        : 0;





            res.json({
                success: true,

                data: {
                    students: {
                        total: totalStudents,
                        active: Number(stats.active_students) || 0
                    },

                    schools: {
                        total: Number(stats.total_schools) || 0
                    },

                    siwes_batches: {
                        active: Number(stats.active_batches) || 0
                    },

                    today_attendance: {
                        total: todayAttendance,
                        present: todayPresent,
                        late: todayLate,
                        absent: todayAbsent,
                        attendance_percentage:
                            attendancePercentage
                    }
                }
            });
        });
    }
);


router.get(
    '/dashboard',
    protect,
    requireAdmin,
    (req, res) => {

        res.json({
            success: true,
            message: 'Welcome to Admin Dashboard',
            user: req.user
        });

    }
);

// ==========================================
// GET ADMIN PROFILE
// ==========================================

router.get(
    '/profile',
    protect,
    requireAdmin,
    (req, res) => {

        const adminId = req.user.id;

        const sql = `
            SELECT
                id,
                full_name,
                username,
                created_at
            FROM admins
            WHERE id = ?
        `;

        db.query(sql, [adminId], (err, results) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch admin profile'
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin account not found'
                });
            }

            res.json({
                success: true,
                admin: results[0]
            });
        });
    }
);


// ==========================================
// UPDATE ADMIN PROFILE
// ==========================================

router.put(
    '/profile',
    protect,
    requireAdmin,
    (req, res) => {

        const adminId = req.user.id;

        const {
            full_name,
            username
        } = req.body;

        if (!full_name || !username) {
            return res.status(400).json({
                success: false,
                message:
                    'Full name and username are required'
            });
        }

        const checkSql = `
            SELECT id
            FROM admins
            WHERE username = ?
            AND id != ?
        `;

        db.query(
            checkSql,
            [username.trim(), adminId],
            (checkErr, checkResults) => {

                if (checkErr) {
                    console.error(checkErr);

                    return res.status(500).json({
                        success: false,
                        message:
                            'Failed to check username'
                    });
                }

                if (checkResults.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message:
                            'Username is already in use'
                    });
                }

                const updateSql = `
                    UPDATE admins
                    SET
                        full_name = ?,
                        username = ?
                    WHERE id = ?
                `;

                db.query(
                    updateSql,
                    [
                        full_name.trim(),
                        username.trim(),
                        adminId
                    ],
                    (updateErr) => {

                        if (updateErr) {
                            console.error(updateErr);

                            return res.status(500).json({
                                success: false,
                                message:
                                    'Failed to update profile'
                            });
                        }

                        res.json({
                            success: true,
                            message:
                                'Admin profile updated successfully'
                        });
                    }
                );
            }
        );
    }
);


// ==========================================
// CHANGE ADMIN PASSWORD
// ==========================================

router.put(
    '/change-password',
    protect,
    requireAdmin,
    async (req, res) => {

        const adminId = req.user.id;

        const {
            current_password,
            new_password
        } = req.body;

        if (
            !current_password ||
            !new_password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Current password and new password are required'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message:
                    'New password must be at least 6 characters'
            });
        }

        const sql = `
            SELECT password_hash
            FROM admins
            WHERE id = ?
        `;

        db.query(
            sql,
            [adminId],
            async (err, results) => {

                if (err) {
                    console.error(err);

                    return res.status(500).json({
                        success: false,
                        message:
                            'Failed to fetch admin account'
                    });
                }

                if (results.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message:
                            'Admin account not found'
                    });
                }

                const passwordMatch =
                    await bcrypt.compare(
                        current_password,
                        results[0].password_hash
                    );

                if (!passwordMatch) {
                    return res.status(401).json({
                        success: false,
                        message:
                            'Current password is incorrect'
                    });
                }

                const newPasswordHash =
                    await bcrypt.hash(
                        new_password,
                        10
                    );

                const updateSql = `
                    UPDATE admins
                    SET password_hash = ?
                    WHERE id = ?
                `;

                db.query(
                    updateSql,
                    [
                        newPasswordHash,
                        adminId
                    ],
                    (updateErr) => {

                        if (updateErr) {
                            console.error(updateErr);

                            return res.status(500).json({
                                success: false,
                                message:
                                    'Failed to change password'
                            });
                        }

                        res.json({
                            success: true,
                            message:
                                'Password changed successfully'
                        });
                    }
                );
            }
        );
    }
);

module.exports = router;