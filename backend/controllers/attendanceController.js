const db = require('../config/database');
const markAttendance = (req, res) => {

    const studentId = req.user.id;
    const { qr_token } = req.body;

    if (!qr_token) {
        return res.status(400).json({
            success: false,
            message: 'QR token is required'
        });
    }

    // FIND QR SESSION
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
    `;

    db.query(qrSql, [qr_token], (err, qrResults) => {

        if (err) {
            console.error(err);

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

        // CHECK SESSION STATUS
        if (qrSession.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'QR session is not active'
            });
        }

        // GET CURRENT DATE AND TIME AS STRINGS
        const timeSql = `
            SELECT
                DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today_date,
                TIME_FORMAT(CURTIME(), '%H:%i:%s') AS today_time
        `;

        db.query(timeSql, (timeErr, timeResults) => {

            if (timeErr) {
                console.error(timeErr);

                return res.status(500).json({
                    success: false,
                    message: 'Failed to verify current time'
                });
            }

            const currentDate = timeResults[0].today_date;
            const currentTime = timeResults[0].today_time;

            // CHECK QR DATE
            if (qrSession.session_date !== currentDate) {

                return res.status(400).json({
                    success: false,
                    message: 'This QR code is not valid for today'
                });
            }

            // CHECK START TIME
            if (currentTime < qrSession.start_time) {

                return res.status(400).json({
                    success: false,
                    message: 'Attendance session has not started yet'
                });
            }

            // CHECK END TIME
            if (currentTime > qrSession.end_time) {

                return res.status(400).json({
                    success: false,
                    message: 'Attendance session has ended'
                });
            }

            // CHECK EXPIRY USING DATABASE TIME
            const expirySql = `
                SELECT
                    CASE
                        WHEN NOW() > expires_at THEN 1
                        ELSE 0
                    END AS expired
                FROM qr_sessions
                WHERE id = ?
            `;

            db.query(
                expirySql,
                [qrSession.id],
                (expiryErr, expiryResults) => {

                    if (expiryErr) {
                        console.error(expiryErr);

                        return res.status(500).json({
                            success: false,
                            message: 'Failed to verify QR expiry'
                        });
                    }

                    if (expiryResults[0].expired === 1) {

                        return res.status(400).json({
                            success: false,
                            message: 'QR code has expired'
                        });
                    }

                    // CHECK STUDENT
                    const studentSql = `
                        SELECT
                            id,
                            student_id,
                            full_name,
                            status
                        FROM students
                        WHERE id = ?
                    `;

                    db.query(
                        studentSql,
                        [studentId],
                        (studentErr, studentResults) => {

                            if (studentErr) {
                                console.error(studentErr);

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

                            // CHECK STUDENT STATUS
                            if (student.status !== 'active') {

                                return res.status(403).json({
                                    success: false,
                                    message: 'Student account is not active'
                                });
                            }

                            // CHECK DUPLICATE
                            const duplicateSql = `
                                SELECT id
                                FROM attendance
                                WHERE student_id = ?
                                AND qr_session_id = ?
                            `;

                            db.query(
                                duplicateSql,
                                [studentId, qrSession.id],
                                (duplicateErr, duplicateResults) => {

                                    if (duplicateErr) {
                                        console.error(duplicateErr);

                                        return res.status(500).json({
                                            success: false,
                                            message: 'Failed to check attendance'
                                        });
                                    }

                                    if (duplicateResults.length > 0) {

                                        return res.status(409).json({
                                            success: false,
                                            message: 'Attendance already marked for this session'
                                        });
                                    }

                                    // INSERT ATTENDANCE
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
                                                console.error(insertErr);

                                                return res.status(500).json({
                                                    success: false,
                                                    message: 'Failed to mark attendance'
                                                });
                                            }

                                            return res.status(201).json({
                                                success: true,
                                                message: 'Attendance marked successfully',
                                                data: {
                                                    attendance_id: insertResult.insertId,
                                                    student_id: student.student_id,
                                                    student_name: student.full_name,
                                                    attendance_date: currentDate,
                                                    attendance_time: currentTime,
                                                    status: 'present',
                                                    qr_session_id: qrSession.id
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



// GET MY ATTENDANCE
const getMyAttendance = (req, res) => {

    const studentId = req.user.id;

    const sql = `
        SELECT
            a.id,
            a.attendance_date,
            a.attendance_time,
            a.status,
            q.session_type,
            q.start_time,
            q.end_time
        FROM attendance a
        INNER JOIN qr_sessions q
            ON a.qr_session_id = q.id
        WHERE a.student_id = ?
        ORDER BY a.attendance_date DESC, a.attendance_time DESC
    `;

    db.query(sql, [studentId], (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch attendance'
            });
        }

        res.json({
            success: true,
            student_id: studentId,
            total_records: results.length,
            data: results
        });
    });
};
const getMyAttendanceSummary = (req, res) => {

    const studentId = req.user.id;

    // ==========================================
    // GET STUDENT INFORMATION
    // ==========================================

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


            // ==========================================
            // GET ATTENDANCE SUMMARY
            // ==========================================

            const summarySql = `

                SELECT

                    COUNT(q.id)
                        AS total_sessions,

                    COUNT(a.id)
                        AS total_attendance,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN a.status = 'present'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS present,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN a.status = 'late'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS late

                FROM qr_sessions q

                LEFT JOIN attendance a
                    ON a.qr_session_id = q.id
                    AND a.student_id = ?

                WHERE q.session_date >= ?

                AND q.session_date <= ?

                AND q.session_date <= DATE(
                    CONVERT_TZ(
                        NOW(),
                        '+00:00',
                        '+01:00'
                    )
                )

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
                        summaryResults[0];


                    // ==========================================
                    // SUMMARY VALUES
                    // ==========================================

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


                    // ==========================================
                    // ATTENDED
                    // ==========================================

                    const attended =
                        present + late;


                    // ==========================================
                    // ABSENT
                    // ==========================================

                    const absent =
                        Math.max(
                            totalSessions - attended,
                            0
                        );


                    // ==========================================
                    // ATTENDANCE PERCENTAGE
                    // ==========================================

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


                    // ==========================================
                    // ATTENDANCE STATUS
                    // ==========================================

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


                    // ==========================================
                    // RESPONSE
                    // ==========================================

                    res.json({

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







// GET TODAY'S ATTENDANCE
const getTodayAttendance = (req, res) => {

    const sql = `
        SELECT
            a.id,
            s.student_id,
            s.full_name,
            sc.name AS school_name,
            b.name AS batch_name,
            a.attendance_date,
            a.attendance_time,
            a.status,
            q.session_type
        FROM attendance a

        INNER JOIN students s
            ON a.student_id = s.id

        INNER JOIN schools sc
            ON s.school_id = sc.id

        LEFT JOIN siwes_batches b
            ON s.siwes_batch_id = b.id

        INNER JOIN qr_sessions q
            ON a.qr_session_id = q.id

        WHERE a.attendance_date = DATE(
            CONVERT_TZ(NOW(), '+00:00', '+01:00')
        )

        ORDER BY a.attendance_time ASC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch today attendance'
            });
        }

        res.json({
            success: true,
            date: new Date().toISOString().split('T')[0],
            total_records: results.length,
            data: results
        });
    });
};

// GET ATTENDANCE HISTORY
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
            s.student_id,
            s.full_name,
            sc.id AS school_id,
            sc.name AS school_name,
            b.id AS batch_id,
            b.name AS batch_name,
            a.attendance_date,
            a.attendance_time,
            a.status,
            q.session_type
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

    // FILTER BY DATE
    if (date) {
        sql += ` AND a.attendance_date = ?`;
        values.push(date);
    }

    // FILTER BY SCHOOL
    if (school_id) {
        sql += ` AND s.school_id = ?`;
        values.push(school_id);
    }

    // FILTER BY STUDENT
    if (student_id) {
        sql += ` AND s.student_id = ?`;
        values.push(student_id);
    }

    // FILTER BY STATUS
    if (status) {
        sql += ` AND a.status = ?`;
        values.push(status);
    }

    sql += `
        ORDER BY
            a.attendance_date DESC,
            a.attendance_time DESC
    `;

    db.query(sql, values, (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch attendance history'
            });
        }

        res.json({
            success: true,
            total_records: results.length,
            filters: {
                date: date || null,
                school_id: school_id || null,
                student_id: student_id || null,
                status: status || null
            },
            data: results
        });
    });
};

// GET ATTENDANCE DETAILS
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
    `;

    db.query(sql, [id], (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch attendance details'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        res.json({
            success: true,
            data: results[0]
        });
    });
};

// GET STUDENT ATTENDANCE REPORT
const getStudentAttendanceReport = (req, res) => {

    const { student_id } = req.params;

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
    `;

    db.query(studentSql, [student_id], (studentErr, studentResults) => {

        if (studentErr) {
            console.error(studentErr);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch student information'
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
                    console.error(attendanceErr);

                    return res.status(500).json({
                        success: false,
                        message: 'Failed to fetch student attendance'
                    });
                }

                const totalSessions = attendanceResults.length;

                const present = attendanceResults.filter(
                    record => record.status === 'present'
                ).length;

                const late = attendanceResults.filter(
                    record => record.status === 'late'
                ).length;

                const attended = present + late;

                const attendancePercentage =
                    totalSessions > 0
                        ? Number(
                            ((attended / totalSessions) * 100).toFixed(2)
                        )
                        : 0;

                res.json({
                    success: true,

                    student: {
                        id: student.id,
                        student_id: student.student_id,
                        full_name: student.full_name,
                        registration_number: student.registration_number,
                        email: student.email,
                        phone: student.phone,
                        department: student.department,
                        course: student.course,
                        start_date: student.start_date,
                        end_date: student.end_date,
                        status: student.status
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
                            end_date: student.batch_end_date
                        }
                        : null,

                    summary: {
                        total_sessions: totalSessions,
                        present: present,
                        late: late,
                        absent: 0,
                        attendance_percentage: attendancePercentage
                    },

                    attendance: attendanceResults
                });
            }
        );
    });
};

// GET SCHOOL ATTENDANCE REPORT
const getSchoolAttendanceReport = (req, res) => {

    const { school_id } = req.params;

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
    `;

    db.query(schoolSql, [school_id], (schoolErr, schoolResults) => {

        if (schoolErr) {
            console.error(schoolErr);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch school'
            });
        }

        if (schoolResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'School not found'
            });
        }

        const school = schoolResults[0];

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
                    console.error(attendanceErr);

                    return res.status(500).json({
                        success: false,
                        message: 'Failed to fetch school attendance'
                    });
                }

                const totalRecords = attendanceResults.length;

                const present = attendanceResults.filter(
                    record => record.status === 'present'
                ).length;

                const late = attendanceResults.filter(
                    record => record.status === 'late'
                ).length;

                res.json({
                    success: true,

                    school: {
                        id: school.id,
                        name: school.name,
                        address: school.address,
                        contact: school.contact,
                        email: school.email,
                        status: school.status
                    },

                    summary: {
                        total_attendance_records: totalRecords,
                        present: present,
                        late: late
                    },

                    attendance: attendanceResults
                });
            }
        );
    });
};

