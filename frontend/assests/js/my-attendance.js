document.addEventListener('DOMContentLoaded', async () => {

    // ==========================================
    // AUTHENTICATION
    // ==========================================

    if (!requireLogin() || !requireRole('student')) {
        return;
    }

    const user = getUser();


    // ==========================================
    // ELEMENTS
    // ==========================================

    const studentName =
        document.getElementById('studentName');

    const studentAvatar =
        document.getElementById('studentAvatar');

    const refreshBtn =
        document.getElementById('refreshBtn');

    const logoutBtn =
        document.getElementById('logoutBtn');

    const attendanceMessage =
        document.getElementById('attendanceMessage');

    const loadingState =
        document.getElementById('loadingState');

    const emptyState =
        document.getElementById('emptyState');

    const tableWrapper =
        document.getElementById('tableWrapper');

    const attendanceTableBody =
        document.getElementById('attendanceTableBody');

    const totalRecords =
        document.getElementById('totalRecords');

    const presentCount =
        document.getElementById('presentCount');

    const lateCount =
        document.getElementById('lateCount');

    const attendancePercentage =
        document.getElementById('attendancePercentage');

    const recordCountLabel =
        document.getElementById('recordCountLabel');


    // ==========================================
    // STUDENT INFORMATION
    // ==========================================

    if (user) {

        if (studentName) {
            studentName.textContent =
                user.full_name ||
                user.student_id ||
                'Student';
        }

        if (studentAvatar) {

            const name =
                user.full_name ||
                user.student_id ||
                'S';

            studentAvatar.textContent =
                name.charAt(0).toUpperCase();
        }
    }


    // ==========================================
    // MESSAGE
    // ==========================================

    function showMessage(message) {

        if (!attendanceMessage) {
            return;
        }

        attendanceMessage.textContent = message;
        attendanceMessage.hidden = false;
    }


    function hideMessage() {

        if (!attendanceMessage) {
            return;
        }

        attendanceMessage.textContent = '';
        attendanceMessage.hidden = true;
    }


    // ==========================================
    // LOADING
    // ==========================================

    function showLoading() {

        if (loadingState) {
            loadingState.hidden = false;
        }

        if (emptyState) {
            emptyState.hidden = true;
        }

        if (tableWrapper) {
            tableWrapper.hidden = true;
        }
    }


    function hideLoading() {

        if (loadingState) {
            loadingState.hidden = true;
        }
    }


    // ==========================================
    // DATE FORMAT
    // ==========================================

    function formatDate(dateValue) {

        if (!dateValue) {
            return '-';
        }

        const dateString =
            String(dateValue).substring(0, 10);

        const parts =
            dateString.split('-');

        if (parts.length !== 3) {
            return dateString;
        }

        const year = parts[0];
        const month = parts[1];
        const day = parts[2];

        return `${day}/${month}/${year}`;
    }


    // ==========================================
    // TIME FORMAT
    // ==========================================

    function formatTime(timeValue) {

        if (!timeValue) {
            return '-';
        }

        const timeString =
            String(timeValue).substring(0, 8);

        const parts =
            timeString.split(':');

        if (parts.length < 2) {
            return timeString;
        }

        let hour =
            Number(parts[0]);

        const minute =
            parts[1];

        const period =
            hour >= 12 ? 'PM' : 'AM';

        hour =
            hour % 12 || 12;

        return `${hour}:${minute} ${period}`;
    }


    // ==========================================
    // STATUS
    // ==========================================

    function getStatusClass(status) {

        if (!status) {
            return '';
        }

        return String(status)
            .toLowerCase();
    }


    function getStatusText(status) {

        if (!status) {
            return '-';
        }

        const text =
            String(status).toLowerCase();

        return text.charAt(0).toUpperCase() +
            text.slice(1);
    }


    // ==========================================
    // LOAD ATTENDANCE
    // ==========================================

    async function loadAttendance() {

        showLoading();
        hideMessage();

        try {

            console.log(
                'Loading student attendance...'
            );

            const response =
                await apiRequest(
                    '/attendance/my-attendance'
                );

            console.log(
                'Attendance API response:',
                response
            );


            // ==================================
            // GET ATTENDANCE DATA
            // ==================================

            const attendance =
                Array.isArray(response.data)
                    ? response.data
                    : [];


            // ==================================
            // SUMMARY
            // ==================================

            const total =
                attendance.length;

            const present =
                attendance.filter(
                    record =>
                        record.status === 'present'
                ).length;

            const late =
                attendance.filter(
                    record =>
                        record.status === 'late'
                ).length;

            const attended =
                present + late;

            const percentage =
                total > 0
                    ? ((attended / total) * 100).toFixed(2)
                    : '0.00';


            // ==================================
            // UPDATE SUMMARY CARDS
            // ==================================

            if (totalRecords) {
                totalRecords.textContent =
                    total;
            }

            if (presentCount) {
                presentCount.textContent =
                    present;
            }

            if (lateCount) {
                lateCount.textContent =
                    late;
            }

            if (attendancePercentage) {
                attendancePercentage.textContent =
                    `${percentage}%`;
            }


            // ==================================
            // UPDATE RECORD COUNT LABEL
            // ==================================

            if (recordCountLabel) {

                recordCountLabel.textContent =
                    `${total} ${
                        total === 1
                            ? 'record'
                            : 'records'
                    }`;
            }


            // ==================================
            // NO RECORDS
            // ==================================

            if (total === 0) {

                hideLoading();

                if (emptyState) {
                    emptyState.hidden = false;
                }

                if (tableWrapper) {
                    tableWrapper.hidden = true;
                }

                return;
            }


            // ==================================
            // CLEAR OLD TABLE
            // ==================================

            if (attendanceTableBody) {

                attendanceTableBody.innerHTML = '';


                // ==================================
                // CREATE TABLE ROWS
                // ==================================

                attendance.forEach(
                    (record, index) => {

                        const row =
                            document.createElement('tr');

                        const statusClass =
                            getStatusClass(
                                record.status
                            );

                        row.innerHTML = `
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
                                ${record.session_type || '-'}
                            </td>

                            <td>
                                <span
                                    class="status-badge ${statusClass}"
                                >
                                    ${getStatusText(
                                        record.status
                                    )}
                                </span>
                            </td>
                        `;

                        attendanceTableBody.appendChild(row);
                    }
                );
            }


            // ==================================
            // SHOW TABLE
            // ==================================

            hideLoading();

            if (emptyState) {
                emptyState.hidden = true;
            }

            if (tableWrapper) {
                tableWrapper.hidden = false;
            }


        } catch (error) {

            console.error(
                'Failed to load attendance:',
                error
            );

            hideLoading();

            if (emptyState) {
                emptyState.hidden = true;
            }

            if (tableWrapper) {
                tableWrapper.hidden = true;
            }

            showMessage(
                error.message ||
                'Failed to load attendance records.'
            );
        }
    }


    // ==========================================
    // REFRESH BUTTON
    // ==========================================

    if (refreshBtn) {

        refreshBtn.addEventListener(
            'click',
            loadAttendance
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

    await loadAttendance();

});