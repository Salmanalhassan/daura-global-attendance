document.addEventListener(
    'DOMContentLoaded',
    async () => {

        // ==========================================
        // AUTH
        // ==========================================

        if (
            !requireLogin() ||
            !requireRole('student')
        ) {
            return;
        }


        const user = getUser();


        // ==========================================
        // ELEMENTS
        // ==========================================

        const studentName =
            document.getElementById(
                'studentName'
            );

        const studentAvatar =
            document.getElementById(
                'studentAvatar'
            );

        const refreshBtn =
            document.getElementById(
                'refreshBtn'
            );

        const logoutBtn =
            document.getElementById(
                'logoutBtn'
            );

        const summaryMessage =
            document.getElementById(
                'summaryMessage'
            );

        const loadingState =
            document.getElementById(
                'loadingState'
            );

        const summaryContent =
            document.getElementById(
                'summaryContent'
            );

        const attendancePercentage =
            document.getElementById(
                'attendancePercentage'
            );

        const attendanceStatus =
            document.getElementById(
                'attendanceStatus'
            );

        const totalSessions =
            document.getElementById(
                'totalSessions'
            );

        const totalAttendance =
            document.getElementById(
                'totalAttendance'
            );

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

        const progressPercentage =
            document.getElementById(
                'progressPercentage'
            );

        const progressBar =
            document.getElementById(
                'progressBar'
            );


        // ==========================================
        // STUDENT INFO FROM LOCAL STORAGE
        // ==========================================

        if (user) {

            const name =
                user.full_name ||
                user.student_id ||
                'Student';


            if (studentName) {

                studentName.textContent =
                    name;

            }


            if (studentAvatar) {

                studentAvatar.textContent =
                    name
                        .charAt(0)
                        .toUpperCase();

            }

        }


        // ==========================================
        // MESSAGE
        // ==========================================

        function showMessage(message) {

            if (!summaryMessage) {
                return;
            }

            summaryMessage.textContent =
                message;

            summaryMessage.hidden =
                false;
        }


        function hideMessage() {

            if (!summaryMessage) {
                return;
            }

            summaryMessage.textContent =
                '';

            summaryMessage.hidden =
                true;
        }


        // ==========================================
        // DATE FORMAT
        // ==========================================

        function formatDate(value) {

            if (!value) {
                return '-';
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


        // ==========================================
        // STATUS
        // ==========================================

        function formatStatus(status) {

            if (!status) {
                return '-';
            }


            const text =
                String(status);


            return (
                text.charAt(0).toUpperCase() +
                text.slice(1)
            );

        }


        // ==========================================
        // LOAD SUMMARY
        // ==========================================

        async function loadSummary() {

            hideMessage();


            if (loadingState) {

                loadingState.hidden =
                    false;

            }


            if (summaryContent) {

                summaryContent.hidden =
                    true;

            }


            try {

                console.log(
                    'Loading attendance summary...'
                );


                const response =
                    await apiRequest(
                        '/attendance/my-summary'
                    );


                console.log(
                    'Attendance summary response:',
                    response
                );


                if (
                    !response ||
                    !response.success
                ) {

                    throw new Error(
                        response?.message ||
                        'Failed to load attendance summary'
                    );

                }


                // ==================================
                // STUDENT
                // ==================================

                const student =
                    response.student || {};


                // ==================================
                // SUMMARY
                // ==================================

                const summary =
                    response.summary || {};


                // ==================================
                // VALUES
                // ==================================

                const sessions =
                    Number(
                        summary.total_sessions
                    ) || 0;


                const records =
                    Number(
                        summary.total_attendance
                    ) || 0;


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


                // ==================================
                // SUMMARY CARDS
                // ==================================

                if (totalSessions) {

                    totalSessions.textContent =
                        sessions;

                }


                if (totalAttendance) {

                    totalAttendance.textContent =
                        records;

                }


                if (presentCount) {

                    presentCount.textContent =
                        present;

                }


                if (lateCount) {

                    lateCount.textContent =
                        late;

                }


                if (absentCount) {

                    absentCount.textContent =
                        absent;

                }


                // ==================================
                // PERCENTAGE
                // ==================================

                if (attendancePercentage) {

                    attendancePercentage.textContent =
                        `${percentage.toFixed(2)}%`;

                }


                if (progressPercentage) {

                    progressPercentage.textContent =
                        `${percentage.toFixed(2)}%`;

                }


                if (progressBar) {

                    const safePercentage =
                        Math.min(
                            Math.max(
                                percentage,
                                0
                            ),
                            100
                        );


                    progressBar.style.width =
                        `${safePercentage}%`;

                }


                // ==================================
                // ATTENDANCE STATUS
                // ==================================

                if (attendanceStatus) {

                    attendanceStatus.textContent =
                        summary.attendance_status ||
                        'No Data';

                }


                // ==================================
                // STUDENT SIWES INFO
                // ==================================

                if (startDate) {

                    startDate.textContent =
                        formatDate(
                            student.start_date
                        );

                }


                if (endDate) {

                    endDate.textContent =
                        formatDate(
                            student.end_date
                        );

                }


                if (studentStatus) {

                    studentStatus.textContent =
                        formatStatus(
                            student.status
                        );

                }


                // ==================================
                // HIDE LOADING
                // ==================================

                if (loadingState) {

                    loadingState.hidden =
                        true;

                }


                if (summaryContent) {

                    summaryContent.hidden =
                        false;

                }


            } catch (error) {

                console.error(
                    'Attendance summary error:',
                    error
                );


                if (loadingState) {

                    loadingState.hidden =
                        true;

                }


                if (summaryContent) {

                    summaryContent.hidden =
                        true;

                }


                showMessage(
                    error.message ||
                    'Failed to load attendance summary.'
                );

            }

        }


        // ==========================================
        // REFRESH
        // ==========================================

        if (refreshBtn) {

            refreshBtn.addEventListener(
                'click',
                loadSummary
            );

        }


        // ==========================================
        // LOGOUT
        // ==========================================

        if (logoutBtn) {

            logoutBtn.addEventListener(
                'click',
                logout
            );

        }


        // ==========================================
        // INITIAL LOAD
        // ==========================================

        await loadSummary();

    }
);