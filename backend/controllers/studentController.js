const bcrypt = require('bcryptjs');
const db = require('../config/database');

// ADD STUDENT
const addStudent = async (req, res) => {
    try {
        const {
            student_id,
            full_name,
            registration_number,
            email,
            phone,
            school_id,
            department,
            course,
            siwes_batch_id,
            start_date,
            end_date,
            password
        } = req.body;

        // CHECK REQUIRED FIELDS
        if (
            !student_id ||
            !full_name ||
            !registration_number ||
            !school_id ||
            !start_date ||
            !end_date ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Required fields are missing'
            });
        }

        // CHECK SCHOOL
        db.query(
            'SELECT id FROM schools WHERE id = ? AND status = "active"',
            [school_id],
            async (err, schoolResults) => {

                if (err) {
                    console.error(err);

                    return res.status(500).json({
                        success: false,
                        message: 'Database error'
                    });
                }

                if (schoolResults.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'School not found or inactive'
                    });
                }

                // CHECK STUDENT ID
                db.query(
                    'SELECT id FROM students WHERE student_id = ?',
                    [student_id],
                    async (err, studentResults) => {

                        if (err) {
                            console.error(err);

                            return res.status(500).json({
                                success: false,
                                message: 'Database error'
                            });
                        }

                        if (studentResults.length > 0) {
                            return res.status(409).json({
                                success: false,
                                message: 'Student ID already exists'
                            });
                        }

                        // HASH PASSWORD
                        const passwordHash = await bcrypt.hash(password, 10);

                        const sql = `
                            INSERT INTO students
                            (
                                student_id,
                                full_name,
                                registration_number,
                                email,
                                phone,
                                school_id,
                                department,
                                course,
                                siwes_batch_id,
                                start_date,
                                end_date,
                                password_hash
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;

                        db.query(
                            sql,
                            [
                                student_id,
                                full_name,
                                registration_number,
                                email || null,
                                phone || null,
                                school_id,
                                department || null,
                                course || null,
                                siwes_batch_id || null,
                                start_date,
                                end_date,
                                passwordHash
                            ],
                            (err, result) => {

                                if (err) {
                                    console.error(err);

                                    if (err.code === 'ER_DUP_ENTRY') {
                                        return res.status(409).json({
                                            success: false,
                                            message:
                                                'Registration number already exists for this school'
                                        });
                                    }

                                    return res.status(500).json({
                                        success: false,
                                        message: 'Failed to add student'
                                    });
                                }

                                res.status(201).json({
                                    success: true,
                                    message: 'Student registered successfully',
                                    student_id: result.insertId
                                });
                            }
                        );
                    }
                );
            }
        );

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


// GET ALL STUDENTS
const getAllStudents = (req, res) => {

    const sql = `
        SELECT
            students.id,
            students.student_id,
            students.full_name,
            students.registration_number,
            students.email,
            students.phone,
             students.school_id,
            schools.name AS school_name,
            students.department,
            students.course,
            students.siwes_batch_id,
            students.start_date,
            students.end_date,
            students.status,
            students.created_at
        FROM students
        INNER JOIN schools
            ON students.school_id = schools.id
        ORDER BY students.id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch students'
            });
        }

        res.json({
            success: true,
            data: results
        });
    });
};


// GET ONE STUDENT
const getStudentById = (req, res) => {

    const { id } = req.params;

    const sql = `
        SELECT
            students.id,
            students.student_id,
            students.full_name,
            students.registration_number,
            students.email,
            students.phone,
            students.school_id,
            schools.name AS school_name,
            students.department,
            students.course,
            students.siwes_batch_id,
            students.start_date,
            students.end_date,
            students.status,
            students.created_at
        FROM students
        INNER JOIN schools
            ON students.school_id = schools.id
        WHERE students.id = ?
    `;

    db.query(sql, [id], (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            data: results[0]
        });
    });
};


