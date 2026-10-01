const API_BASE = '/api';



const token =
    localStorage.getItem("daura_admin_token");


if (!token) {

    window.location.href = "login.html";

}


// ===============================
// ELEMENTS
// ===============================

const qrForm = document.getElementById('qrForm');

const sessionType = document.getElementById('sessionType');
const sessionDate = document.getElementById('sessionDate');
const startTime = document.getElementById('startTime');
const endTime = document.getElementById('endTime');

const generateBtn = document.getElementById('generateBtn');

const qrEmptyState = document.getElementById('qrEmptyState');
const qrResult = document.getElementById('qrResult');

const qrImage = document.getElementById('qrImage');

const resultSessionId =
    document.getElementById('resultSessionId');

const resultDate =
    document.getElementById('resultDate');

const resultTime =
    document.getElementById('resultTime');

const resultToken =
    document.getElementById('resultToken');

const sessionsTableBody =
    document.getElementById('sessionsTableBody');

const refreshBtn =
    document.getElementById('refreshBtn');

const messageBox =
    document.getElementById('messageBox');

const logoutBtn =
    document.getElementById('logoutBtn');


// ===============================
// DEFAULT DATE
// ===============================

function setDefaultDate() {

    const today = new Date();

    const year = today.getFullYear();

    const month = String(
        today.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
        today.getDate()
    ).padStart(2, '0');

    sessionDate.value =
        `${year}-${month}-${day}`;

}


// ===============================
// DEFAULT TIMES
// ===============================

function setDefaultTimes() {

    sessionType.addEventListener('change', () => {

        if (sessionType.value === 'morning') {

            startTime.value = '08:00';
            endTime.value = '12:00';

        }

        else if (sessionType.value === 'afternoon') {

            startTime.value = '13:00';
            endTime.value = '17:00';

        }

        else {

            startTime.value = '08:00';
            endTime.value = '17:00';

        }

    });

}


// ===============================
// MESSAGE
// ===============================

function showMessage(message, type = 'success') {

    messageBox.textContent = message;

    messageBox.className =
        `message-box message-${type}`;

    setTimeout(() => {

        messageBox.className =
            'message-box';

        messageBox.textContent = '';

    }, 5000);

}


// ===============================
// AUTH HEADERS
// ===============================

function getHeaders() {

    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

}


// ===============================
// FORMAT DATE
// ===============================

