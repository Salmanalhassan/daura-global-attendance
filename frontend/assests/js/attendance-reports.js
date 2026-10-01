const API_BASE = '/api';

let currentReport = null;
let currentStudents = [];


// ===============================
// DOM
// ===============================

const schoolFilter =
    document.getElementById('schoolFilter');

const departmentFilter =
    document.getElementById('departmentFilter');

const studentIdFilter =
    document.getElementById('studentIdFilter');

const fromDate =
    document.getElementById('fromDate');

const toDate =
    document.getElementById('toDate');

const generateBtn =
    document.getElementById('generateBtn');

const resetBtn =
    document.getElementById('resetBtn');

const printBtn =
    document.getElementById('printBtn');

const exportPdfBtn =
    document.getElementById('exportPdfBtn');

const exportExcelBtn =
    document.getElementById('exportExcelBtn');

const tableSearch =
    document.getElementById('tableSearch');

const messageBox =
    document.getElementById('messageBox');

const adminName =
    document.getElementById('adminName');

const reportArea =
    document.getElementById('reportArea');

const reportTableBody =
    document.getElementById('reportTableBody');

const schoolName =
    document.getElementById('schoolName');

const schoolAddress =
    document.getElementById('schoolAddress');

const schoolContact =
    document.getElementById('schoolContact');

const schoolEmail =
    document.getElementById('schoolEmail');

const reportDepartment =
    document.getElementById('reportDepartment');

const reportPeriod =
    document.getElementById('reportPeriod');

const generatedAt =
    document.getElementById('generatedAt');

const totalStudents =
    document.getElementById('totalStudents');

const totalSessions =
    document.getElementById('totalSessions');

const presentCount =
    document.getElementById('presentCount');

const lateCount =
    document.getElementById('lateCount');

const absentCount =
    document.getElementById('absentCount');

const attendancePercentage =
    document.getElementById('attendancePercentage');

const resultText =
    document.getElementById('resultText');

const loadingState =
    document.getElementById('loadingState');

const emptyState =
    document.getElementById('emptyState');

const tableWrapper =
    document.getElementById('tableWrapper');


// ===============================
// AUTH
// ===============================

const token =
    localStorage.getItem('daura_admin_token');

const role =
    localStorage.getItem('daura_role');

const adminUser =
    localStorage.getItem('daura_admin_user');


if (!token || role !== 'admin') {

    window.location.href =
        '../login.html';

}


// ===============================
// ADMIN NAME
// ===============================

if (adminName) {

    if (adminUser) {

        try {

            const user =
                JSON.parse(adminUser);

            adminName.textContent =
                user.full_name ||
                user.username ||
                'Admin';

        } catch (error) {

            adminName.textContent =
                'Admin';

        }

    } else {

        adminName.textContent =
            'Admin';

    }

}


// ===============================
// API REQUEST
// ===============================

async function apiRequest(
    url,
    options = {}
) {

    const response =
        await fetch(
            `${API_BASE}${url}`,
            {
                ...options,

                headers: {

                    'Content-Type':
                        'application/json',

                    'Authorization':
                        `Bearer ${token}`,

                    ...(options.headers || {})

                }

            }
        );


    let data;

    try {

        data =
            await response.json();

    } catch (error) {

        data = {

            success: false,

            message:
                'Invalid server response'

        };

    }


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        localStorage.removeItem(
            'daura_admin_token'
        );

        localStorage.removeItem(
            'daura_admin_user'
        );

        localStorage.removeItem(
            'daura_role'
        );

        window.location.href =
            '../login.html';

        return null;

    }


    if (!response.ok) {

        throw new Error(
            data.message ||
            'Request failed'
        );

    }


    return data;

}


// ===============================
// DEFAULT DATES
// ===============================

function setDefaultDates() {

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, '0');


    const day =
        String(
            today.getDate()
        ).padStart(2, '0');


    const todayString =
        `${year}-${month}-${day}`;


    if (fromDate) {

        fromDate.value =
            todayString;

    }


    if (toDate) {

        toDate.value =
            todayString;

    }

}


// ===============================
// LOAD SCHOOLS
// ===============================

