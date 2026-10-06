const db = require('../config/database');


// ============================================================
// MARK ATTENDANCE
// ============================================================
const markAttendance = (req, res) => {

    const studentId = req.user.id;
    const { qr_token } = req.body;

    if (!qr_token) {
        return res.status(400).json({
            success: false,
            message: 'QR token is required'
        });
    }

    // ========================================================
    // FIND QR SESSION
    // ========================================================
    const qrSql = `
        SELECT
            id,
            qr_token,
            session_type,
            DATE_FORMAT(session_date, '%Y-%m-%d') AS session_date,
            TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
            TIME_FORMAT(end_time, '%H:%i:%s') AS end_time,
            expires_at,
            status
        FROM qr_sessions
        WHERE qr_token = ?
        LIMIT 1
    `;

    db.query(qrSql, [qr_token], (err, qrResults) => {

        if (err) {
            console.error('QR session error:', err);

            return res.status(500).json({
                success: false,
                message: 'Failed to verify QR session'
            });
        }

        if (qrResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invalid QR code'
            });
        }

        const qrSession = qrResults[0];

        // ====================================================
        // CHECK SESSION STATUS
        // ====================================================
        if (qrSession.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'QR session is not active'
            });
        }

        // ====================================================
        // GET CURRENT DATABASE DATE AND TIME
        // ====================================================
        const timeSql = `
            SELECT
                DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today_date,
                TIME_FORMAT(CURTIME(), '%H:%i:%s') AS today_time
        `;

        db.query(timeSql, (timeErr, timeResults) => {

            if (timeErr) {
                console.error('Current time error:', timeErr);

                return res.status(500).json({
                    success: false,
                    message: 'Failed to verify current time'
                });
            }

            const currentDate = timeResults[0].today_date;
            const currentTime = timeResults[0].today_time;

            // =================================================
            // CHECK QR DATE
            // =================================================
            if (qrSession.session_date !== currentDate) {

                return res.status(400).json({
                    success: false,
                    message: 'This QR code is not valid for today'
                });
            }

            // =================================================
            // CHECK START TIME
            // =================================================
            if (currentTime < qrSession.start_time) {

                return res.status(400).json({
                    success: false,
                    message: 'Attendance session has not started yet'
                });
            }

            // =================================================
            // CHECK END TIME
            // =================================================
            if (currentTime > qrSession.end_time) {

                return res.status(400).json({
                    success: false,
                    message: 'Attendance session has ended'
                });
            }

            // =================================================
            // CHECK QR EXPIRY
            // =================================================
            const expirySql = `
                SELECT
                    CASE
                        WHEN NOW() > expires_at THEN 1
                        ELSE 0
                    END AS expired
                FROM qr_sessions
                WHERE id = ?
                LIMIT 1
            `;

            db.query(
                expirySql,
                [qrSession.id],
                (expiryErr, expiryResults) => {

                    if (expiryErr) {
                        console.error('QR expiry error:', expiryErr);

                        return res.status(500).json({
                            success: false,
                            message: 'Failed to verify QR expiry'
                        });
                    }

                    if (
                        expiryResults.length === 0 ||
                        expiryResults[0].expired === 1
                    ) {

                        return res.status(400).json({
                            success: false,
                            message: 'QR code has expired'
                        });
                    }

                    // =================================================
                    // CHECK STUDENT
                    // =================================================
                    const studentSql = `
                        SELECT
                            id,
                            student_id,
                            full_name,
                            registration_number,
                            status,
                            school_id,
                            siwes_batch_id,
                            start_date,
                            end_date
                        FROM students
                        WHERE id = ?
                        LIMIT 1
                    `;

                    db.query(
                        studentSql,
                        [studentId],
                        (studentErr, studentResults) => {

                            if (studentErr) {
                                console.error(
                                    'Student verification error:',
                                    studentErr
                                );

                                return res.status(500).json({
                                    success: false,
                                    message: 'Failed to verify student'
                                });
                            }

                            if (studentResults.length === 0) {

                                return res.status(404).json({
                                    success: false,
                                    message: 'Student not found'
                                });
                            }

                            const student = studentResults[0];

                            // =================================================
                            // CHECK STUDENT STATUS
                            // =================================================
                            if (student.status !== 'active') {

                                return res.status(403).json({
                                    success: false,
                                    message: 'Student account is not active'
                                });
                            }

                            // =================================================
                            // CHECK STUDENT SIWES DATE RANGE
                            // =================================================
                            if (
                                student.start_date &&
                                currentDate < String(student.start_date).slice(0, 10)
                            ) {

                                return res.status(403).json({
                                    success: false,
                                    message: 'Your SIWES has not started yet'
                                });
                            }

                            if (
                                student.end_date &&
                                currentDate > String(student.end_date).slice(0, 10)
                            ) {

                                return res.status(403).json({
                                    success: false,
                                    message: 'Your SIWES period has ended'
                                });
                            }

                            // =================================================
                            // CHECK DUPLICATE ATTENDANCE
                            //
                            // ONE STUDENT = ONE ATTENDANCE PER DAY
                            // =================================================
                            const duplicateSql = `
                                SELECT
                                    id,
                                    attendance_date,
                                    attendance_time,
                                    status
                                FROM attendance
                                WHERE student_id = ?
                                  AND attendance_date = ?
                                LIMIT 1
                            `;

                            db.query(
                                duplicateSql,
                                [studentId, currentDate],
                                (duplicateErr, duplicateResults) => {

                                    if (duplicateErr) {
                                        console.error(
                                            'Duplicate attendance error:',
                                            duplicateErr
                                        );

                                        return res.status(500).json({
                                            success: false,
                                            message: 'Failed to check attendance'
                                        });
                                    }

                                    if (duplicateResults.length > 0) {

                                        return res.status(409).json({
                                            success: false,
                                            message: 'Attendance already recorded today'
                                        });
                                    }

                                    // =================================================
                                    // INSERT ATTENDANCE
                                    // =================================================
                                    const insertSql = `
                                        INSERT INTO attendance
                                        (
                                            student_id,
                                            qr_session_id,
                                            attendance_date,
                                            attendance_time,
                                            status
                                        )
                                        VALUES
                                        (
                                            ?,
                                            ?,
                                            ?,
                                            ?,
                                            'present'
                                        )
                                    `;

                                    db.query(
                                        insertSql,
                                        [
                                            studentId,
                                            qrSession.id,
                                            currentDate,
                                            currentTime
                                        ],
                                        (insertErr, insertResult) => {

                                            if (insertErr) {
                                                console.error(
                                                    'Insert attendance error:',
                                                    insertErr
                                                );

                                                return res.status(500).json({
                                                    success: false,
                                                    message: 'Failed to mark attendance'
                                                });
                                            }

                                            return res.status(201).json({

                                                success: true,

                                                message:
                                                    'Attendance marked successfully',

                                                data: {

                                                    attendance_id:
                                                        insertResult.insertId,

                                                    student_id:
                                                        student.student_id,

                                                    student_name:
                                                        student.full_name,

                                                    attendance_date:
                                                        currentDate,

                                                    attendance_time:
                                                        currentTime,

                                                    status:
                                                        'present',

                                                    qr_session_id:
                                                        qrSession.id
                                                }
                                            });

                                        }
                                    );

                                }
                            );

                        }
                    );

                }
            );

        });

    });

};


