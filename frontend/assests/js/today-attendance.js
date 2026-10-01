const API_BASE = '/api';

let attendanceRecords = [];


// ===============================
// DOM
// ===============================

const tableBody =
    document.getElementById(
        'attendanceTableBody'
    );

const searchInput =
    document.getElementById(
        'searchInput'
    );

const schoolFilter =
    document.getElementById(
        'schoolFilter'
    );

const statusFilter =
    document.getElementById(
        'statusFilter'
    );

const refreshBtn =
    document.getElementById(
        'refreshBtn'
    );

const messageBox =
    document.getElementById(
        'messageBox'
    );

const recordCount =
    document.getElementById(
        'recordCount'
    );

const todayDate =
    document.getElementById(
        'todayDate'
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


// ===============================
// AUTH
// ===============================

const token =
    localStorage.getItem(
        'daura_admin_token'
    );

const role =
    localStorage.getItem(
        'daura_role'
    );

const adminUser =
    localStorage.getItem(
        'daura_admin_user'
    );


if (!token || role !== 'admin') {

    window.location.href =
        '../login.html';

}


// ===============================
// ADMIN NAME
// ===============================

const adminName =
    document.getElementById(
        'adminName'
    );

if (adminUser) {

    try {

        const user =
            JSON.parse(adminUser);

        adminName.textContent =
            user.username ||
            user.full_name ||
            'Admin';

    } catch (error) {

        adminName.textContent =
            'Admin';

    }

}


// ===============================
// TODAY DATE
// ===============================

function showTodayDate() {

    const now = new Date();

    todayDate.textContent =
        now.toLocaleDateString(
            'en-GB',
            {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            }
        );

}

showTodayDate();


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
// LOAD ATTENDANCE
// ===============================

async function loadAttendance() {

    tableBody.innerHTML = `
        <tr>
            <td
                colspan="6"
                class="loading"
            >
                Loading attendance...
            </td>
        </tr>
    `;


    try {

        const result =
            await apiRequest(
                '/attendance/today'
            );


        if (!result) return;


        attendanceRecords =
            Array.isArray(result.data)
                ? result.data
                : [];


        updateStatistics();

        populateSchools();

        renderAttendance();


    } catch (error) {

        console.error(error);


        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty"
                >
                    Failed to load attendance.
                </td>
            </tr>
        `;


        showMessage(
            error.message,
            'error'
        );

    }

}


// ===============================
// STATISTICS
// ===============================

function updateStatistics() {

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


    const total =
        attendanceRecords.length;


    totalAttendance.textContent =
        total;

    presentCount.textContent =
        present;

    lateCount.textContent =
        late;


    /*
        The attendance endpoint returns
        actual attendance records.

        Absent students are students
        without an attendance record.
    */

    absentCount.textContent =
        '—';

}


// ===============================
// SCHOOL FILTER
// ===============================

function populateSchools() {

    const currentValue =
        schoolFilter.value;


    const schools =
        new Map();


    attendanceRecords.forEach(
        record => {

            const schoolId =
                record.school_id;

            const schoolName =
                record.school_name;


            if (
                schoolId &&
                schoolName
            ) {

                schools.set(
                    String(schoolId),
                    schoolName
                );

            }

        }
    );


    schoolFilter.innerHTML = `
        <option value="">
            All Schools
        </option>
    `;


    Array.from(
        schools.entries()
    )
    .sort(
        (a, b) =>
            a[1].localeCompare(b[1])
    )
    .forEach(
        ([id, name]) => {

            const option =
                document.createElement(
                    'option'
                );

            option.value = id;

            option.textContent = name;

            schoolFilter.appendChild(
                option
            );

        }
    );


    schoolFilter.value =
        currentValue;

}


// ===============================
// FILTER
// ===============================

function getFilteredRecords() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const selectedSchool =
        schoolFilter.value;


    const selectedStatus =
        statusFilter.value;


    return attendanceRecords.filter(
        record => {

            const studentName =
                String(
                    record.full_name || ''
                ).toLowerCase();


            const studentId =
                String(
                    record.student_id || ''
                ).toLowerCase();


            const schoolName =
                String(
                    record.school_name || ''
                ).toLowerCase();


            const matchesSearch =
                !search ||
                studentName.includes(search) ||
                studentId.includes(search) ||
                schoolName.includes(search);


            const matchesSchool =
                !selectedSchool ||
                String(
                    record.school_id
                ) === selectedSchool;


            const matchesStatus =
                !selectedStatus ||
                record.status === selectedStatus;


            return (
                matchesSearch &&
                matchesSchool &&
                matchesStatus
            );

        }
    );

}


// ===============================
// RENDER TABLE
// ===============================

function renderAttendance() {

    const records =
        getFilteredRecords();


    recordCount.textContent =
        `${records.length} ${
            records.length === 1
                ? 'Record'
                : 'Records'
        }`;


    if (records.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty"
                >
                    No attendance records found.
                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        records.map(
            (record, index) => {

                const studentName =
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
                            <span
                                class="student-name"
                            >
                                ${escapeHtml(
                                    studentName
                                )}
                            </span>
                        </td>

                        <td>
                            <span
                                class="student-id"
                            >
                                ${escapeHtml(
                                    studentId
                                )}
                            </span>
                        </td>

                        <td>
                            ${escapeHtml(
                                school
                            )}
                        </td>

                        <td>
                            ${time}
                        </td>

                        <td>
                            ${getStatusBadge(
                                status
                            )}
                        </td>

                    </tr>
                `;

            }
        ).join('');

}


// ===============================
// TIME FORMAT
// ===============================

function formatTime(
    timeValue
) {

    if (!timeValue) {
        return '—';
    }


    const value =
        String(timeValue);


    const match =
        value.match(
            /^(\d{1,2}):(\d{2})(?::(\d{2}))?/
        );


    if (!match) {

        return escapeHtml(
            value
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

function getStatusBadge(
    status
) {

    return `
        <span
            class="status-badge status-${escapeHtml(
                status
            )}"
        >
            ${escapeHtml(status)}
        </span>
    `;

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

searchInput.addEventListener(
    'input',
    renderAttendance
);

schoolFilter.addEventListener(
    'change',
    renderAttendance
);

statusFilter.addEventListener(
    'change',
    renderAttendance
);


refreshBtn.addEventListener(
    'click',
    async function () {

        refreshBtn.disabled =
            true;

        refreshBtn.textContent =
            'Refreshing...';


        await loadAttendance();


        refreshBtn.disabled =
            false;

        refreshBtn.textContent =
            '🔄 Refresh';

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

loadAttendance();