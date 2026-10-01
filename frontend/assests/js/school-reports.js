
const token =
    localStorage.getItem("daura_admin_token");


if (!token) {

    window.location.href = "login.html";

}

const schoolSelect =
    document.getElementById('schoolSelect');

const viewReportBtn =
    document.getElementById('viewReportBtn');

const refreshBtn =
    document.getElementById('refreshBtn');

const resetBtn =
    document.getElementById('resetBtn');

const reportSection =
    document.getElementById('reportSection');

const messageBox =
    document.getElementById('messageBox');

const studentsTableBody =
    document.getElementById('studentsTableBody');


// ========================================
// LOAD SCHOOLS
// ========================================

async function loadSchools() {

    try {
const response = await fetch(
    '/api/schools',
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message ||
                'Failed to load schools'
            );
        }

        const schools = result.data || [];

        schoolSelect.innerHTML = `
            <option value="">
                -- Select School --
            </option>
        `;

        schools.forEach(school => {

            const option =
                document.createElement('option');

            option.value = school.id;

            option.textContent = school.name;

            schoolSelect.appendChild(option);

        });

    } catch (error) {

        console.error(error);

        showMessage(
            error.message ||
            'Failed to load schools',
            'error'
        );

    }
}


// ========================================
// LOAD SCHOOL REPORT
// ========================================

async function loadSchoolReport() {

    const schoolId =
        schoolSelect.value;

    if (!schoolId) {

        showMessage(
            'Please select a school first',
            'error'
        );

        return;
    }

    try {

        viewReportBtn.disabled = true;

        viewReportBtn.textContent =
            'Loading...';

        const response = await fetch(
           `/api/attendance/school/${encodeURIComponent(schoolId)}`,
            {
                headers: {
                    'Authorization':
                        `Bearer ${token}`
                }
            }
        );

        const result =
            await response.json();

        console.log(
            'School Report Response:',
            result
        );

        if (!response.ok) {

            throw new Error(
                result.message ||
                'Failed to load school report'
            );

        }

        renderReport(result);

        reportSection.classList.remove(
            'hidden'
        );

        showMessage(
            'School report loaded successfully',
            'success'
        );

    } catch (error) {

        console.error(error);

        showMessage(
            error.message ||
            'Failed to load school report',
            'error'
        );

    } finally {

        viewReportBtn.disabled = false;

        viewReportBtn.textContent =
            'View Report';

    }
}


// ========================================
// RENDER SCHOOL REPORT
// ========================================

function renderReport(result) {

    const school =
        result.school || {};

    const summary =
        result.summary || {};

    const attendance =
        result.attendance || [];


    // SCHOOL INFORMATION

    document.getElementById(
        'schoolName'
    ).textContent =
        school.name || '—';


    document.getElementById(
        'schoolAddress'
    ).textContent =
        school.address || '—';


    document.getElementById(
        'schoolContact'
    ).textContent =
        school.contact || '—';


    document.getElementById(
        'schoolEmail'
    ).textContent =
        school.email || '—';


    // SUMMARY

    document.getElementById(
        'totalStudents'
    ).textContent =
        [...new Set(
            attendance.map(
                record => record.student_id
            )
        )].length;


    document.getElementById(
        'totalSessions'
    ).textContent =
        summary.total_attendance_records ?? 0;


    document.getElementById(
        'presentCount'
    ).textContent =
        summary.present ?? 0;


    document.getElementById(
        'lateCount'
    ).textContent =
        summary.late ?? 0;


    const totalRecords =
        Number(
            summary.total_attendance_records
        ) || 0;

    const present =
        Number(
            summary.present
        ) || 0;

    const late =
        Number(
            summary.late
        ) || 0;


    const attended =
        present + late;


    const absent =
        Math.max(
            totalRecords - attended,
            0
        );


    document.getElementById(
        'absentCount'
    ).textContent =
        absent;


    const percentage =
        totalRecords > 0
            ? (
                (attended / totalRecords) *
                100
            ).toFixed(2)
            : 0;


    document.getElementById(
        'attendancePercentage'
    ).textContent =
        `${percentage}%`;


    // TABLE

    renderAttendanceTable(
        attendance
    );
}