// ============================================================
// GET MY ATTENDANCE
// ============================================================
const getMyAttendance = (req, res) => {

    const studentId = req.user.id;

    const sql = `
        SELECT
            a.id,
            a.attendance_date,
            a.attendance_time,
            a.status,

            q.id AS qr_session_id,
            q.session_type,
            q.session_date,
            q.start_time,
            q.end_time

        FROM attendance a

        INNER JOIN qr_sessions q
            ON a.qr_session_id = q.id

        WHERE a.student_id = ?

        ORDER BY
            a.attendance_date DESC,
            a.attendance_time DESC
    `;

    db.query(sql, [studentId], (err, results) => {

        if (err) {
            console.error('My attendance error:', err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch attendance'
            });
        }

        return res.json({

            success: true,

            student_id:
                studentId,

            total_records:
                results.length,

            data:
                results
        });
    });
};


// ============================================================
// GET MY ATTENDANCE SUMMARY
// ============================================================
const getMyAttendanceSummary = (req, res) => {

    const studentId = req.user.id;

    // ========================================================
    // GET STUDENT INFORMATION
    // ========================================================
    const studentSql = `
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

            b.id AS batch_id,
            b.name AS batch_name,
            b.start_date AS batch_start_date,
            b.end_date AS batch_end_date,
            b.status AS batch_status

        FROM students s

        INNER JOIN schools sc
            ON s.school_id = sc.id

        LEFT JOIN siwes_batches b
            ON s.siwes_batch_id = b.id

        WHERE s.id = ?

        LIMIT 1
    `;

    db.query(
        studentSql,
        [studentId],
        (studentErr, studentResults) => {

            if (studentErr) {

                console.error(
                    'Student summary error:',
                    studentErr
                );

                return res.status(500).json({
                    success: false,
                    message:
                        'Failed to fetch student information'
                });
            }

            if (studentResults.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Student not found'
                });
            }

            const student =
                studentResults[0];

            // =================================================
            // GET ATTENDANCE SUMMARY
            //
            // Each calendar date counts ONCE.
            // =================================================
            const summarySql = `
                SELECT

                    COUNT(
                        DISTINCT DATE(q.session_date)
                    ) AS total_sessions,

                    COUNT(
                        DISTINCT CASE
                            WHEN a.id IS NOT NULL
                            THEN DATE(q.session_date)
                        END
                    ) AS total_attendance,

                    COUNT(
                        DISTINCT CASE
                            WHEN a.status = 'present'
                            THEN DATE(q.session_date)
                        END
                    ) AS present,

                    COUNT(
                        DISTINCT CASE
                            WHEN a.status = 'late'
                            THEN DATE(q.session_date)
                        END
                    ) AS late

                FROM qr_sessions q

                LEFT JOIN attendance a
                    ON a.qr_session_id = q.id
                    AND a.student_id = ?

                WHERE DATE(q.session_date) >= ?

                  AND DATE(q.session_date) <= ?

                  AND DATE(q.session_date) <= CURDATE()
            `;

            db.query(
                summarySql,
                [
                    studentId,
                    student.start_date,
                    student.end_date
                ],
                (summaryErr, summaryResults) => {

                    if (summaryErr) {

                        console.error(
                            'Attendance summary error:',
                            summaryErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                'Failed to calculate attendance summary'
                        });
                    }

                    const result =
                        summaryResults[0] || {};

                    const totalSessions =
                        Number(
                            result.total_sessions
                        ) || 0;

                    const totalAttendance =
                        Number(
                            result.total_attendance
                        ) || 0;

                    const present =
                        Number(
                            result.present
                        ) || 0;

                    const late =
                        Number(
                            result.late
                        ) || 0;

                    // =================================================
                    // ATTENDED DAYS
                    // =================================================
                    const attended =
                        present + late;

                    // =================================================
                    // ABSENT DAYS
                    // =================================================
                    const absent =
                        Math.max(
                            totalSessions - attended,
                            0
                        );

                    // =================================================
                    // ATTENDANCE PERCENTAGE
                    // =================================================
                    const attendancePercentage =
                        totalSessions > 0
                            ? Number(
                                (
                                    (
                                        attended /
                                        totalSessions
                                    ) * 100
                                ).toFixed(2)
                            )
                            : 0;

                    // =================================================
                    // ATTENDANCE STATUS
                    // =================================================
                    let attendanceStatus =
                        'No Data';

                    if (totalSessions > 0) {

                        if (
                            attendancePercentage >= 80
                        ) {

                            attendanceStatus =
                                'Excellent';

                        } else if (
                            attendancePercentage >= 60
                        ) {

                            attendanceStatus =
                                'Good';

                        } else if (
                            attendancePercentage >= 40
                        ) {

                            attendanceStatus =
                                'Average';

                        } else {

                            attendanceStatus =
                                'Needs Improvement';
                        }
                    }

                    // =================================================
                    // RESPONSE
                    // =================================================
                    return res.json({

                        success: true,

                        student: {

                            id:
                                student.id,

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
                                student.status,

                            school: {

                                id:
                                    student.school_id,

                                name:
                                    student.school_name
                            },

                            siwes_batch: {

                                id:
                                    student.batch_id,

                                name:
                                    student.batch_name,

                                start_date:
                                    student.batch_start_date,

                                end_date:
                                    student.batch_end_date,

                                status:
                                    student.batch_status
                            }
                        },

                        summary: {

                            total_sessions:
                                totalSessions,

                            total_attendance:
                                totalAttendance,

                            present:
                                present,

                            late:
                                late,

                            absent:
                                absent,

                            attendance_percentage:
                                attendancePercentage,

                            attendance_status:
                                attendanceStatus
                        }
                    });

                }
            );

        }
    );
};