function formatDate(dateValue) {

    if (!dateValue) {
        return '—';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
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
// FORMAT TIME
// ===============================

function formatTime(timeValue) {

    if (!timeValue) {
        return '—';
    }

    // MySQL TIME normally comes as HH:MM:SS
    const parts = String(timeValue).split(':');

    if (parts.length < 2) {
        return timeValue;
    }

    let hour = Number(parts[0]);
    const minute = parts[1];

    const suffix = hour >= 12 ? 'PM' : 'AM';

    hour = hour % 12;

    if (hour === 0) {
        hour = 12;
    }

    return `${String(hour).padStart(2, '0')}:${minute} ${suffix}`;

}


// ===============================
// FORMAT DATETIME
// ===============================

function formatDateTime(value) {

    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
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
// STATUS BADGE
// ===============================

function getStatusBadge(status) {

    const cleanStatus =
        String(status || 'unknown').toLowerCase();

    let className = 'status-unknown';

    if (cleanStatus === 'active') {
        className = 'status-active';
    }

    else if (cleanStatus === 'expired') {
        className = 'status-expired';
    }

    else if (cleanStatus === 'closed') {
        className = 'status-closed';
    }

    return `
        <span class="status ${className}">
            ${cleanStatus}
        </span>
    `;

}


// ===============================
// CREATE QR SESSION
// ===============================

qrForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    const date = sessionDate.value;
    const start = startTime.value;
    const end = endTime.value;

    if (!date || !start || !end) {

        showMessage(
            'Please fill all required fields.',
            'error'
        );

        return;

    }


    if (start >= end) {

        showMessage(
            'End time must be later than start time.',
            'error'
        );

        return;

    }


    generateBtn.disabled = true;

    generateBtn.innerHTML =
        '⏳ Generating QR Code...';


    try {

        const response = await fetch(
            `${API_BASE}/qr`,
            {
                method: 'POST',
                headers: getHeaders(),

                body: JSON.stringify({
                    session_type: sessionType.value,
                    session_date: date,
                    start_time: start,
                    end_time: end
                })
            }
        );


        const result = await response.json();


        if (!response.ok || !result.success) {

            throw new Error(
                result.message ||
                'Failed to create QR session'
            );

        }


        // =========================
        // DISPLAY GENERATED QR
        // =========================

        qrEmptyState.style.display = 'none';

        qrResult.style.display = 'block';


        qrImage.src = result.qr_code;

        resultSessionId.textContent =
            result.session_id || '—';

        resultDate.textContent =
            formatDate(result.session_date || date);

        resultTime.textContent =
            `${formatTime(result.start_time || start)} - ${formatTime(result.end_time || end)}`;

        resultToken.textContent =
            result.qr_token || '—';


        showMessage(
            'QR session created successfully.',
            'success'
        );


        // Refresh sessions table
        loadQRSessions();


    }

    catch (error) {

        console.error(error);

        showMessage(
            error.message ||
            'Something went wrong while generating QR.',
            'error'
        );

    }

    finally {

        generateBtn.disabled = false;

        generateBtn.innerHTML =
            '<span>📱</span> Generate QR Code';

    }

});


// ===============================
// LOAD QR SESSIONS
// ===============================

async function loadQRSessions() {

    sessionsTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="loading">
                Loading QR sessions...
            </td>
        </tr>
    `;


    try {

        const response = await fetch(
            `${API_BASE}/qr`,
            {
                method: 'GET',
                headers: getHeaders()
            }
        );


        const result = await response.json();


        if (!response.ok || !result.success) {

            throw new Error(
                result.message ||
                'Failed to fetch QR sessions'
            );

        }


        // Backend response expected:
        // { success: true, data: [...] }

        const sessions =
            Array.isArray(result.data)
                ? result.data
                : [];


        renderSessions(sessions);

    }

    catch (error) {

        console.error(error);

        sessionsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    Failed to load QR sessions.
                </td>
            </tr>
        `;

    }

}


// ===============================
// RENDER SESSIONS
// ===============================

function renderSessions(sessions) {

    if (!sessions.length) {

        sessionsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    No QR sessions found.
                </td>
            </tr>
        `;

        return;

    }


    sessionsTableBody.innerHTML =
        sessions.map(session => {

            return `
                <tr>

                    <td>
                        ${session.id ?? '—'}
                    </td>

                    <td>
                        ${session.session_type ?? '—'}
                    </td>

                    <td>
                        ${formatDate(session.session_date)}
                    </td>

                    <td>
                        ${formatTime(session.start_time)}
                    </td>

                    <td>
                        ${formatTime(session.end_time)}
                    </td>

                    <td>
                        ${formatDateTime(session.expires_at)}
                    </td>

                    <td>
                        ${getStatusBadge(session.status)}
                    </td>

                </tr>
            `;

        }).join('');

}


// ===============================
// REFRESH
// ===============================

refreshBtn.addEventListener(
    'click',
    loadQRSessions
);


// ===============================
// LOGOUT
// ===============================

logoutBtn.addEventListener(
    'click',
    (event) => {

        event.preventDefault();

        localStorage.removeItem('token');
        localStorage.removeItem('role');

        localStorage.removeItem('admin');
window.location.href = 'login.html';
    }
);


// ===============================
// COMING SOON
// ===============================

document
    .querySelectorAll('[data-coming-soon]')
    .forEach(link => {

        link.addEventListener(
            'click',
            (event) => {

                event.preventDefault();

                showMessage(
                    'This module is coming soon.',
                    'success'
                );

            }
        );

    });


// ===============================
// START
// ===============================

setDefaultDate();

setDefaultTimes();

loadQRSessions();