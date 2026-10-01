const API_BASE = '/api';

let attendanceRecords = [];


// ===============================
// DOM
// ===============================

const tableBody =
    document.getElementById('attendanceTableBody');

const dateFilter =
    document.getElementById('dateFilter');

const schoolFilter =
    document.getElementById('schoolFilter');

const studentFilter =
    document.getElementById('studentFilter');

const statusFilter =
    document.getElementById('statusFilter');

const searchBtn =
    document.getElementById('searchBtn');

const resetBtn =
    document.getElementById('resetBtn');

const refreshBtn =
    document.getElementById('refreshBtn');

const messageBox =
    document.getElementById('messageBox');

const totalRecords =
    document.getElementById('totalRecords');

const presentRecords =
    document.getElementById('presentRecords');

const lateRecords =
    document.getElementById('lateRecords');

const resultText =
    document.getElementById('resultText');

const adminName =
    document.getElementById('adminName');


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

    window.location.href = '../login.html';

}


// ===============================
// ADMIN NAME
// ===============================

if (adminUser) {

    try {

        const user =
            JSON.parse(adminUser);

        const name =
            user.full_name ||
            user.username ||
            'Admin';

        adminName.textContent =
            name;

    } catch (error) {

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
// LOAD SCHOOLS
// ===============================

async function loadSchools() {

    try {

        const result =
            await apiRequest(
                '/schools'
            );


        if (!result) return;


        const schools =
            Array.isArray(result.data)
                ? result.data
                : [];


        schoolFilter.innerHTML = `
            <option value="">
                All Schools
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

    }

}


// ===============================
// BUILD QUERY
// ===============================

function buildQuery() {

    const params =
        new URLSearchParams();


    const date =
        dateFilter.value;

    const school =
        schoolFilter.value;

    const student =
        studentFilter.value.trim();

    const status =
        statusFilter.value;


    if (date) {

        params.append(
            'date',
            date
        );

    }


    if (school) {

        params.append(
            'school_id',
            school
        );

    }


    if (student) {

        params.append(
            'student_id',
            student
        );

    }


    if (status) {

        params.append(
            'status',
            status
        );

    }


    const query =
        params.toString();


    return query
        ? `?${query}`
        : '';

}


// ===============================
// SEARCH ATTENDANCE
// ===============================

async function searchAttendance() {

    tableBody.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="loading"
            >
                Loading attendance records...
            </td>
        </tr>
    `;


    searchBtn.disabled =
        true;

    refreshBtn.disabled =
        true;


    searchBtn.textContent =
        'Searching...';


    try {

        const query =
            buildQuery();


        const result =
            await apiRequest(
                `/attendance/history${query}`
            );


        if (!result) return;


        attendanceRecords =
            Array.isArray(result.data)
                ? result.data
                : [];


        updateSummary();

        renderTable();


    } catch (error) {

        console.error(
            'Attendance history error:',
            error
        );


        attendanceRecords =
            [];


        updateSummary();


        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty"
                >
                    Failed to load attendance history.
                </td>
            </tr>
        `;


        showMessage(
            error.message ||
            'Failed to load attendance history.',
            'error'
        );


    } finally {

        searchBtn.disabled =
            false;

        refreshBtn.disabled =
            false;

        searchBtn.textContent =
            '🔎 Search';

    }

}


// ===============================
// SUMMARY
// ===============================

function updateSummary() {

    const total =
        attendanceRecords.length;


    const present =
        attendanceRecords.filter(
            record =>
                record.status === 'present'
        ).length;


    const late =
        attendanceRecords.filter(
            record =>
                record.status === 'late'
        ).length;


    totalRecords.textContent =
        total;


    presentRecords.textContent =
        present;


    lateRecords.textContent =
        late;


    resultText.textContent =
        `Showing ${total} ${
            total === 1
                ? 'attendance record'
                : 'attendance records'
        }`;

}


// ===============================
// RENDER TABLE
// ===============================

function renderTable() {

    if (
        attendanceRecords.length === 0
    ) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty"
                >
                    No attendance records found.
                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        attendanceRecords
            .map(
                (record, index) => {

                    const date =
                        formatDate(
                            record.attendance_date
                        );


                    const name =
                        record.full_name ||
                        record.student_name ||
                        'Unknown Student';


                    const studentId =
                        record.student_id ||
                        '—';


                    const school =
                        record.school_name ||
                        '—';


                    const time =
                        formatTime(
                            record.attendance_time
                        );


                    const status =
                        record.status ||
                        'present';


                    return `
                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>
                                ${date}
                            </td>

                            <td>
                                <span class="student-name">
                                    ${escapeHtml(name)}
                                </span>
                            </td>

                            <td>
                                <span class="student-id">
                                    ${escapeHtml(studentId)}
                                </span>
                            </td>

                            <td>
                                ${escapeHtml(school)}
                            </td>

                            <td>
                                ${time}
                            </td>

                            <td>
                                ${getStatusBadge(status)}
                            </td>

                        </tr>
                    `;

                }
            )
            .join('');

}


// ===============================
// DATE FORMAT
// ===============================

function formatDate(value) {

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


    return date.toLocaleDateString(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }
    );

}


// ===============================
// TIME FORMAT
// ===============================

function formatTime(value) {

    if (!value) {

        return '—';

    }


    const match =
        String(value).match(
            /^(\d{1,2}):(\d{2})/
        );


    if (!match) {

        return escapeHtml(
            String(value)
        );

    }


    let hour =
        Number(match[1]);

    const minute =
        match[2];


    const period =
        hour >= 12
            ? 'PM'
            : 'AM';


    hour =
        hour % 12 || 12;


    return `${hour}:${minute} ${period}`;

}


// ===============================
// STATUS BADGE
// ===============================

function getStatusBadge(status) {

    const safeStatus =
        String(status || 'present')
            .toLowerCase();


    return `
        <span
            class="status-badge status-${escapeHtml(
                safeStatus
            )}"
        >
            ${escapeHtml(safeStatus)}
        </span>
    `;

}


// ===============================
// RESET
// ===============================

function resetFilters() {

    dateFilter.value =
        '';

    schoolFilter.value =
        '';

    studentFilter.value =
        '';

    statusFilter.value =
        '';


    attendanceRecords =
        [];


    totalRecords.textContent =
        '0';


    presentRecords.textContent =
        '0';


    lateRecords.textContent =
        '0';


    resultText.textContent =
        'Showing attendance records';


    tableBody.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="loading"
            >
                Loading attendance records...
            </td>
        </tr>
    `;


    searchAttendance();

}


// ===============================
// MESSAGE
// ===============================

function showMessage(
    message,
    type
) {

    messageBox.textContent =
        message;

    messageBox.className =
        `message-box ${type}`;


    setTimeout(
        () => {

            messageBox.className =
                'message-box';

        },
        4000
    );

}


// ===============================
// ESCAPE HTML
// ===============================

function escapeHtml(value) {

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

searchBtn.addEventListener(
    'click',
    searchAttendance
);


resetBtn.addEventListener(
    'click',
    resetFilters
);


refreshBtn.addEventListener(
    'click',
    searchAttendance
);


studentFilter.addEventListener(
    'keydown',
    function (event) {

        if (
            event.key === 'Enter'
        ) {

            searchAttendance();

        }

    }
);


// ===============================
// LOGOUT
// ===============================

document
    .getElementById('logoutBtn')
    .addEventListener(
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


// ===============================
// COMING SOON
// ===============================

document
    .querySelectorAll(
        '[data-coming-soon]'
    )
    .forEach(
        link => {

            link.addEventListener(
                'click',
                function (event) {

                    event.preventDefault();

                    showMessage(
                        'This module is coming soon.',
                        'error'
                    );

                }
            );

        }
    );


// ===============================
// INITIAL LOAD
// ===============================

async function initializePage() {

    try {

        await loadSchools();

        await searchAttendance();

    } catch (error) {

        console.error(
            'Page initialization error:',
            error
        );

    }

}


initializePage();