// UPDATE STUDENT
const updateStudent = (req, res) => {

    const { id } = req.params;

    const {
        full_name,
        registration_number,
        email,
        phone,
        school_id,
        department,
        course,
        siwes_batch_id,
        start_date,
        end_date,
        status
    } = req.body;

    if (
        !full_name ||
        !registration_number ||
        !school_id ||
        !start_date ||
        !end_date
    ) {
        return res.status(400).json({
            success: false,
            message: 'Required fields are missing'
        });
    }

    const sql = `
        UPDATE students
        SET
            full_name = ?,
            registration_number = ?,
            email = ?,
            phone = ?,
            school_id = ?,
            department = ?,
            course = ?,
            siwes_batch_id = ?,
            start_date = ?,
            end_date = ?,
            status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            full_name,
            registration_number,
            email || null,
            phone || null,
            school_id,
            department || null,
            course || null,
            siwes_batch_id || null,
            start_date,
            end_date,
            status || 'active',
            id
        ],
        (err, result) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: 'Failed to update student'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }

            res.json({
                success: true,
                message: 'Student updated successfully'
            });
        }
    );
};

// =====================================================
// GET MY PROFILE
// =====================================================

const getMyProfile = (req, res) => {

    const studentId = req.user.id;

    const sql = `
        SELECT
            s.id,
            s.student_id,
            s.full_name,
            s.registration_number,
            s.email,
            s.phone,
            s.department,
            s.course,
            s.start_date,
            s.end_date,
            s.status,

            sc.id AS school_id,
            sc.name AS school_name,
            sc.address AS school_address,
            sc.contact AS school_contact,
            sc.email AS school_email,

            b.id AS batch_id,
            b.name AS batch_name,
            b.start_date AS batch_start_date,
            b.end_date AS batch_end_date,
            b.fee AS batch_fee,
            b.description AS batch_description,
            b.status AS batch_status

        FROM students s

        INNER JOIN schools sc
            ON s.school_id = sc.id

        LEFT JOIN siwes_batches b
            ON s.siwes_batch_id = b.id

        WHERE s.id = ?
    `;

    db.query(
        sql,
        [studentId],
        (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    success: false,
                    message:
                        'Failed to fetch profile'
                });

            }


            if (results.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Student profile not found'
                });

            }


            const student =
                results[0];


            res.json({

                success: true,

                data: {

                    // =====================================
                    // STUDENT
                    // =====================================

                    student: {

                        id: student.id,

                        student_id:
                            student.student_id,

                        full_name:
                            student.full_name,

                        registration_number:
                            student.registration_number,

                        email:
                            student.email,

                        phone:
                            student.phone,

                        department:
                            student.department,

                        course:
                            student.course,

                        start_date:
                            student.start_date,

                        end_date:
                            student.end_date,

                        status:
                            student.status

                    },


                    // =====================================
                    // SCHOOL
                    // =====================================

                    school: {

                        id:
                            student.school_id,

                        name:
                            student.school_name,

                        address:
                            student.school_address,

                        contact:
                            student.school_contact,

                        email:
                            student.school_email

                    },


                    // =====================================
                    // SIWES BATCH
                    // =====================================

                    siwes_batch:

                        student.batch_id

                            ? {

                                id:
                                    student.batch_id,

                                name:
                                    student.batch_name,

                                start_date:
                                    student.batch_start_date,

                                end_date:
                                    student.batch_end_date,

                                    fee:
    Number(student.batch_fee) || 0,

                                description:
                                    student.batch_description,

                                status:
                                    student.batch_status

                            }

                            : null

                }

            });

        }
    );

};


// GET MY SIWES INFORMATION
const getMySIWES = (req, res) => {

    const studentId = req.user.id;

    const sql = `
        SELECT
            s.id,
            s.student_id,
            s.full_name,
            s.registration_number,
            s.department,
            s.course,
            s.start_date AS student_start_date,
            s.end_date AS student_end_date,
            s.status AS student_status,

            sc.id AS school_id,
            sc.name AS school_name,

            b.id AS batch_id,
            b.name AS batch_name,
            b.start_date AS batch_start_date,
            b.end_date AS batch_end_date,
            b.fee AS batch_fee,
            b.description AS batch_description,
            b.status AS batch_status

        FROM students s

        INNER JOIN schools sc
            ON s.school_id = sc.id

        LEFT JOIN siwes_batches b
            ON s.siwes_batch_id = b.id

        WHERE s.id = ?
    `;

    db.query(sql, [studentId], (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch SIWES information'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student SIWES information not found'
            });
        }

        const student = results[0];

        res.json({
            success: true,

            data: {
                student: {
                    id: student.id,
                    student_id: student.student_id,
                    full_name: student.full_name,
                    registration_number: student.registration_number,
                    department: student.department,
                    course: student.course,
                    start_date: student.student_start_date,
                    end_date: student.student_end_date,
                    status: student.student_status
                },

                school: {
                    id: student.school_id,
                    name: student.school_name
                },

                siwes_batch: student.batch_id
                    ? {
                        id: student.batch_id,
                        name: student.batch_name,
                        start_date: student.batch_start_date,
                        end_date: student.batch_end_date,
                        fee: Number(student.batch_fee) || 0,
                        description: student.batch_description,
                        status: student.batch_status
                    }
                    : null
            }
        });
    });
};

// GET STUDENT DASHBOARD SUMMARY
const getStudentDashboard = (req, res) => {

    const studentId = req.user.id;

    const studentSql = `
        SELECT
            s.id,
            s.student_id,
            s.full_name,
            s.registration_number,
            s.department,
            s.course,
            s.start_date,
            s.end_date,
            s.status,

            sc.id AS school_id,
            sc.name AS school_name,

            b.id AS batch_id,
            b.name AS batch_name,
            b.start_date AS batch_start_date,
            b.end_date AS batch_end_date,
            b.fee AS batch_fee,
            b.status AS batch_status

        FROM students s

        INNER JOIN schools sc
            ON s.school_id = sc.id

        LEFT JOIN siwes_batches b
            ON s.siwes_batch_id = b.id

        WHERE s.id = ?
    `;

    db.query(studentSql, [studentId], (err, studentResults) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch student dashboard'
            });
        }

        if (studentResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const student = studentResults[0];

        const attendanceSql = `
            SELECT
                COUNT(DISTINCT q.id) AS total_sessions,

                COUNT(DISTINCT CASE
                    WHEN a.status = 'present'
                    THEN a.id
                END) AS present,

                COUNT(DISTINCT CASE
                    WHEN a.status = 'late'
                    THEN a.id
                END) AS late,

                COUNT(DISTINCT CASE
                    WHEN a.id IS NULL
                    THEN q.id
                END) AS absent

            FROM qr_sessions q

            LEFT JOIN attendance a
                ON a.qr_session_id = q.id
                AND a.student_id = ?

            WHERE q.session_date <= DATE(
                CONVERT_TZ(NOW(), '+00:00', '+01:00')
            )
        `;

        db.query(
            attendanceSql,
            [studentId],
            (attendanceErr, attendanceResults) => {

                if (attendanceErr) {
                    console.error(attendanceErr);

                    return res.status(500).json({
                        success: false,
                        message: 'Failed to fetch attendance summary'
                    });
                }

                const attendance = attendanceResults[0];

                const totalSessions =
                    Number(attendance.total_sessions) || 0;

                const present =
                    Number(attendance.present) || 0;

                const late =
                    Number(attendance.late) || 0;

                const absent =
                    Number(attendance.absent) || 0;

                const attended = present + late;

                const attendancePercentage =
                    totalSessions > 0
                        ? Number(
                            ((attended / totalSessions) * 100).toFixed(2)
                        )
                        : 0;

                res.json({
                    success: true,

                    data: {
                        student: {
                            id: student.id,
                            student_id: student.student_id,
                            full_name: student.full_name,
                            registration_number: student.registration_number,
                            department: student.department,
                            course: student.course,
                            status: student.status
                        },

                        school: {
                            id: student.school_id,
                            name: student.school_name
                        },

                       siwes: student.batch_id
    ? {
        batch_id: student.batch_id,
        batch_name: student.batch_name,
        start_date: student.batch_start_date,
        end_date: student.batch_end_date,
        fee: Number(student.batch_fee) || 0,
        status: student.batch_status
    }
    : {
        batch_id: null,
        batch_name: null,
        start_date: student.start_date,
        end_date: student.end_date,
        fee: 0,
        status: null
    },

                        attendance: {
                            total_sessions: totalSessions,
                            present: present,
                            late: late,
                            absent: absent,
                            attendance_percentage: attendancePercentage
                        }
                    }
                });
            }
        );
    });
};

// =====================================================
// CHANGE STUDENT PASSWORD
// =====================================================

const changeStudentPassword = async (req, res) => {

    const studentId = req.user.id;

    const {
        current_password,
        new_password,
        confirm_password
    } = req.body;


    // ================================================
    // VALIDATION
    // ================================================

    if (
        !current_password ||
        !new_password ||
        !confirm_password
    ) {

        return res.status(400).json({
            success: false,
            message:
                'Current password, new password and confirm password are required'
        });

    }


    // ================================================
    // PASSWORD LENGTH
    // ================================================

    if (new_password.length < 6) {

        return res.status(400).json({
            success: false,
            message:
                'New password must be at least 6 characters long'
        });

    }


    // ================================================
    // CONFIRM PASSWORD
    // ================================================

    if (new_password !== confirm_password) {

        return res.status(400).json({
            success: false,
            message:
                'New password and confirm password do not match'
        });

    }


    // ================================================
    // GET STUDENT
    // ================================================

    const sql = `
        SELECT
            id,
            password_hash,
            status
        FROM students
        WHERE id = ?
        LIMIT 1
    `;


    db.query(
        sql,
        [studentId],
        async (err, results) => {

            if (err) {

                console.error(
                    'Change student password error:',
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        'Database error'
                });

            }


            if (results.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Student account not found'
                });

            }


            const student =
                results[0];


            // =========================================
            // CHECK ACCOUNT
            // =========================================

            if (
                student.status !== 'active'
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        'Student account is not active'
                });

            }


            // =========================================
            // CHECK CURRENT PASSWORD
            // =========================================

            const passwordMatch =
                await bcrypt.compare(
                    current_password,
                    student.password_hash
                );


            if (!passwordMatch) {

                return res.status(401).json({
                    success: false,
                    message:
                        'Current password is incorrect'
                });

            }


            // =========================================
            // PREVENT SAME PASSWORD
            // =========================================

            const samePassword =
                await bcrypt.compare(
                    new_password,
                    student.password_hash
                );


            if (samePassword) {

                return res.status(400).json({
                    success: false,
                    message:
                        'New password must be different from current password'
                });

            }


            // =========================================
            // HASH NEW PASSWORD
            // =========================================

            const newPasswordHash =
                await bcrypt.hash(
                    new_password,
                    10
                );


            // =========================================
            // UPDATE PASSWORD
            // =========================================

            const updateSql = `
                UPDATE students
                SET password_hash = ?
                WHERE id = ?
            `;


            db.query(
                updateSql,
                [
                    newPasswordHash,
                    studentId
                ],
                (updateErr) => {

                    if (updateErr) {

                        console.error(
                            'Update student password error:',
                            updateErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                'Failed to update password'
                        });

                    }


                    return res.json({
                        success: true,
                        message:
                            'Password changed successfully'
                    });

                }
            );

        }
    );

};

module.exports = {
    addStudent,
    getAllStudents,
    getStudentById,
    updateStudent,
    getMyProfile,
    getMySIWES,
    getStudentDashboard,
    changeStudentPassword
};