// ============================================================
// GET TODAY'S ATTENDANCE
// ============================================================
const getTodayAttendance = (req, res) => {

    const sql = `
        SELECT

            a.id,

            s.id AS student_database_id,
            s.student_id,
            s.full_name,
            s.registration_number,

            sc.id AS school_id,
            sc.name AS school_name,

            b.id AS batch_id,
            b.name AS batch_name,

            a.attendance_date,
            a.attendance_time,
            a.status,

            q.id AS qr_session_id,
            q.session_type,
            q.session_date,
            q.start_time,
            q.end_time

        FROM attendance a

        INNER JOIN students s
            ON a.student_id = s.id

        INNER JOIN schools sc
            ON s.school_id = sc.id

        LEFT JOIN siwes_batches b
            ON s.siwes_batch_id = b.id

        INNER JOIN qr_sessions q
            ON a.qr_session_id = q.id

        WHERE a.attendance_date = CURDATE()

        ORDER BY
            a.attendance_time ASC
    `;

    db.query(sql, (err, results) => {

        if (err) {

            console.error(
                "Today's attendance error:",
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch today's attendance"
            });
        }

        // =====================================================
        // GET DATABASE DATE
        // =====================================================
        const dateSql = `
            SELECT
                DATE_FORMAT(
                    CURDATE(),
                    '%Y-%m-%d'
                ) AS today_date
        `;

        db.query(
            dateSql,
            (dateErr, dateResults) => {

                if (dateErr) {

                    console.error(
                        'Today date error:',
                        dateErr
                    );

                    return res.json({

                        success: true,

                        date: null,

                        total_records:
                            results.length,

                        data:
                            results
                    });
                }

                return res.json({

                    success: true,

                    date:
                        dateResults[0].today_date,

                    total_records:
                        results.length,

                    data:
                        results
                });

            }
        );

    });
};