async function loadSchools() {

    try {

        const result =
            await apiRequest(
                '/schools'
            );


        if (!result) {

            return;

        }


        const schools =
            Array.isArray(result.data)
                ? result.data
                : [];


        schoolFilter.innerHTML = `
            <option value="">
                Select School
            </option>
        `;


        schools
            .sort(
                (a, b) =>
                    String(a.name || '')
                        .localeCompare(
                            String(b.name || '')
                        )
            )
            .forEach(
                school => {

                    const option =
                        document.createElement(
                            'option'
                        );


                    option.value =
                        school.id;


                    option.textContent =
                        school.name;


                    schoolFilter.appendChild(
                        option
                    );

                }
            );


    } catch (error) {

        console.error(
            'Failed to load schools:',
            error
        );


        showMessage(
            error.message ||
            'Failed to load schools.',
            'error'
        );

    }

}


// ===============================
// LOAD DEPARTMENTS
// ===============================

async function loadDepartments() {

    const schoolId =
        schoolFilter.value;


    departmentFilter.innerHTML = `
        <option value="">
            All Departments
        </option>
    `;


    departmentFilter.disabled =
        true;


    if (!schoolId) {

        return;

    }


    try {

        const result =
            await apiRequest(
                `/reports/departments?school_id=${encodeURIComponent(
                    schoolId
                )}`
            );


        if (!result) {

            return;

        }


        const departments =
            Array.isArray(result.data)
                ? result.data
                : [];


        departments
            .sort(
                (a, b) =>
                    String(
                        a.department || ''
                    ).localeCompare(
                        String(
                            b.department || ''
                        )
                    )
            )
            .forEach(
                item => {

                    if (
                        !item.department
                    ) {

                        return;

                    }


                    const option =
                        document.createElement(
                            'option'
                        );


                    option.value =
                        item.department;


                    option.textContent =
                        item.department;


                    departmentFilter.appendChild(
                        option
                    );

                }
            );


        departmentFilter.disabled =
            false;


    } catch (error) {

        console.error(
            'Failed to load departments:',
            error
        );


        showMessage(
            error.message ||
            'Failed to load departments.',
            'error'
        );

    }

}


// ===============================
// GENERATE REPORT
// ===============================

async function generateReport() {

    const schoolId =
        schoolFilter.value;


    const department =
        departmentFilter.value;


    const studentId =
        studentIdFilter.value.trim();


    const startDate =
        fromDate.value;


    const endDate =
        toDate.value;


    if (!schoolId) {

        showMessage(
            'Please select a school.',
            'error'
        );

        return;

    }


    if (!startDate || !endDate) {

        showMessage(
            'Please select both start date and end date.',
            'error'
        );

        return;

    }


    if (startDate > endDate) {

        showMessage(
            'From date cannot be greater than To date.',
            'error'
        );

        return;

    }


    generateBtn.disabled =
        true;


    generateBtn.textContent =
        'Generating...';


    showLoading();


    try {

        const params =
            new URLSearchParams();


        params.append(
            'school_id',
            schoolId
        );


        params.append(
            'from_date',
            startDate
        );


        params.append(
            'to_date',
            endDate
        );


        if (department) {

            params.append(
                'department',
                department
            );

        }


        if (studentId) {

            params.append(
                'student_id',
                studentId
            );

        }


        const result =
            await apiRequest(
                `/reports/attendance?${params.toString()}`
            );


        if (!result) {

            return;

        }


        if (!result.report) {

            throw new Error(
                'Invalid report response.'
            );

        }


        currentReport =
            result.report;


        currentStudents =
            Array.isArray(
                currentReport.students
            )
                ? currentReport.students
                : [];


        displayReport();


        showMessage(
            'Attendance report generated successfully.',
            'success'
        );


    } catch (error) {

        console.error(
            'Generate report error:',
            error
        );


        currentReport =
            null;


        currentStudents =
            [];


        showEmpty();


        showMessage(
            error.message ||
            'Failed to generate attendance report.',
            'error'
        );


    } finally {

        generateBtn.disabled =
            false;


        generateBtn.textContent =
            '🔍 Generate Report';

    }

}


