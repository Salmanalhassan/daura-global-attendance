document.addEventListener(
    'DOMContentLoaded',
    async () => {


        // =================================================
        // AUTHENTICATION
        // =================================================

        if (
            !requireLogin() ||
            !requireRole('student')
        ) {
            return;
        }


        // =================================================
        // USER
        // =================================================

        const user = getUser();


        // =================================================
        // ELEMENTS
        // =================================================

        const welcomeMessage =
            document.getElementById(
                'welcomeMessage'
            );

        const logoutBtn =
            document.getElementById(
                'logoutBtn'
            );

        const messageBox =
            document.getElementById(
                'messageBox'
            );


        // STATISTICS

        const presentCount =
            document.getElementById(
                'presentCount'
            );

        const lateCount =
            document.getElementById(
                'lateCount'
            );

        const absentCount =
            document.getElementById(
                'absentCount'
            );

        const attendancePercentage =
            document.getElementById(
                'attendancePercentage'
            );


        // STUDENT INFORMATION

        const studentId =
            document.getElementById(
                'studentId'
            );

        const registrationNumber =
            document.getElementById(
                'registrationNumber'
            );

        const schoolName =
            document.getElementById(
                'schoolName'
            );

        const department =
            document.getElementById(
                'department'
            );

        const course =
            document.getElementById(
                'course'
            );

        const batchName =
            document.getElementById(
                'batchName'
            );

        const startDate =
            document.getElementById(
                'startDate'
            );

        const endDate =
            document.getElementById(
                'endDate'
            );

        const studentStatus =
            document.getElementById(
                'studentStatus'
            );


        // ATTENDANCE TABLE

        const attendanceTableBody =
            document.getElementById(
                'attendanceTableBody'
            );



        // =================================================
        // WELCOME MESSAGE
        // =================================================

        if (user && welcomeMessage) {

            const name =
                user.full_name ||
                user.student_id ||
                'Student';

            welcomeMessage.textContent =
                `Welcome back, ${name}.`;

        }



        // =================================================
        // MESSAGE
        // =================================================

        function showMessage(message) {

            if (!messageBox) {
                return;
            }

            messageBox.textContent =
                message;

            messageBox.classList.remove(
                'hidden'
            );

        }


        function hideMessage() {

            if (!messageBox) {
                return;
            }

            messageBox.textContent =
                '';

            messageBox.classList.add(
                'hidden'
            );

        }



        // =================================================
        // DATE FORMAT
        // =================================================

        function formatDate(value) {

            if (!value) {
                return '—';
            }


            const dateString =
                String(value).substring(
                    0,
                    10
                );


            const parts =
                dateString.split('-');


            if (parts.length !== 3) {
                return dateString;
            }


            return `${parts[2]}/${parts[1]}/${parts[0]}`;

        }



        // =================================================
        // TIME FORMAT
        // =================================================

        function formatTime(value) {

            if (!value) {
                return '—';
            }


            const parts =
                String(value)
                    .substring(0, 8)
                    .split(':');


            if (parts.length < 2) {
                return value;
            }


            let hour =
                Number(parts[0]);

            const minute =
                parts[1];


            const ampm =
                hour >= 12
                    ? 'PM'
                    : 'AM';


            hour =
                hour % 12 || 12;


            return `${hour}:${minute} ${ampm}`;

        }



        // =================================================
        // STATUS FORMAT
        // =================================================

        function formatStatus(status) {

            if (!status) {
                return '—';
            }


            const text =
                String(status);


            return (
                text.charAt(0).toUpperCase() +
                text.slice(1)
            );

        }



        // =================================================
        // SET TEXT HELPER
        // =================================================

        function setText(
            element,
            value
        ) {

            if (!element) {
                return;
            }

            element.textContent =
                value ||
                '—';

        }



        // =================================================
        // LOAD STUDENT PROFILE
        // =================================================

        async function loadStudentProfile() {

            const response =
                await apiRequest(
                    '/students/my-profile'
                );


            if (
                !response.success
            ) {

                throw new Error(
                    response.message ||
                    'Failed to load student profile'
                );

            }


            const student =
                response.student ||
                response.data?.student ||
                response.data ||
                null;


            if (!student) {

                throw new Error(
                    'Student profile data not found'
                );

            }


            const school =
                response.school ||
                response.data?.school ||
                student.school ||
                null;


            const batch =
                response.siwes_batch ||
                response.data?.siwes_batch ||
                student.siwes_batch ||
                null;



            // =============================================
            // STUDENT INFORMATION
            // =============================================

            setText(
                studentId,
                student.student_id
            );


            setText(
                registrationNumber,
                student.registration_number
            );


            setText(
                schoolName,
                school?.name
            );


            setText(
                department,
                student.department
            );


            setText(
                course,
                student.course
            );


            setText(
                batchName,
                batch?.name
            );


            setText(
                startDate,
                formatDate(
                    student.start_date
                )
            );


            setText(
                endDate,
                formatDate(
                    student.end_date
                )
            );


            setText(
                studentStatus,
                formatStatus(
                    student.status
                )
            );



            // =============================================
            // WELCOME
            // =============================================

            if (welcomeMessage) {

                welcomeMessage.textContent =
                    `Welcome back, ${
                        student.full_name ||
                        student.student_id ||
                        'Student'
                    }.`;

            }

        }



        // =================================================
        // LOAD ATTENDANCE SUMMARY
        // =================================================

        async function loadAttendanceSummary() {

            const response =
                await apiRequest(
                    '/attendance/my-summary'
                );


            if (
                !response.success ||
                !response.summary
            ) {

                throw new Error(
                    response.message ||
                    'Failed to load attendance summary'
                );

            }


            const summary =
                response.summary;


            const present =
                Number(
                    summary.present
                ) || 0;


            const late =
                Number(
                    summary.late
                ) || 0;


            const absent =
                Number(
                    summary.absent
                ) || 0;


            const percentage =
                Number(
                    summary.attendance_percentage
                ) || 0;



            setText(
                presentCount,
                present
            );


            setText(
                lateCount,
                late
            );


            setText(
                absentCount,
                absent
            );


            if (attendancePercentage) {

                attendancePercentage.textContent =
                    `${percentage.toFixed(2)}%`;

            }

        }



        // =================================================
        // LOAD RECENT ATTENDANCE
        // =================================================

        async function loadRecentAttendance() {

            const response =
                await apiRequest(
                    '/attendance/my-attendance'
                );


            if (
                !response.success
            ) {

                throw new Error(
                    response.message ||
                    'Failed to load attendance records'
                );

            }


            const records =
                Array.isArray(response.data)
                    ? response.data
                    : [];


            if (!attendanceTableBody) {
                return;
            }


            // =============================================
            // EMPTY
            // =============================================

            if (records.length === 0) {

                attendanceTableBody.innerHTML = `
                    <tr>
                        <td
                            colspan="5"
                            class="empty"
                        >
                            No attendance records found.
                        </td>
                    </tr>
                `;

                return;

            }


            // =============================================
            // SHOW ONLY LATEST 5
            // =============================================

            const recentRecords =
                records.slice(0, 5);


            attendanceTableBody.innerHTML =
                recentRecords
                    .map(
                        (record, index) => {

                            const status =
                                String(
                                    record.status ||
                                    ''
                                ).toLowerCase();


                            return `
                                <tr>

                                    <td>
                                        ${index + 1}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            record.attendance_date
                                        )}
                                    </td>

                                    <td>
                                        ${formatTime(
                                            record.attendance_time
                                        )}
                                    </td>

                                    <td>
                                        ${formatStatus(
                                            record.session_type
                                        )}
                                    </td>

                                    <td>
                                        <span
                                            class="status-badge"
                                        >
                                            ${formatStatus(
                                                status
                                            )}
                                        </span>
                                    </td>

                                </tr>
                            `;

                        }
                    )
                    .join('');

        }



        // =================================================
        // LOAD DASHBOARD
        // =================================================

        async function loadDashboard() {

            hideMessage();


            if (attendanceTableBody) {

                attendanceTableBody.innerHTML = `
                    <tr>
                        <td
                            colspan="5"
                            class="empty"
                        >
                            Loading attendance...
                        </td>
                    </tr>
                `;

            }


            try {

                console.log(
                    'Loading student dashboard...'
                );


                /*
                 * We intentionally load the three
                 * already-tested student APIs.
                 *
                 * This keeps Dashboard synchronized
                 * with My Profile, Attendance Summary
                 * and My Attendance.
                 */

                const results =
                    await Promise.allSettled([
                        loadStudentProfile(),
                        loadAttendanceSummary(),
                        loadRecentAttendance()
                    ]);


                const profileResult =
                    results[0];

                const summaryResult =
                    results[1];

                const attendanceResult =
                    results[2];


                // =========================================
                // CHECK ERRORS
                // =========================================

                const errors = [];


                if (
                    profileResult.status ===
                    'rejected'
                ) {

                    console.error(
                        'Profile error:',
                        profileResult.reason
                    );

                    errors.push(
                        'Student information could not be loaded'
                    );

                }


                if (
                    summaryResult.status ===
                    'rejected'
                ) {

                    console.error(
                        'Summary error:',
                        summaryResult.reason
                    );

                    errors.push(
                        'Attendance summary could not be loaded'
                    );

                }


                if (
                    attendanceResult.status ===
                    'rejected'
                ) {

                    console.error(
                        'Attendance error:',
                        attendanceResult.reason
                    );

                    errors.push(
                        'Recent attendance could not be loaded'
                    );

                }


                if (errors.length > 0) {

                    showMessage(
                        errors.join(' | ')
                    );

                }


                console.log(
                    'Student dashboard loaded.'
                );


            } catch (error) {

                console.error(
                    'Dashboard error:',
                    error
                );


                showMessage(
                    error.message ||
                    'Failed to load dashboard.'
                );

            }

        }



        // =================================================
        // LOGOUT
        // =================================================

        if (logoutBtn) {

            logoutBtn.addEventListener(
                'click',
                () => {

                    logout();

                }
            );

        }



        // =================================================
        // INITIAL LOAD
        // =================================================

        await loadDashboard();

    }
);