// ============================================================
// GET ATTENDANCE HISTORY
// ============================================================
const getAttendanceHistory = (req, res) => {

    const {
        date,
        school_id,
        student_id,
        status
    } = req.query;

    let sql = `
        SELECT

            a.id,

            s.id AS student_database_id,
            s.student_id,
            s.full_name,
            s.registration_number,

            sc.id AS school_id,
            sc.name AS school_name,

            b.id AS batch_id,
            b.name AS batch_name,

            a.attendance_date,
            a.attendance_time,
            a.status,

            q.id AS qr_session_id,
            q.session_type,
            q.session_date,
            q.start_time,
            q.end_time

        FROM attendance a

        INNER JOIN students s
            ON a.student_id = s.id

        INNER JOIN schools sc
            ON s.school_id = sc.id

        LEFT JOIN siwes_batches b
            ON s.siwes_batch_id = b.id

        INNER JOIN qr_sessions q
            ON a.qr_session_id = q.id

        WHERE 1 = 1
    `;

    const values = [];

    // ========================================================
    // FILTER BY DATE
    // ========================================================
    if (date) {

        sql += `
            AND a.attendance_date = ?
        `;

        values.push(date);
    }

    // ========================================================
    // FILTER BY SCHOOL
    // ========================================================
    if (school_id) {

        sql += `
            AND s.school_id = ?
        `;

        values.push(school_id);
    }

    // ========================================================
    // FILTER BY STUDENT
    // ========================================================
    if (student_id) {

        sql += `
            AND s.student_id = ?
        `;

        values.push(student_id);
    }

    // ========================================================
    // FILTER BY STATUS
    // ========================================================
    if (status) {

        sql += `
            AND a.status = ?
        `;

        values.push(status);
    }

    sql += `
        ORDER BY
            a.attendance_date DESC,
            a.attendance_time DESC
    `;

    db.query(
        sql,
        values,
        (err, results) => {

            if (err) {

                console.error(
                    'Attendance history error:',
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        'Failed to fetch attendance history'
                });
            }

            return res.json({

                success: true,

                total_records:
                    results.length,

                filters: {

                    date:
                        date || null,

                    school_id:
                        school_id || null,

                    student_id:
                        student_id || null,

                    status:
                        status || null
                },

                data:
                    results
            });

        }
    );
};