// ===============================
// DISPLAY REPORT
// ===============================

function displayReport() {

    if (!currentReport) {

        showEmpty();

        return;

    }


    const report =
        currentReport;


    const school =
        report.school || {};


    const filters =
        report.filters || {};


    const summary =
        report.summary || {};


    schoolName.textContent =
        school.name || '—';


    schoolAddress.textContent =
        school.address || '—';


    schoolContact.textContent =
        school.contact || '—';


    schoolEmail.textContent =
        school.email || '—';


    reportDepartment.textContent =
        filters.department ||
        'All Departments';


    reportPeriod.textContent =
        `${filters.from_date || '—'} to ${
            filters.to_date || '—'
        }`;


    generatedAt.textContent =
        formatDateTime(
            report.generated_at
        );


    totalStudents.textContent =
        Number(
            summary.total_students
        ) || 0;


    totalSessions.textContent =
        Number(
            summary.total_sessions
        ) || 0;


    presentCount.textContent =
        Number(
            summary.present
        ) || 0;


    lateCount.textContent =
        Number(
            summary.late
        ) || 0;


    absentCount.textContent =
        Number(
            summary.absent
        ) || 0;


    attendancePercentage.textContent =
        `${
            Number(
                summary.attendance_percentage
            ) || 0
        }%`;


    renderStudentTable(
        currentStudents
    );


    reportArea.hidden =
        false;


    loadingState.hidden =
        true;


    emptyState.hidden =
        true;


    tableWrapper.hidden =
        false;

}


// ===============================
// RENDER STUDENT TABLE
// ===============================

