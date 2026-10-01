const db = require('../config/database');


// =====================================================
// GET DEPARTMENTS BY SCHOOL
// =====================================================

const getDepartmentsBySchool = (req, res) => {

    const { school_id } = req.query;

    if (!school_id) {

        return res.status(400).json({
            success: false,
            message: 'school_id is required'
        });

    }

    const sql = `
        SELECT DISTINCT
            department
        FROM students
        WHERE school_id = ?
        AND department IS NOT NULL
        AND TRIM(department) != ''
        ORDER BY department ASC
    `;

    db.query(
        sql,
        [school_id],
        (err, results) => {

            if (err) {

                console.error(
                    'Get departments error:',
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        'Failed to fetch departments'
                });

            }

            res.json({
                success: true,
                data: results
            });

        }
    );

};


// =====================================================
// GET ATTENDANCE REPORT
// =====================================================

const getAttendanceReport = (req, res) => {

    const {
        school_id,
        department,
        student_id,
        from_date,
        to_date
    } = req.query;


    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!school_id) {

        return res.status(400).json({
            success: false,
            message: 'School is required'
        });

    }


    if (!from_date || !to_date) {

        return res.status(400).json({
            success: false,
            message:
                'From date and to date are required'
        });

    }


    if (from_date > to_date) {

        return res.status(400).json({
            success: false,
            message:
                'From date cannot be greater than to date'
        });

    }


    // -------------------------------------------------
    // GET SCHOOL
    // -------------------------------------------------

    const schoolSql = `
        SELECT
            id,
            name,
            address,
            contact,
            email
        FROM schools
        WHERE id = ?
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


            // -------------------------------------------------
            // GET STUDENTS
            // -------------------------------------------------

            let studentSql = `
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
                    s.status
                FROM students s
                WHERE s.school_id = ?
            `;


            const studentParams = [
                school_id
            ];


            // Department filter
            // Case-insensitive

            if (department) {

                studentSql += `
                    AND LOWER(TRIM(s.department)) =
                        LOWER(TRIM(?))
                `;

                studentParams.push(
                    department
                );

            }


            // Student ID filter

            if (student_id) {

                studentSql += `
                    AND s.student_id = ?
                `;

                studentParams.push(
                    student_id
                );

            }


            studentSql += `
                ORDER BY s.full_name ASC
            `;


            db.query(
                studentSql,
                studentParams,
                (
                    studentErr,
                    studentResults
                ) => {

                    if (studentErr) {

                        console.error(
                            'Report students error:',
                            studentErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                'Failed to fetch students'
                        });

                    }


                    // -------------------------------------------------
                    // GET ATTENDANCE RECORDS
                    // -------------------------------------------------

                    let attendanceSql = `
                        SELECT
                            a.id,
                            a.student_id,
                            s.student_id AS student_code,
                            s.full_name,
                            s.registration_number,
                            s.department,
                            a.attendance_date,
                            a.attendance_time,
                            a.status,
                            q.id AS qr_session_id,
                            q.session_type,
                            q.start_time,
                            q.end_time

                        FROM attendance a

                        INNER JOIN students s
                            ON a.student_id = s.id

                        INNER JOIN qr_sessions q
                            ON a.qr_session_id = q.id

                        WHERE s.school_id = ?

                        AND DATE(q.session_date)
                            BETWEEN ?
                            AND ?
                    `;


                    const attendanceParams = [
                        school_id,
                        from_date,
                        to_date
                    ];


                    // Department filter

                    if (department) {

                        attendanceSql += `
                            AND LOWER(TRIM(s.department)) =
                                LOWER(TRIM(?))
                        `;

                        attendanceParams.push(
                            department
                        );

                    }


                    // Student ID filter

                    if (student_id) {

                        attendanceSql += `
                            AND s.student_id = ?
                        `;

                        attendanceParams.push(
                            student_id
                        );

                    }


                    attendanceSql += `
                        ORDER BY
                            a.attendance_date DESC,
                            a.attendance_time DESC
                    `;


                    db.query(
                        attendanceSql,
                        attendanceParams,
                        (
                            attendanceErr,
                            attendanceResults
                        ) => {

                            if (attendanceErr) {

                                console.error(
                                    'Report attendance error:',
                                    attendanceErr
                                );

                                return res.status(500).json({
                                    success: false,
                                    message:
                                        'Failed to fetch attendance records'
                                });

                            }


                            // -------------------------------------------------
                            // GET UNIQUE ATTENDANCE DAYS
                            // -------------------------------------------------
                            //
                            // IMPORTANT:
                            //
                            // If Admin creates 10 QR sessions
                            // on the same date, that date counts
                            // as ONE attendance day.
                            //
                            // Example:
                            //
                            // Sep 6:
                            // QR 1
                            // QR 2
                            // QR 3
                            // QR 4
                            //
                            // = ONE attendance day
                            //
                            // -------------------------------------------------

                            const sessionsSql = `
                                SELECT DISTINCT
                                    DATE_FORMAT(
                                        session_date,
                                        '%Y-%m-%d'
                                    ) AS session_date

                                FROM qr_sessions

                                WHERE DATE(session_date)
                                    BETWEEN ?
                                    AND ?

                                ORDER BY session_date ASC
                            `;


                            db.query(
                                sessionsSql,
                                [
                                    from_date,
                                    to_date
                                ],
                                (
                                    sessionsErr,
                                    sessionResults
                                ) => {

                                    if (sessionsErr) {

                                        console.error(
                                            'Report sessions error:',
                                            sessionsErr
                                        );

                                        return res.status(500).json({
                                            success: false,
                                            message:
                                                'Failed to fetch attendance sessions'
                                        });

                                    }


                                    // -------------------------------------------------
                                    // UNIQUE ATTENDANCE DAYS
                                    // -------------------------------------------------

                                    const attendanceDays =
                                        sessionResults.map(
                                            session =>
                                                String(
                                                    session.session_date
                                                ).slice(0, 10)
                                        );


                                    // -------------------------------------------------
                                    // BUILD STUDENT REPORTS
                                    // -------------------------------------------------

                                    const studentReports =
                                        studentResults.map(
                                            student => {

                                                const studentStart =
                                                    new Date(
                                                        student.start_date
                                                    )
                                                    .toISOString()
                                                    .slice(0, 10);


                                                const studentEnd =
                                                    new Date(
                                                        student.end_date
                                                    )
                                                    .toISOString()
                                                    .slice(0, 10);


                                                // -------------------------------------------------
                                                // EXPECTED ATTENDANCE DAYS
                                                // -------------------------------------------------
                                                //
                                                // Only dates inside the student's
                                                // SIWES period are counted.
                                                //
                                                // Multiple QR sessions on the same
                                                // date still count as ONE day.
                                                // -------------------------------------------------

                                                const studentAttendanceDays =
                                                    attendanceDays.filter(
                                                        date =>
                                                            date >=
                                                                studentStart &&
                                                            date <=
                                                                studentEnd
                                                    );


                                                // -------------------------------------------------
                                                // STUDENT ATTENDANCE RECORDS
                                                // -------------------------------------------------

                                                const studentAttendance =
                                                    attendanceResults.filter(
                                                        record =>
                                                            Number(
                                                                record.student_id
                                                            ) ===
                                                            Number(
                                                                student.id
                                                            )
                                                    );


                                                // -------------------------------------------------
                                                // UNIQUE PRESENT / LATE DAYS
                                                // -------------------------------------------------

                                                const attendedDateMap =
                                                    new Map();


                                                studentAttendance.forEach(
                                                    record => {

                                                        const attendanceDate =
                                                            new Date(
                                                                record.attendance_date
                                                            )
                                                            .toISOString()
                                                            .slice(0, 10);


                                                        // Only attendance within
                                                        // student's SIWES period

                                                        if (
                                                            attendanceDate <
                                                                studentStart ||
                                                            attendanceDate >
                                                                studentEnd
                                                        ) {
                                                            return;
                                                        }


                                                        /*
                                                         * If a student has multiple
                                                         * attendance records on the
                                                         * same day, keep only ONE day.
                                                         *
                                                         * If any record is late,
                                                         * we remember that the day
                                                         * was late.
                                                         */

                                                        if (
                                                            !attendedDateMap.has(
                                                                attendanceDate
                                                            )
                                                        ) {

                                                            attendedDateMap.set(
                                                                attendanceDate,
                                                                record.status
                                                            );

                                                        } else if (
                                                            record.status === 'late'
                                                        ) {

                                                            attendedDateMap.set(
                                                                attendanceDate,
                                                                'late'
                                                            );

                                                        }

                                                    }
                                                );


                                                // -------------------------------------------------
                                                // PRESENT DAYS
                                                // -------------------------------------------------

                                                const present =
                                                    Array.from(
                                                        attendedDateMap.values()
                                                    )
                                                    .filter(
                                                        status =>
                                                            status ===
                                                            'present'
                                                    )
                                                    .length;


                                                // -------------------------------------------------
                                                // LATE DAYS
                                                // -------------------------------------------------

                                                const late =
                                                    Array.from(
                                                        attendedDateMap.values()
                                                    )
                                                    .filter(
                                                        status =>
                                                            status ===
                                                            'late'
                                                    )
                                                    .length;


                                                // -------------------------------------------------
                                                // TOTAL ATTENDED DAYS
                                                // -------------------------------------------------

                                                const totalAttended =
                                                    attendedDateMap.size;


                                                // -------------------------------------------------
                                                // ABSENT DAYS
                                                // -------------------------------------------------

                                                const totalSessions =
                                                    studentAttendanceDays.length;


                                                const absent =
                                                    Math.max(
                                                        totalSessions -
                                                        totalAttended,
                                                        0
                                                    );


                                                // -------------------------------------------------
                                                // ATTENDANCE PERCENTAGE
                                                // -------------------------------------------------

                                                const attendancePercentage =
                                                    totalSessions > 0
                                                        ? Number(
                                                            (
                                                                (
                                                                    totalAttended /
                                                                    totalSessions
                                                                ) * 100
                                                            ).toFixed(2)
                                                        )
                                                        : 0;


                                                return {

                                                    id:
                                                        student.id,

                                                    student_id:
                                                        student.student_id,

                                                    full_name:
                                                        student.full_name,

                                                    registration_number:
                                                        student.registration_number,

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

                                                    total_sessions:
                                                        totalSessions,

                                                    present:
                                                        present,

                                                    late:
                                                        late,

                                                    absent:
                                                        absent,

                                                    attendance_percentage:
                                                        attendancePercentage

                                                };

                                            }
                                        );


                                    // -------------------------------------------------
                                    // OVERALL SUMMARY
                                    // -------------------------------------------------

                                    const totalStudents =
                                        studentReports.length;


                                    /*
                                     * IMPORTANT:
                                     *
                                     * total_sessions here means the
                                     * TOTAL EXPECTED ATTENDANCE DAYS
                                     * across all students.
                                     *
                                     * Example:
                                     *
                                     * Aisha  = 3 days
                                     * Salman = 3 days
                                     *
                                     * Total = 6 expected attendance days
                                     */

                                    const totalSessions =
                                        studentReports.reduce(
                                            (
                                                total,
                                                student
                                            ) =>
                                                total +
                                                student.total_sessions,
                                            0
                                        );


                                    const present =
                                        studentReports.reduce(
                                            (
                                                total,
                                                student
                                            ) =>
                                                total +
                                                student.present,
                                            0
                                        );


                                    const late =
                                        studentReports.reduce(
                                            (
                                                total,
                                                student
                                            ) =>
                                                total +
                                                student.late,
                                            0
                                        );


                                    const absent =
                                        studentReports.reduce(
                                            (
                                                total,
                                                student
                                            ) =>
                                                total +
                                                student.absent,
                                            0
                                        );


                                    const totalAttended =
                                        present +
                                        late;


                                    const attendancePercentage =
                                        totalSessions > 0
                                            ? Number(
                                                (
                                                    (
                                                        totalAttended /
                                                        totalSessions
                                                    ) * 100
                                                ).toFixed(2)
                                            )
                                            : 0;


                                    // -------------------------------------------------
                                    // SEND RESPONSE
                                    // -------------------------------------------------

                                    res.json({

                                        success: true,

                                        report: {

                                            generated_at:
                                                new Date(),

                                            school:
                                                school,

                                            filters: {

                                                department:
                                                    department ||
                                                    null,

                                                student_id:
                                                    student_id ||
                                                    null,

                                                from_date:
                                                    from_date,

                                                to_date:
                                                    to_date

                                            },

                                            summary: {

                                                total_students:
                                                    totalStudents,

                                                total_sessions:
                                                    totalSessions,

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
                                                studentReports,

                                            attendance:
                                                attendanceResults

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

};


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    getDepartmentsBySchool,
    getAttendanceReport
};