// ============================================================
// GET ATTENDANCE DETAILS
// ============================================================
const getAttendanceById = (req, res) => {

    const { id } = req.params;

    const sql = `
        SELECT

            a.id AS attendance_id,

            s.id AS student_database_id,
            s.student_id,
            s.full_name,
            s.registration_number,
            s.email,
            s.phone,
            s.department,
            s.course,

            sc.id AS school_id,
            sc.name AS school_name,
            sc.address AS school_address,

            b.id AS batch_id,
            b.name AS batch_name,
            b.start_date AS batch_start_date,
            b.end_date AS batch_end_date,

            a.attendance_date,
            a.attendance_time,
            a.status,

            q.id AS qr_session_id,
            q.session_type,
            q.session_date,
            q.start_time AS session_start_time,
            q.end_time AS session_end_time,
            q.expires_at AS qr_expires_at

        FROM attendance a

        INNER JOIN students s
            ON a.student_id = s.id

        INNER JOIN schools sc
            ON s.school_id = sc.id

        LEFT JOIN siwes_batches b
            ON s.siwes_batch_id = b.id

        INNER JOIN qr_sessions q
            ON a.qr_session_id = q.id

        WHERE a.id = ?

        LIMIT 1
    `;

    db.query(
        sql,
        [id],
        (err, results) => {

            if (err) {

                console.error(
                    'Attendance details error:',
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        'Failed to fetch attendance details'
                });
            }

            if (results.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Attendance record not found'
                });
            }

            return res.json({

                success: true,

                data:
                    results[0]
            });

        }
    );
};


// ============================================================
// GET STUDENT ATTENDANCE REPORT
// ============================================================
const getStudentAttendanceReport = (req, res) => {

    const { student_id } = req.params;

    // ========================================================
    // GET STUDENT
    // ========================================================
    const studentSql = `
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

            b.id AS batch_id,
            b.name AS batch_name,
            b.start_date AS batch_start_date,
            b.end_date AS batch_end_date

        FROM students s

        INNER JOIN schools sc
            ON s.school_id = sc.id

        LEFT JOIN siwes_batches b
            ON s.siwes_batch_id = b.id

        WHERE s.student_id = ?

        LIMIT 1
    `;

    db.query(
        studentSql,
        [student_id],
        (studentErr, studentResults) => {

            if (studentErr) {

                console.error(
                    'Student report error:',
                    studentErr
                );

                return res.status(500).json({
                    success: false,
                    message:
                        'Failed to fetch student information'
                });
            }

            if (studentResults.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Student not found'
                });
            }

            const student =
                studentResults[0];

            // =================================================
            // GET ATTENDANCE RECORDS
            // =================================================
            const attendanceSql = `
                SELECT

                    a.id,

                    a.attendance_date,
                    a.attendance_time,
                    a.status,

                    q.id AS qr_session_id,
                    q.session_type,
                    q.session_date,
                    q.start_time,
                    q.end_time

                FROM attendance a

                INNER JOIN qr_sessions q
                    ON a.qr_session_id = q.id

                WHERE a.student_id = ?

                ORDER BY
                    a.attendance_date DESC,
                    a.attendance_time DESC
            `;

            db.query(
                attendanceSql,
                [student.id],
                (attendanceErr, attendanceResults) => {

                    if (attendanceErr) {

                        console.error(
                            'Student attendance error:',
                            attendanceErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                'Failed to fetch student attendance'
                        });
                    }

                    // =================================================
                    // UNIQUE ATTENDANCE DAYS
                    // =================================================
                    const attendanceDays =
                        new Set(
                            attendanceResults.map(
                                record =>
                                    String(
                                        record.attendance_date
                                    ).slice(0, 10)
                            )
                        );

                    const presentDays =
                        new Set(
                            attendanceResults
                                .filter(
                                    record =>
                                        record.status === 'present'
                                )
                                .map(
                                    record =>
                                        String(
                                            record.attendance_date
                                        ).slice(0, 10)
                                )
                        );

                    const lateDays =
                        new Set(
                            attendanceResults
                                .filter(
                                    record =>
                                        record.status === 'late'
                                )
                                .map(
                                    record =>
                                        String(
                                            record.attendance_date
                                        ).slice(0, 10)
                                )
                        );

                    const totalAttendanceDays =
                        attendanceDays.size;

                    const present =
                        presentDays.size;

                    const late =
                        lateDays.size;

                    // =================================================
                    // GET TOTAL ATTENDANCE DAYS
                    //
                    // DISTINCT calendar days on which a QR session
                    // existed within the student's SIWES period.
                    // =================================================
                    const sessionsSql = `
                        SELECT
                            COUNT(
                                DISTINCT DATE(session_date)
                            ) AS total_days

                        FROM qr_sessions

                        WHERE DATE(session_date) >= ?

                          AND DATE(session_date) <= ?

                          AND DATE(session_date) <= CURDATE()
                    `;

                    db.query(
                        sessionsSql,
                        [
                            student.start_date,
                            student.end_date
                        ],
                        (sessionsErr, sessionsResults) => {

                            if (sessionsErr) {

                                console.error(
                                    'Student session calculation error:',
                                    sessionsErr
                                );

                                return res.status(500).json({
                                    success: false,
                                    message:
                                        'Failed to calculate attendance days'
                                });
                            }

                            const totalSessions =
                                Number(
                                    sessionsResults[0]
                                        .total_days
                                ) || 0;

                            const attended =
                                present + late;

                            const absent =
                                Math.max(
                                    totalSessions -
                                    attended,
                                    0
                                );

                            const attendancePercentage =
                                totalSessions > 0
                                    ? Number(
                                        (
                                            (
                                                attended /
                                                totalSessions
                                            ) * 100
                                        ).toFixed(2)
                                    )
                                    : 0;

                            // =================================================
                            // RESPONSE
                            // =================================================
                            return res.json({

                                success: true,

                                student: {

                                    id:
                                        student.id,

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

                                school: {

                                    id:
                                        student.school_id,

                                    name:
                                        student.school_name
                                },

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
                                                student.batch_end_date
                                        }
                                        : null,

                                summary: {

                                    total_sessions:
                                        totalSessions,

                                    total_attendance:
                                        totalAttendanceDays,

                                    present:
                                        present,

                                    late:
                                        late,

                                    absent:
                                        absent,

                                    attendance_percentage:
                                        attendancePercentage
                                },

                                attendance:
                                    attendanceResults
                            });

                        }
                    );

                }
            );

        }
    );
};