// GET SIWES BATCH ATTENDANCE REPORT
const getBatchAttendanceReport = (req, res) => {

    const { batch_id } = req.params;

    // GET BATCH
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
    `;

    db.query(batchSql, [batch_id], (batchErr, batchResults) => {

        if (batchErr) {
            console.error(batchErr);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch SIWES batch'
            });
        }

        if (batchResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'SIWES batch not found'
            });
        }

        const batch = batchResults[0];

        // GET STUDENTS IN THIS BATCH
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

            ORDER BY s.full_name ASC
        `;

        db.query(
            studentsSql,
            [batch_id],
            (studentsErr, studentsResults) => {

                if (studentsErr) {
                    console.error(studentsErr);

                    return res.status(500).json({
                        success: false,
                        message: 'Failed to fetch batch students'
                    });
                }

                // GET ATTENDANCE RECORDS
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
                            console.error(attendanceErr);

                            return res.status(500).json({
                                success: false,
                                message: 'Failed to fetch batch attendance'
                            });
                        }

                        // GET TOTAL QR SESSIONS FOR THIS BATCH
                        const sessionsSql = `
                            SELECT
                                COUNT(*) AS total_sessions
                            FROM qr_sessions
                            WHERE session_date BETWEEN ? AND ?
                        `;

                        db.query(
                            sessionsSql,
                            [
                                batch.start_date,
                                batch.end_date
                            ],
                            (sessionsErr, sessionsResults) => {

                                if (sessionsErr) {
                                    console.error(sessionsErr);

                                    return res.status(500).json({
                                        success: false,
                                        message: 'Failed to calculate batch sessions'
                                    });
                                }

                                const totalStudents =
                                    studentsResults.length;

                                const totalSessions =
                                    Number(
                                        sessionsResults[0].total_sessions
                                    ) || 0;

                                const totalRecords =
                                    attendanceResults.length;

                                const present =
                                    attendanceResults.filter(
                                        record =>
                                            record.status === 'present'
                                    ).length;

                                const late =
                                    attendanceResults.filter(
                                        record =>
                                            record.status === 'late'
                                    ).length;

                                const attended =
                                    present + late;

                                const expectedAttendance =
                                    totalStudents * totalSessions;

                                const absent =
                                    Math.max(
                                        expectedAttendance - attended,
                                        0
                                    );

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

                                // FINAL RESPONSE
                                res.json({
                                    success: true,

                                    batch: {
                                        id: batch.id,
                                        name: batch.name,
                                        start_date: batch.start_date,
                                        end_date: batch.end_date,
                                        description: batch.description,
                                        status: batch.status
                                    },

                                    summary: {
                                        total_students: totalStudents,
                                        total_sessions: totalSessions,
                                        total_attendance_records:
                                            totalRecords,
                                        present: present,
                                        late: late,
                                        absent: absent,
                                        attendance_percentage:
                                            attendancePercentage
                                    },

                                    students: studentsResults,

                                    attendance: attendanceResults
                                });
                            }
                        );
                    }
                );
            }
        );
    });
};

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