const API_BASE_URL = '/api';


const user = JSON.parse(localStorage.getItem('user') || '{}');

// =====================================
// AUTH CHECK
// =====================================

const token =
    localStorage.getItem("daura_admin_token");


if (!token) {

    window.location.href = "login.html";

}
// =====================================
// ELEMENTS
// =====================================

const batchSelect = document.getElementById('batchSelect');
const viewReportBtn = document.getElementById('viewReportBtn');
const refreshBtn = document.getElementById('refreshBtn');
const resetBtn = document.getElementById('resetBtn');

const messageBox = document.getElementById('messageBox');
const reportSection = document.getElementById('reportSection');

const batchName = document.getElementById('batchName');
const batchDescription = document.getElementById('batchDescription');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const batchStatus = document.getElementById('batchStatus');

const totalStudents = document.getElementById('totalStudents');
const totalSessions = document.getElementById('totalSessions');
const totalAttendanceRecords =
    document.getElementById('totalAttendanceRecords');

const presentCount = document.getElementById('presentCount');
const lateCount = document.getElementById('lateCount');
const absentCount = document.getElementById('absentCount');
const attendancePercentage =
    document.getElementById('attendancePercentage');

const studentsTableBody =
    document.getElementById('studentsTableBody');

const attendanceTableBody =
    document.getElementById('attendanceTableBody');


// =====================================
// MESSAGE
// =====================================

function showMessage(message, type = 'success') {

    if (!messageBox) {
        return;
    }

    messageBox.textContent = message;

    messageBox.classList.remove(
        'hidden',
        'success',
        'error'
    );

    messageBox.classList.add(type);

    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 4000);
}


// =====================================
// LOAD BATCHES
// =====================================

async function loadBatches() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/batches`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || 'Failed to fetch batches'
            );
        }

        batchSelect.innerHTML = `
            <option value="">
                -- Select Batch --
            </option>
        `;

        (result.data || []).forEach(batch => {

            const option =
                document.createElement('option');

            option.value = batch.id;
            option.textContent = batch.name;

            batchSelect.appendChild(option);
        });

    } catch (error) {

        console.error(
            'Load batches error:',
            error
        );

        showMessage(
            error.message,
            'error'
        );
    }
}


// =====================================
// LOAD BATCH REPORT
// =====================================

async function loadBatchReport(batchId) {

    if (!batchId) {

        showMessage(
            'Please select a SIWES batch first.',
            'error'
        );

        return;
    }

    try {

        viewReportBtn.disabled = true;

        const response = await fetch(
            `${API_BASE_URL}/attendance/batch/${batchId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        console.log(
            'Batch Report Response:',
            result
        );

        if (!response.ok || !result.success) {
            throw new Error(
                result.message ||
                'Failed to fetch batch report'
            );
        }

        // SHOW REPORT
        reportSection.classList.remove('hidden');

        // BATCH INFORMATION
        renderBatchInfo(result.batch);

        // SUMMARY
        renderSummary(result.summary);

        // STUDENTS
        renderStudents(
            result.students || [],
            result.attendance || [],
            result.summary || {}
        );

        // ATTENDANCE RECORDS
        renderAttendance(
            result.attendance || []
        );

    } catch (error) {

        console.error(
            'Batch report error:',
            error
        );

        showMessage(
            error.message,
            'error'
        );

    } finally {

        viewReportBtn.disabled = false;
    }
}


// =====================================
// RENDER BATCH INFORMATION
// =====================================

function renderBatchInfo(batch) {

    if (!batch) {
        return;
    }

    batchName.textContent =
        batch.name || '—';

    batchDescription.textContent =
        batch.description || '—';

    startDate.textContent =
        formatDate(batch.start_date);

    endDate.textContent =
        formatDate(batch.end_date);

    batchStatus.textContent =
        batch.status || '—';
}


// =====================================
// RENDER SUMMARY
// =====================================

function renderSummary(summary) {

    totalStudents.textContent =
        summary.total_students ?? 0;

    totalSessions.textContent =
        summary.total_sessions ?? 0;

    totalAttendanceRecords.textContent =
        summary.total_attendance_records ?? 0;

    presentCount.textContent =
        summary.present ?? 0;

    lateCount.textContent =
        summary.late ?? 0;

    absentCount.textContent =
        summary.absent ?? 0;

    attendancePercentage.textContent =
        `${summary.attendance_percentage ?? 0}%`;
}


// =====================================
// RENDER STUDENTS
// =====================================