// ============================================================
// GET SCHOOL ATTENDANCE REPORT
// ============================================================
const getSchoolAttendanceReport = (req, res) => {

    const { school_id } = req.params;

    // ========================================================
    // GET SCHOOL
    // ========================================================
    const schoolSql = `
        SELECT

            id,
            name,
            address,
            contact,
            email,
            status

        FROM schools

        WHERE id = ?

        LIMIT 1
    `;

    db.query(
        schoolSql,
        [school_id],
        (schoolErr, schoolResults) => {

            if (schoolErr) {

                console.error(
                    'School report error:',
                    schoolErr
                );

                return res.status(500).json({
                    success: false,
                    message:
                        'Failed to fetch school'
                });
            }

            if (schoolResults.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        'School not found'
                });
            }

            const school =
                schoolResults[0];

            // =================================================
            // GET ATTENDANCE
            // =================================================
            const attendanceSql = `
                SELECT

                    a.id,

                    s.student_id,
                    s.full_name,
                    s.registration_number,

                    a.attendance_date,
                    a.attendance_time,
                    a.status,

                    q.id AS qr_session_id,
                    q.session_type,
                    q.session_date,
                    q.start_time,
                    q.end_time

                FROM attendance a

                INNER JOIN students s
                    ON a.student_id = s.id

                INNER JOIN qr_sessions q
                    ON a.qr_session_id = q.id

                WHERE s.school_id = ?

                ORDER BY
                    a.attendance_date DESC,
                    a.attendance_time DESC
            `;

            db.query(
                attendanceSql,
                [school_id],
                (attendanceErr, attendanceResults) => {

                    if (attendanceErr) {

                        console.error(
                            'School attendance error:',
                            attendanceErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                'Failed to fetch school attendance'
                        });
                    }

                    // =================================================
                    // UNIQUE RECORDS BY STUDENT + DATE
                    // =================================================
                    const uniqueAttendance =
                        new Set(
                            attendanceResults.map(
                                record =>
                                    `${record.student_id}-${String(
                                        record.attendance_date
                                    ).slice(0, 10)}`
                            )
                        );

                    const present =
                        new Set(
                            attendanceResults
                                .filter(
                                    record =>
                                        record.status === 'present'
                                )
                                .map(
                                    record =>
                                        `${record.student_id}-${String(
                                            record.attendance_date
                                        ).slice(0, 10)}`
                                )
                        );

                    const late =
                        new Set(
                            attendanceResults
                                .filter(
                                    record =>
                                        record.status === 'late'
                                )
                                .map(
                                    record =>
                                        `${record.student_id}-${String(
                                            record.attendance_date
                                        ).slice(0, 10)}`
                                )
                        );

                    return res.json({

                        success: true,

                        school: {

                            id:
                                school.id,

                            name:
                                school.name,

                            address:
                                school.address,

                            contact:
                                school.contact,

                            email:
                                school.email,

                            status:
                                school.status
                        },

                        summary: {

                            total_attendance_records:
                                uniqueAttendance.size,

                            present:
                                present.size,

                            late:
                                late.size
                        },

                        attendance:
                            attendanceResults
                    });

                }
            );

        }
    );
};


