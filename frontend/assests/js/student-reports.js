
const token =
    localStorage.getItem("daura_admin_token");


if (!token) {

    window.location.href = "login.html";

}

// ===============================
// ELEMENTS
// ===============================

const studentSelect = document.getElementById('studentSelect');
const viewReportBtn = document.getElementById('viewReportBtn');
const resetBtn = document.getElementById('resetBtn');
const refreshBtn = document.getElementById('refreshBtn');

const reportSection = document.getElementById('reportSection');
const messageBox = document.getElementById('messageBox');
const attendanceTableBody =
    document.getElementById('attendanceTableBody');


// ===============================
// LOAD STUDENTS
// ===============================

async function loadStudents() {

    try {
const response = await fetch(
    '/api/students',
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || 'Failed to load students'
            );
        }

        const students = result.data || [];

        studentSelect.innerHTML = `
            <option value="">
                -- Select Student --
            </option>
        `;

        students.forEach(student => {

            const option = document.createElement('option');

            option.value = student.student_id;

            option.textContent =
                `${student.full_name} (${student.student_id})`;

            studentSelect.appendChild(option);
        });

    } catch (error) {

        console.error(error);

        showMessage(
            error.message || 'Failed to load students',
            'error'
        );
    }
}


// ===============================
// LOAD STUDENT REPORT
// ===============================

async function loadStudentReport() {

    const studentId = studentSelect.value;

    if (!studentId) {

        showMessage(
            'Please select a student first',
            'error'
        );

        return;
    }

    try {

        viewReportBtn.disabled = true;
        viewReportBtn.textContent = 'Loading...';
const response = await fetch(
    `/api/attendance/student/${encodeURIComponent(studentId)}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        console.log('Student Report Response:', result);

        if (!response.ok) {
            throw new Error(
                result.message || 'Failed to load student report'
            );
        }

        // IMPORTANT:
        // Backend returns student, school, summary and attendance
        // directly inside result.

        renderReport(result);

        reportSection.classList.remove('hidden');

        showMessage(
            'Student report loaded successfully',
            'success'
        );

    } catch (error) {

        console.error(error);

        showMessage(
            error.message || 'Failed to load report',
            'error'
        );

    } finally {

        viewReportBtn.disabled = false;
        viewReportBtn.textContent = 'View Report';
    }
}


// ===============================
// RENDER REPORT
// ===============================

function renderReport(result) {

    const student = result.student || {};
    const school = result.school || {};
    const summary = result.summary || {};
    const attendance = result.attendance || [];


    // ===========================
    // STUDENT INFORMATION
    // ===========================

    document.getElementById('studentName').textContent =
        student.full_name || '—';

    document.getElementById('studentId').textContent =
        student.student_id || '—';

    document.getElementById('registrationNumber').textContent =
        student.registration_number || '—';

    document.getElementById('schoolName').textContent =
        school.name || '—';

    document.getElementById('department').textContent =
        student.department || '—';

    document.getElementById('course').textContent =
        student.course || '—';


    // ===========================
    // SUMMARY
    // ===========================

    document.getElementById('totalSessions').textContent =
        summary.total_sessions ?? 0;

    document.getElementById('presentCount').textContent =
        summary.present ?? 0;

    document.getElementById('lateCount').textContent =
        summary.late ?? 0;

    document.getElementById('absentCount').textContent =
        summary.absent ?? 0;

    document.getElementById('attendancePercentage').textContent =
        `${summary.attendance_percentage ?? 0}%`;


    // ===========================
    // ATTENDANCE TABLE
    // ===========================

    renderAttendanceTable(attendance);
}


// ===============================
// ATTENDANCE TABLE
// ===============================

function renderAttendanceTable(records) {

    attendanceTableBody.innerHTML = '';

    if (!records || records.length === 0) {

        attendanceTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    No attendance records found
                </td>
            </tr>
        `;

        return;
    }


    records.forEach((record, index) => {

        const row = document.createElement('tr');

        const date =
            formatDate(record.attendance_date);

        const session =
            capitalize(record.session_type || '—');

        const time =
            formatTime(record.attendance_time);

        const status =
            String(record.status || '—').toLowerCase();


        let statusClass = '';

        if (status === 'present') {
            statusClass = 'present';
        }

        if (status === 'late') {
            statusClass = 'late';
        }

        if (status === 'absent') {
            statusClass = 'absent';
        }


        row.innerHTML = `
            <td>${index + 1}</td>

            <td>${date}</td>

            <td>${session}</td>

            <td>${time}</td>

            <td>
                <span class="status ${statusClass}">
                    ${capitalize(status)}
                </span>
            </td>
        `;

        attendanceTableBody.appendChild(row);
    });
}


// ===============================
// RESET
// ===============================

function resetReport() {

    studentSelect.value = '';

    reportSection.classList.add('hidden');

    messageBox.classList.add('hidden');

    attendanceTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="empty">
                No attendance records
            </td>
        </tr>
    `;
}


// ===============================
// REFRESH
// ===============================

async function refreshReport() {

    if (!studentSelect.value) {

        showMessage(
            'Please select a student first',
            'error'
        );

        return;
    }

    await loadStudentReport();
}


// ===============================
// MESSAGE
// ===============================

function showMessage(message, type = '') {

    messageBox.textContent = message;

    messageBox.className =
        `message-box ${type}`;

    messageBox.classList.remove('hidden');

    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 4000);
}


// ===============================
// FORMAT DATE
// ===============================

function formatDate(date) {

    if (!date || date === '—') {
        return '—';
    }

    // Handle ISO date from MySQL
    const parsed = new Date(date);

    if (isNaN(parsed.getTime())) {
        return date;
    }

    return parsed.toLocaleDateString('en-GB');
}


// ===============================
// FORMAT TIME
// ===============================

function formatTime(time) {

    if (!time || time === '—') {
        return '—';
    }

    return String(time).substring(0, 8);
}


// ===============================
// CAPITALIZE
// ===============================

function capitalize(text) {

    if (!text || text === '—') {
        return '—';
    }

    return text.charAt(0).toUpperCase() +
        text.slice(1);
}


// ===============================
// LOGOUT
// ===============================

document
    .getElementById('logoutBtn')
    .addEventListener('click', () => {

        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');

        window.location.href = 'login.html';
    });


// ===============================
// EVENTS
// ===============================

viewReportBtn.addEventListener(
    'click',
    loadStudentReport
);

refreshBtn.addEventListener(
    'click',
    refreshReport
);

resetBtn.addEventListener(
    'click',
    resetReport
);


// ===============================
// INITIAL LOAD
// ===============================

loadStudents();