// ========================================
// RENDER ATTENDANCE TABLE
// ========================================

function renderAttendanceTable(
    attendance
) {

    studentsTableBody.innerHTML = '';


    if (
        !attendance ||
        attendance.length === 0
    ) {

        studentsTableBody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="empty"
                >
                    No attendance records found
                </td>
            </tr>
        `;

        return;
    }


    /*
        Group attendance records
        by student.
    */

    const studentMap =
        new Map();


    attendance.forEach(record => {

        const studentId =
            record.student_id;


        if (!studentMap.has(studentId)) {

            studentMap.set(
                studentId,
                {
                    student_id:
                        record.student_id,

                    full_name:
                        record.full_name,

                    registration_number:
                        record.registration_number,

                    present: 0,

                    late: 0,

                    absent: 0,

                    attendance_count: 0
                }
            );

        }


        const student =
            studentMap.get(
                studentId
            );


        if (
            record.status === 'present'
        ) {

            student.present++;

        }


        if (
            record.status === 'late'
        ) {

            student.late++;

        }


        student.attendance_count++;

    });


    /*
        Convert Map to array
    */

    const students =
        Array.from(
            studentMap.values()
        );


    students.forEach(
        (student, index) => {

            const totalAttendance =
                student.attendance_count;


            const attended =
                student.present +
                student.late;


            /*
                Since the current API
                gives attendance records,
                we use total attendance
                records as the basis here.
            */

            const percentage =
                totalAttendance > 0
                    ? (
                        (
                            attended /
                            totalAttendance
                        ) * 100
                    ).toFixed(2)
                    : 0;


            const row =
                document.createElement('tr');


            row.innerHTML = `
                <td>
                    ${index + 1}
                </td>

                <td>
                    ${student.student_id || '—'}
                </td>

                <td>
                    ${student.full_name || '—'}
                </td>

                <td>
                    ${student.registration_number || '—'}
                </td>

                <td>
                    —
                </td>

                <td>
                    ${student.present}
                </td>

                <td>
                    ${student.late}
                </td>

                <td>
                    ${student.absent}
                </td>

                <td>
                    ${percentage}%
                </td>

                <td>
                    <span class="status active">
                        Active
                    </span>
                </td>
            `;


            studentsTableBody.appendChild(
                row
            );

        }
    );

}


// ========================================
// RESET REPORT
// ========================================

function resetReport() {

    schoolSelect.value = '';

    reportSection.classList.add(
        'hidden'
    );

    messageBox.classList.add(
        'hidden'
    );


    studentsTableBody.innerHTML = `
        <tr>
            <td
                colspan="10"
                class="empty"
            >
                No report loaded
            </td>
        </tr>
    `;

}


// ========================================
// REFRESH REPORT
// ========================================

async function refreshReport() {

    if (!schoolSelect.value) {

        await loadSchools();

        showMessage(
            'Please select a school first',
            'error'
        );

        return;
    }

    await loadSchoolReport();

}


// ========================================
// MESSAGE
// ========================================

function showMessage(
    message,
    type = ''
) {

    messageBox.textContent =
        message;

    messageBox.className =
        `message-box ${type}`;

    messageBox.classList.remove(
        'hidden'
    );


    setTimeout(() => {

        messageBox.classList.add(
            'hidden'
        );

    }, 4000);

}


// ========================================
// LOGOUT
// ========================================

document
    .getElementById('logoutBtn')
    .addEventListener(
        'click',
        () => {

            localStorage.removeItem(
                'token'
            );

            localStorage.removeItem(
                'role'
            );

            localStorage.removeItem(
                'user'
            );

            window.location.href =
                'login.html';

        }
    );


// ========================================
// EVENTS
// ========================================

viewReportBtn.addEventListener(
    'click',
    loadSchoolReport
);

refreshBtn.addEventListener(
    'click',
    refreshReport
);

resetBtn.addEventListener(
    'click',
    resetReport
);


// ========================================
// INITIAL LOAD
// ========================================

loadSchools();