// ============================================================
// GET SIWES BATCH ATTENDANCE REPORT
// ============================================================
const getBatchAttendanceReport = (req, res) => {

    const { batch_id } = req.params;

    // ========================================================
    // GET BATCH
    // ========================================================
    const batchSql = `
        SELECT

            id,
            name,
            start_date,
            end_date,
            description,
            status

        FROM siwes_batches

        WHERE id = ?

        LIMIT 1
    `;

    db.query(
        batchSql,
        [batch_id],
        (batchErr, batchResults) => {

            if (batchErr) {

                console.error(
                    'Batch report error:',
                    batchErr
                );

                return res.status(500).json({
                    success: false,
                    message:
                        'Failed to fetch SIWES batch'
                });
            }

            if (batchResults.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        'SIWES batch not found'
                });
            }

            const batch =
                batchResults[0];

            // =================================================
            // GET STUDENTS IN BATCH
            // =================================================
            const studentsSql = `
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
                    sc.name AS school_name

                FROM students s

                INNER JOIN schools sc
                    ON s.school_id = sc.id

                WHERE s.siwes_batch_id = ?

                ORDER BY
                    s.full_name ASC
            `;

            db.query(
                studentsSql,
                [batch_id],
                (studentsErr, studentsResults) => {

                    if (studentsErr) {

                        console.error(
                            'Batch students error:',
                            studentsErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                'Failed to fetch batch students'
                        });
                    }

                    // =================================================
                    // GET ATTENDANCE RECORDS
                    // =================================================
                    const attendanceSql = `
                        SELECT

                            a.id,

                            s.student_id,
                            s.full_name,
                            s.registration_number,

                            sc.id AS school_id,
                            sc.name AS school_name,

                            a.attendance_date,
                            a.attendance_time,
                            a.status,

                            q.id AS qr_session_id,
                            q.session_type,
                            q.session_date,
                            q.start_time,
                            q.end_time

                        FROM attendance a

                        INNER JOIN students s
                            ON a.student_id = s.id

                        INNER JOIN schools sc
                            ON s.school_id = sc.id

                        INNER JOIN qr_sessions q
                            ON a.qr_session_id = q.id

                        WHERE s.siwes_batch_id = ?

                        ORDER BY
                            a.attendance_date DESC,
                            a.attendance_time DESC
                    `;

                    db.query(
                        attendanceSql,
                        [batch_id],
                        (attendanceErr, attendanceResults) => {

                            if (attendanceErr) {

                                console.error(
                                    'Batch attendance error:',
                                    attendanceErr
                                );

                                return res.status(500).json({
                                    success: false,
                                    message:
                                        'Failed to fetch batch attendance'
                                });
                            }

                            // =================================================
                            // GET TOTAL ATTENDANCE DAYS
                            // =================================================
                            const sessionsSql = `
                                SELECT

                                    COUNT(
                                        DISTINCT DATE(session_date)
                                    ) AS total_sessions

                                FROM qr_sessions

                                WHERE DATE(session_date) >= ?

                                  AND DATE(session_date) <= ?

                                  AND DATE(session_date) <= CURDATE()
                            `;

                            db.query(
                                sessionsSql,
                                [
                                    batch.start_date,
                                    batch.end_date
                                ],
                                (sessionsErr, sessionsResults) => {

                                    if (sessionsErr) {

                                        console.error(
                                            'Batch session calculation error:',
                                            sessionsErr
                                        );

                                        return res.status(500).json({
                                            success: false,
                                            message:
                                                'Failed to calculate batch sessions'
                                        });
                                    }

                                    // =================================================
                                    // TOTAL STUDENTS
                                    // =================================================
                                    const totalStudents =
                                        studentsResults.length;

                                    // =================================================
                                    // TOTAL ATTENDANCE DAYS
                                    // =================================================
                                    const totalSessions =
                                        Number(
                                            sessionsResults[0]
                                                .total_sessions
                                        ) || 0;

                                    // =================================================
                                    // UNIQUE STUDENT + DATE RECORDS
                                    // =================================================
                                    const totalRecords =
                                        new Set(
                                            attendanceResults.map(
                                                record =>
                                                    `${record.student_id}-${String(
                                                        record.attendance_date
                                                    ).slice(0, 10)}`
                                            )
                                        ).size;

                                    // =================================================
                                    // PRESENT DAYS
                                    // =================================================
                                    const present =
                                        new Set(
                                            attendanceResults
                                                .filter(
                                                    record =>
                                                        record.status ===
                                                        'present'
                                                )
                                                .map(
                                                    record =>
                                                        `${record.student_id}-${String(
                                                            record.attendance_date
                                                        ).slice(0, 10)}`
                                                )
                                        ).size;

                                    // =================================================
                                    // LATE DAYS
                                    // =================================================
                                    const late =
                                        new Set(
                                            attendanceResults
                                                .filter(
                                                    record =>
                                                        record.status ===
                                                        'late'
                                                )
                                                .map(
                                                    record =>
                                                        `${record.student_id}-${String(
                                                            record.attendance_date
                                                        ).slice(0, 10)}`
                                                )
                                        ).size;

                                    // =================================================
                                    // TOTAL ATTENDED
                                    // =================================================
                                    const attended =
                                        present + late;

                                    // =================================================
                                    // EXPECTED ATTENDANCE
                                    //
                                    // Every student is expected once per
                                    // attendance day.
                                    // =================================================
                                    const expectedAttendance =
                                        totalStudents *
                                        totalSessions;

                                    // =================================================
                                    // ABSENT
                                    // =================================================
                                    const absent =
                                        Math.max(
                                            expectedAttendance -
                                            attended,
                                            0
                                        );

                                    // =================================================
                                    // PERCENTAGE
                                    // =================================================
                                    const attendancePercentage =
                                        expectedAttendance > 0
                                            ? Number(
                                                (
                                                    (
                                                        attended /
                                                        expectedAttendance
                                                    ) * 100
                                                ).toFixed(2)
                                            )
                                            : 0;

                                    // =================================================
                                    // RESPONSE
                                    // =================================================
                                    return res.json({

                                        success: true,

                                        batch: {

                                            id:
                                                batch.id,

                                            name:
                                                batch.name,

                                            start_date:
                                                batch.start_date,

                                            end_date:
                                                batch.end_date,

                                            description:
                                                batch.description,

                                            status:
                                                batch.status
                                        },

                                        summary: {

                                            total_students:
                                                totalStudents,

                                            total_sessions:
                                                totalSessions,

                                            total_attendance_records:
                                                totalRecords,

                                            present:
                                                present,

                                            late:
                                                late,

                                            absent:
                                                absent,

                                            attendance_percentage:
                                                attendancePercentage
                                        },

                                        students:
                                            studentsResults,

                                        attendance:
                                            attendanceResults
                                    });

                                }
                            );

                        }
                    );

                }
            );

        }
    );
};


// ============================================================
// EXPORT CONTROLLERS
// ============================================================
module.exports = {

    markAttendance,

    getMyAttendance,

    getMyAttendanceSummary,

    getTodayAttendance,

    getAttendanceHistory,

    getAttendanceById,

    getStudentAttendanceReport,

    getSchoolAttendanceReport,

    getBatchAttendanceReport

};