function renderStudents(
    students,
    attendance,
    summary
) {

    studentsTableBody.innerHTML = '';

    if (students.length === 0) {

        studentsTableBody.innerHTML = `
            <tr>
                <td colspan="11" class="empty">
                    No students found in this batch
                </td>
            </tr>
        `;

        return;
    }


    // Total sessions in batch
    const sessions =
        Number(summary.total_sessions) || 0;


    students.forEach(
        (student, index) => {

            // Get this student's attendance
            const studentAttendance =
                attendance.filter(
                    record =>
                        record.student_id ===
                        student.student_id
                );


            // Count present
            const present =
                studentAttendance.filter(
                    record =>
                        record.status === 'present'
                ).length;


            // Count late
            const late =
                studentAttendance.filter(
                    record =>
                        record.status === 'late'
                ).length;


            // Expected attendance
            const expected =
                sessions;


            // Absent
            const attended =
                present + late;

            const absent =
                Math.max(
                    expected - attended,
                    0
                );


            // Percentage
            const percentage =
                expected > 0
                    ? (
                        (
                            attended /
                            expected
                        ) * 100
                    ).toFixed(2)
                    : '0.00';


            const row =
                document.createElement('tr');


            row.innerHTML = `
                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHTML(
                        student.student_id
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        student.full_name
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        student.registration_number
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        student.school_name
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        student.department || '—'
                    )}
                </td>

                <td>
                    ${present}
                </td>

                <td>
                    ${late}
                </td>

                <td>
                    ${absent}
                </td>

                <td>
                    ${percentage}%
                </td>

                <td>
                    <span
                        class="status-badge ${getStatusClass(
                            student.status
                        )}"
                    >
                        ${escapeHTML(
                            student.status
                        )}
                    </span>
                </td>
            `;

            studentsTableBody.appendChild(row);
        }
    );
}


// =====================================
// RENDER ATTENDANCE
// =====================================

function renderAttendance(attendance) {

    attendanceTableBody.innerHTML = '';

    if (attendance.length === 0) {

        attendanceTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    No attendance records found
                    for this batch
                </td>
            </tr>
        `;

        return;
    }


    attendance.forEach(
        (record, index) => {

            const row =
                document.createElement('tr');


            row.innerHTML = `
                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHTML(
                        record.student_id
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        record.full_name
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        record.school_name
                    )}
                </td>

                <td>
                    ${formatDate(
                        record.attendance_date
                    )}
                </td>

                <td>
                    ${record.attendance_time || '—'}
                </td>

                <td>
                    ${escapeHTML(
                        record.session_type || '—'
                    )}
                </td>

                <td>
                    <span
                        class="status-badge ${getStatusClass(
                            record.status
                        )}"
                    >
                        ${escapeHTML(
                            record.status
                        )}
                    </span>
                </td>
            `;

            attendanceTableBody.appendChild(row);
        }
    );
}


// =====================================
// RESET REPORT
// =====================================

function resetReport() {

    batchSelect.value = '';

    reportSection.classList.add(
        'hidden'
    );

    batchName.textContent = '—';
    batchDescription.textContent = '—';
    startDate.textContent = '—';
    endDate.textContent = '—';
    batchStatus.textContent = '—';

    totalStudents.textContent = '0';
    totalSessions.textContent = '0';
    totalAttendanceRecords.textContent = '0';

    presentCount.textContent = '0';
    lateCount.textContent = '0';
    absentCount.textContent = '0';

    attendancePercentage.textContent =
        '0%';


    studentsTableBody.innerHTML = `
        <tr>
            <td
                colspan="11"
                class="empty"
            >
                No report loaded
            </td>
        </tr>
    `;


    attendanceTableBody.innerHTML = `
        <tr>
            <td
                colspan="8"
                class="empty"
            >
                No attendance records
            </td>
        </tr>
    `;
}


// =====================================
// FORMAT DATE
// =====================================

function formatDate(dateString) {

    if (!dateString) {
        return '—';
    }

    const date =
        new Date(dateString);

    if (isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }
    );
}


// =====================================
// STATUS CLASS
// =====================================

function getStatusClass(status) {

    if (!status) {
        return '';
    }

    return status
        .toLowerCase()
        .replace(/\s+/g, '-');
}


// =====================================
// ESCAPE HTML
// =====================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// =====================================
// EVENTS
// =====================================

// View Report
viewReportBtn.addEventListener(
    'click',
    () => {

        const batchId =
            batchSelect.value;

        loadBatchReport(batchId);
    }
);


// Select batch
batchSelect.addEventListener(
    'change',
    () => {

        const batchId =
            batchSelect.value;

        if (batchId) {
            loadBatchReport(batchId);
        }
    }
);


// Refresh
refreshBtn.addEventListener(
    'click',
    () => {

        const batchId =
            batchSelect.value;

        if (batchId) {

            loadBatchReport(
                batchId
            );

        } else {

            loadBatches();

        }
    }
);


// Reset
resetBtn.addEventListener(
    'click',
    () => {

        resetReport();
    }
);


// =====================================
// INITIAL LOAD
// =====================================

loadBatches();