function renderStudentTable(
    students
) {

    if (!students.length) {

        reportTableBody.innerHTML = `
            <tr>
                <td
                    colspan="12"
                    class="empty"
                >
                    No students found for the selected filters.
                </td>
            </tr>
        `;

        resultText.textContent =
            'No students found';

        return;

    }


    resultText.textContent =
        `Showing ${students.length} ${
            students.length === 1
                ? 'student'
                : 'students'
        }`;


    reportTableBody.innerHTML =
        students
            .map(
                (student, index) => {

                    const percentage =
                        Number(
                            student.attendance_percentage
                        ) || 0;


                    const status =
                        percentage >= 80
                            ? 'Excellent'
                            : percentage >= 60
                                ? 'Good'
                                : percentage >= 40
                                    ? 'Average'
                                    : 'Needs Improvement';


                    return `
                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>
                                ${escapeHtml(
                                    student.student_id ||
                                    '—'
                                )}
                            </td>

                            <td>
                                <strong>
                                    ${escapeHtml(
                                        student.full_name ||
                                        '—'
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHtml(
                                    student.registration_number ||
                                    '—'
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    student.department ||
                                    '—'
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    student.course ||
                                    '—'
                                )}
                            </td>

                            <td>
                                ${Number(
                                    student.total_sessions
                                ) || 0}
                            </td>

                            <td>
                                ${Number(
                                    student.present
                                ) || 0}
                            </td>

                            <td>
                                ${Number(
                                    student.late
                                ) || 0}
                            </td>

                            <td>
                                ${Number(
                                    student.absent
                                ) || 0}
                            </td>

                            <td>
                                <strong>
                                    ${percentage}%
                                </strong>
                            </td>

                            <td>
                                ${getStatusBadge(
                                    status
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join('');

}


// ===============================
// SEARCH TABLE
// ===============================

function searchStudents() {

    if (!currentReport) {

        return;

    }


    const search =
        tableSearch.value
            .trim()
            .toLowerCase();


    const allStudents =
        Array.isArray(
            currentReport.students
        )
            ? currentReport.students
            : [];


    if (!search) {

        currentStudents =
            allStudents;


        renderStudentTable(
            currentStudents
        );

        return;

    }


    currentStudents =
        allStudents.filter(
            student => {

                const values = [

                    student.full_name,

                    student.student_id,

                    student.registration_number,

                    student.department,

                    student.course

                ];


                return values.some(
                    value =>
                        String(
                            value || ''
                        )
                        .toLowerCase()
                        .includes(search)
                );

            }
        );


    renderStudentTable(
        currentStudents
    );

}


// ===============================
// RESET
// ===============================

function resetFilters() {

    schoolFilter.value =
        '';


    departmentFilter.innerHTML = `
        <option value="">
            All Departments
        </option>
    `;


    departmentFilter.disabled =
        true;


    studentIdFilter.value =
        '';


    setDefaultDates();


    tableSearch.value =
        '';


    currentReport =
        null;


    currentStudents =
        [];


    showEmpty();

}


// ===============================
// PRINT
// ===============================

function printReport() {

    if (!currentReport) {

        showMessage(
            'Please generate a report first.',
            'error'
        );

        return;

    }


    window.print();

}


// ===============================
// EXPORT EXCEL
// ===============================

function exportExcel() {

    if (!currentReport) {

        showMessage(
            'Please generate a report first.',
            'error'
        );

        return;

    }


    if (
        typeof XLSX ===
        'undefined'
    ) {

        showMessage(
            'Excel export library is not loaded.',
            'error'
        );

        return;

    }


    const school =
        currentReport.school || {};


    const summary =
        currentReport.summary || {};


    const filters =
        currentReport.filters || {};


    const rows = [];


    rows.push([
        'Attendance Report'
    ]);


    rows.push([
        'School',
        school.name || ''
    ]);


    rows.push([
        'Address',
        school.address || ''
    ]);


    rows.push([
        'Contact',
        school.contact || ''
    ]);


    rows.push([
        'Email',
        school.email || ''
    ]);


    rows.push([
        'Department',
        filters.department ||
        'All Departments'
    ]);


    rows.push([
        'From Date',
        filters.from_date || ''
    ]);


    rows.push([
        'To Date',
        filters.to_date || ''
    ]);


    rows.push([]);


    rows.push([
        'Total Students',
        summary.total_students || 0
    ]);


    rows.push([
        'Total Sessions',
        summary.total_sessions || 0
    ]);


    rows.push([
        'Present',
        summary.present || 0
    ]);


    rows.push([
        'Late',
        summary.late || 0
    ]);


    rows.push([
        'Absent',
        summary.absent || 0
    ]);


    rows.push([
        'Attendance Percentage',
        `${summary.attendance_percentage || 0}%`
    ]);


    rows.push([]);


    rows.push([
        'S/N',
        'Student ID',
        'Full Name',
        'Registration No.',
        'Department',
        'Course',
        'Sessions',
        'Present',
        'Late',
        'Absent',
        'Attendance',
        'Status'
    ]);


    (
        Array.isArray(
            currentReport.students
        )
            ? currentReport.students
            : []
    ).forEach(
        (student, index) => {

            const percentage =
                Number(
                    student.attendance_percentage
                ) || 0;


            const status =
                percentage >= 80
                    ? 'Excellent'
                    : percentage >= 60
                        ? 'Good'
                        : percentage >= 40
                            ? 'Average'
                            : 'Needs Improvement';


            rows.push([
                index + 1,

                student.student_id || '',

                student.full_name || '',

                student.registration_number || '',

                student.department || '',

                student.course || '',

                student.total_sessions || 0,

                student.present || 0,

                student.late || 0,

                student.absent || 0,

                `${percentage}%`,

                status

            ]);

        }
    );


    const worksheet =
        XLSX.utils.aoa_to_sheet(
            rows
        );


    worksheet['!cols'] = [

        { wch: 6 },

        { wch: 18 },

        { wch: 28 },

        { wch: 22 },

        { wch: 25 },

        { wch: 25 },

        { wch: 12 },

        { wch: 10 },

        { wch: 10 },

        { wch: 10 },

        { wch: 14 },

        { wch: 20 }

    ];


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Attendance Report'
    );


    const fileName =
        sanitizeFileName(
            school.name ||
            'School'
        );


    XLSX.writeFile(
        workbook,
        `${fileName}_Attendance_Report.xlsx`
    );

}


// ===============================
// EXPORT PDF
// ===============================

function exportPDF() {

    if (!currentReport) {

        showMessage(
            'Please generate a report first.',
            'error'
        );

        return;

    }


    if (
        typeof window.jspdf ===
        'undefined'
    ) {

        showMessage(
            'PDF library is not loaded.',
            'error'
        );

        return;

    }


    const jsPDF =
        window.jspdf.jsPDF;


    if (
        typeof jsPDF !==
        'function'
    ) {

        showMessage(
            'PDF generator is not available.',
            'error'
        );

        return;

    }


    const doc =
        new jsPDF(
            'landscape',
            'mm',
            'a4'
        );


    const school =
        currentReport.school || {};


    const summary =
        currentReport.summary || {};


    const filters =
        currentReport.filters || {};


    doc.setFontSize(18);

    doc.text(
        'Attendance Report',
        14,
        15
    );


    doc.setFontSize(10);

    doc.text(
        `School: ${school.name || ''}`,
        14,
        23
    );


    doc.text(
        `Address: ${school.address || ''}`,
        14,
        30
    );


    doc.text(
        `Department: ${
            filters.department ||
            'All Departments'
        }`,
        14,
        37
    );


    doc.text(
        `Period: ${
            filters.from_date || ''
        } to ${
            filters.to_date || ''
        }`,
        14,
        44
    );


    doc.text(
        `Students: ${
            summary.total_students || 0
        }`,
        14,
        52
    );


    doc.text(
        `Sessions: ${
            summary.total_sessions || 0
        }`,
        65,
        52
    );


    doc.text(
        `Present: ${
            summary.present || 0
        }`,
        115,
        52
    );


    doc.text(
        `Late: ${
            summary.late || 0
        }`,
        160,
        52
    );


    doc.text(
        `Absent: ${
            summary.absent || 0
        }`,
        200,
        52
    );


    doc.text(
        `Attendance: ${
            summary.attendance_percentage || 0
        }%`,
        245,
        52
    );


    const rows =
        (
            Array.isArray(
                currentReport.students
            )
                ? currentReport.students
                : []
        ).map(
            (student, index) => {

                const percentage =
                    Number(
                        student.attendance_percentage
                    ) || 0;


                const status =
                    percentage >= 80
                        ? 'Excellent'
                        : percentage >= 60
                            ? 'Good'
                            : percentage >= 40
                                ? 'Average'
                                : 'Needs Improvement';


                return [

                    index + 1,

                    student.student_id || '',

                    student.full_name || '',

                    student.registration_number || '',

                    student.department || '',

                    student.course || '',

                    student.total_sessions || 0,

                    student.present || 0,

                    student.late || 0,

                    student.absent || 0,

                    `${percentage}%`,

                    status

                ];

            }
        );


    if (
        typeof doc.autoTable !==
        'function'
    ) {

        showMessage(
            'PDF table plugin is not loaded.',
            'error'
        );

        return;

    }


    doc.autoTable({

        startY: 59,

        head: [[

            'S/N',

            'Student ID',

            'Full Name',

            'Registration No.',

            'Department',

            'Course',

            'Sessions',

            'Present',

            'Late',

            'Absent',

            '%',

            'Status'

        ]],

        body: rows,

        styles: {

            fontSize: 6.5

        },

        headStyles: {

            fontSize: 6.5

        },

        margin: {

            left: 8,

            right: 8

        }

    });


    const fileName =
        sanitizeFileName(
            school.name ||
            'School'
        );


    doc.save(
        `${fileName}_Attendance_Report.pdf`
    );

}


// ===============================
// STATUS BADGE
// ===============================

function getStatusBadge(
    status
) {

    const safeStatus =
        String(
            status || ''
        )
        .toLowerCase()
        .replaceAll(
            ' ',
            '-'
        );


    return `
        <span
            class="status-badge status-${escapeHtml(
                safeStatus
            )}"
        >
            ${escapeHtml(
                status
            )}
        </span>
    `;

}


// ===============================
// DATE/TIME
// ===============================

function formatDateTime(
    value
) {

    if (!value) {

        return '—';

    }


    const date =
        new Date(value);


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return escapeHtml(
            String(value)
        );

    }


    return date.toLocaleString(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }
    );

}

// ===============================
// MESSAGE
// ===============================

function showMessage(
    message,
    type
) {

    if (!messageBox) {

        return;

    }


    messageBox.textContent =
        message;


    messageBox.className =
        `message-box ${type}`;


    messageBox.hidden =
        false;


    setTimeout(
        () => {

            messageBox.hidden =
                true;

            messageBox.className =
                'message-box';

        },
        4000
    );

}

// ===============================
// LOADING
// ===============================

function showLoading() {

    if (reportArea) {

        reportArea.hidden =
            false;

    }


    if (loadingState) {

        loadingState.hidden =
            false;

    }


    if (emptyState) {

        emptyState.hidden =
            true;

    }


    if (tableWrapper) {

        tableWrapper.hidden =
            true;

    }

}


// ===============================
// EMPTY
// ===============================

function showEmpty() {

    if (reportArea) {

        reportArea.hidden =
            true;

    }


    if (loadingState) {

        loadingState.hidden =
            true;

    }


    if (emptyState) {

        emptyState.hidden =
            true;

    }


    if (tableWrapper) {

        tableWrapper.hidden =
            false;

    }


    if (reportTableBody) {

        reportTableBody.innerHTML =
            '';

    }


    if (resultText) {

        resultText.textContent =
            'No report generated';

    }


    if (totalStudents) {

        totalStudents.textContent =
            '0';

    }


    if (totalSessions) {

        totalSessions.textContent =
            '0';

    }


    if (presentCount) {

        presentCount.textContent =
            '0';

    }


    if (lateCount) {

        lateCount.textContent =
            '0';

    }


    if (absentCount) {

        absentCount.textContent =
            '0';

    }


    if (attendancePercentage) {

        attendancePercentage.textContent =
            '0%';

    }

}


// ===============================
// FILE NAME
// ===============================

function sanitizeFileName(
    value
) {

    return String(value)

        .replace(
            /[<>:"/\\|?*]+/g,
            '_'
        )

        .replace(
            /\s+/g,
            '_'
        )

        .substring(
            0,
            100
        );

}


// ===============================
// ESCAPE HTML
// ===============================

function escapeHtml(
    value
) {

    return String(value)

        .replaceAll(
            '&',
            '&amp;'
        )

        .replaceAll(
            '<',
            '&lt;'
        )

        .replaceAll(
            '>',
            '&gt;'
        )

        .replaceAll(
            '"',
            '&quot;'
        )

        .replaceAll(
            "'",
            '&#039;'
        );

}


// ===============================
// EVENTS
// ===============================

if (schoolFilter) {

    schoolFilter.addEventListener(
        'change',
        loadDepartments
    );

}


if (generateBtn) {

    generateBtn.addEventListener(
        'click',
        generateReport
    );

}


if (resetBtn) {

    resetBtn.addEventListener(
        'click',
        resetFilters
    );

}


if (printBtn) {

    printBtn.addEventListener(
        'click',
        printReport
    );

}


if (exportPdfBtn) {

    exportPdfBtn.addEventListener(
        'click',
        exportPDF
    );

}


if (exportExcelBtn) {

    exportExcelBtn.addEventListener(
        'click',
        exportExcel
    );

}


if (tableSearch) {

    tableSearch.addEventListener(
        'input',
        searchStudents
    );

}


if (studentIdFilter) {

    studentIdFilter.addEventListener(
        'keydown',
        function (event) {

            if (
                event.key === 'Enter'
            ) {

                generateReport();

            }

        }
    );

}


// ===============================
// LOGOUT
// ===============================

const logoutBtn =
    document.getElementById(
        'logoutBtn'
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        'click',
        function () {

            localStorage.removeItem(
                'daura_admin_token'
            );

            localStorage.removeItem(
                'daura_admin_user'
            );

            localStorage.removeItem(
                'daura_role'
            );


            window.location.href =
                '../login.html';

        }
    );

}


// ===============================
// INITIAL LOAD
// ===============================

async function initializePage() {

    try {

        setDefaultDates();

        await loadSchools();

    } catch (error) {

        console.error(
            'Page initialization error:',
            error
        );

    }

}


initializePage();