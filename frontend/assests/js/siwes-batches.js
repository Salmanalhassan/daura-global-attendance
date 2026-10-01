const API_BASE = '/api';

let batches = [];
let editingBatchId = null;


// ===============================
// DOM ELEMENTS
// ===============================

const tableBody =
    document.getElementById('batchesTableBody');

const batchModal =
    document.getElementById('batchModal');

const batchForm =
    document.getElementById('batchForm');

const addBatchBtn =
    document.getElementById('addBatchBtn');

const closeModalBtn =
    document.getElementById('closeModalBtn');

const cancelBtn =
    document.getElementById('cancelBtn');

const searchInput =
    document.getElementById('searchInput');

const statusFilter =
    document.getElementById('statusFilter');

const messageBox =
    document.getElementById('messageBox');

const batchCount =
    document.getElementById('batchCount');

const adminName =
    document.getElementById('adminName');


// ===============================
// AUTH
// ===============================

const token =
    localStorage.getItem('daura_admin_token');

const adminUser =
    localStorage.getItem('daura_admin_user');

const role =
    localStorage.getItem('daura_role');


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

        adminName.textContent =
            user.username ||
            user.full_name ||
            'Admin';

    } catch (error) {

        adminName.textContent = 'Admin';

    }

}


// ===============================
// API HELPER
// ===============================

async function apiRequest(
    url,
    options = {}
) {

    const response =
        await fetch(`${API_BASE}${url}`, {

            ...options,

            headers: {

                'Content-Type':
                    'application/json',

                'Authorization':
                    `Bearer ${token}`,

                ...(options.headers || {})

            }

        });


    let data;

    try {

        data = await response.json();

    } catch (error) {

        data = {
            success: false,
            message: 'Invalid server response'
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
            'Something went wrong'
        );

    }


    return data;

}


// ===============================
// LOAD BATCHES
// ===============================

async function loadBatches() {

    tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="loading">
                Loading batches...
            </td>
        </tr>
    `;

    try {

        const result =
            await apiRequest('/batches');

        if (!result) return;


        batches =
            Array.isArray(result.data)
                ? result.data
                : [];


        renderBatches();

    } catch (error) {

        console.error(error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    Failed to load batches.
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
// RENDER BATCHES
// ===============================

function renderBatches() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();

    const status =
        statusFilter.value;


    const filtered =
        batches.filter(batch => {

            const name =
                String(
                    batch.name || ''
                ).toLowerCase();

            const description =
                String(
                    batch.description || ''
                ).toLowerCase();

            const matchesSearch =
                !search ||
                name.includes(search) ||
                description.includes(search);

            const matchesStatus =
                !status ||
                batch.status === status;

            return (
                matchesSearch &&
                matchesStatus
            );

        });


    batchCount.textContent =
        `${filtered.length} ${
            filtered.length === 1
                ? 'Batch'
                : 'Batches'
        }`;


    if (filtered.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    No SIWES batches found.
                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        filtered.map(
            (batch, index) => {

                const startDate =
                    formatDate(
                        batch.start_date
                    );

                const endDate =
                    formatDate(
                        batch.end_date
                    );

                const duration =
                    calculateDuration(
                        batch.start_date,
                        batch.end_date
                    );

                const description =
                    batch.description
                        ? escapeHtml(
                            batch.description
                        )
                        : '—';


                return `
                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            <strong>
                                ${escapeHtml(
                                    batch.name
                                )}
                            </strong>
                        </td>

                        <td>
                            ${startDate}
                        </td>

                        <td>
                            ${endDate}
                        </td>

                        <td>
                            ${duration}
                        </td>

                        <td>
                            ${getStatusBadge(
                                batch.status
                            )}
                        </td>

                        <td>
                            ${description}
                        </td>

                        <td>

                            <button
                                class="edit-btn"
                                onclick="openEditModal(${batch.id})"
                            >
                                Edit
                            </button>

                        </td>

                    </tr>
                `;

            }
        ).join('');

}


// ===============================
// STATUS BADGE
// ===============================

function getStatusBadge(status) {

    const safeStatus =
        status || 'upcoming';

    return `
        <span
            class="status-badge status-${safeStatus}"
        >
            ${escapeHtml(
                safeStatus
            )}
        </span>
    `;

}


// ===============================
// DATE FORMAT
// ===============================

function formatDate(dateValue) {

    if (!dateValue) {
        return '—';
    }


    const date =
        new Date(dateValue);


    if (isNaN(date.getTime())) {

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
// CALCULATE DURATION
// ===============================

function calculateDuration(
    start,
    end
) {

    if (!start || !end) {
        return '—';
    }


    const startDate =
        new Date(start);

    const endDate =
        new Date(end);


    if (
        isNaN(startDate) ||
        isNaN(endDate)
    ) {

        return '—';

    }


    const difference =
        endDate - startDate;


    const days =
        Math.floor(
            difference /
            (1000 * 60 * 60 * 24)
        ) + 1;


    if (days < 0) {
        return 'Invalid dates';
    }


    if (days === 1) {
        return '1 day';
    }


    return `${days} days`;

}


// ===============================
// OPEN ADD MODAL
// ===============================

function openAddModal() {

    editingBatchId = null;

    document.getElementById(
        'modalTitle'
    ).textContent =
        'Add SIWES Batch';

    document.getElementById(
        'saveBtn'
    ).textContent =
        'Save Batch';


    batchForm.reset();


    document.getElementById(
        'batchStatus'
    ).value =
        'upcoming';


    batchModal.classList.add('show');

}


// ===============================
// OPEN EDIT MODAL
// ===============================

window.openEditModal =
    function (id) {

        const batch =
            batches.find(
                item =>
                    Number(item.id) === Number(id)
            );


        if (!batch) {

            showMessage(
                'Batch not found',
                'error'
            );

            return;

        }


        editingBatchId =
            batch.id;


        document.getElementById(
            'modalTitle'
        ).textContent =
            'Edit SIWES Batch';


        document.getElementById(
            'saveBtn'
        ).textContent =
            'Update Batch';


        document.getElementById(
            'batchId'
        ).value =
            batch.id;


        document.getElementById(
            'batchName'
        ).value =
            batch.name || '';


        document.getElementById(
            'startDate'
        ).value =
            formatDateForInput(
                batch.start_date
            );


        document.getElementById(
            'endDate'
        ).value =
            formatDateForInput(
                batch.end_date
            );


        document.getElementById(
            'batchStatus'
        ).value =
            batch.status || 'upcoming';


        document.getElementById(
            'description'
        ).value =
            batch.description || '';


        batchModal.classList.add(
            'show'
        );

    };


// ===============================
// CLOSE MODAL
// ===============================

function closeModal() {

    batchModal.classList.remove(
        'show'
    );

    batchForm.reset();

    editingBatchId = null;

}


// ===============================
// SAVE BATCH
// ===============================

batchForm.addEventListener(
    'submit',
    async function (event) {

        event.preventDefault();


        const name =
            document.getElementById(
                'batchName'
            ).value.trim();

        const start_date =
            document.getElementById(
                'startDate'
            ).value;

        const end_date =
            document.getElementById(
                'endDate'
            ).value;

        const status =
            document.getElementById(
                'batchStatus'
            ).value;

        const description =
            document.getElementById(
                'description'
            ).value.trim();


        if (!name) {

            showMessage(
                'Batch name is required',
                'error'
            );

            return;

        }


        if (!start_date || !end_date) {

            showMessage(
                'Start date and end date are required',
                'error'
            );

            return;

        }


        if (end_date < start_date) {

            showMessage(
                'End date cannot be before start date',
                'error'
            );

            return;

        }


        const payload = {

            name,
            start_date,
            end_date,
            status,
            description:
                description || null

        };


        const saveBtn =
            document.getElementById(
                'saveBtn'
            );


        saveBtn.disabled = true;

        saveBtn.textContent =
            editingBatchId
                ? 'Updating...'
                : 'Saving...';


        try {

            let result;


            if (editingBatchId) {

                result =
                    await apiRequest(
                        `/batches/${editingBatchId}`,
                        {
                            method: 'PUT',
                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

            } else {

                result =
                    await apiRequest(
                        '/batches',
                        {
                            method: 'POST',
                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

            }


            if (!result) return;


            showMessage(
                result.message ||
                (
                    editingBatchId
                        ? 'Batch updated successfully'
                        : 'Batch added successfully'
                ),
                'success'
            );


            closeModal();

            await loadBatches();


        } catch (error) {

            console.error(error);

            showMessage(
                error.message,
                'error'
            );

        } finally {

            saveBtn.disabled = false;

            saveBtn.textContent =
                editingBatchId
                    ? 'Update Batch'
                    : 'Save Batch';

        }

    }
);


// ===============================
// EVENTS
// ===============================

addBatchBtn.addEventListener(
    'click',
    openAddModal
);

closeModalBtn.addEventListener(
    'click',
    closeModal
);

cancelBtn.addEventListener(
    'click',
    closeModal
);


batchModal.addEventListener(
    'click',
    function (event) {

        if (
            event.target === batchModal
        ) {

            closeModal();

        }

    }
);


searchInput.addEventListener(
    'input',
    renderBatches
);


statusFilter.addEventListener(
    'change',
    renderBatches
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
    .forEach(link => {

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

    });


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


    setTimeout(() => {

        messageBox.className =
            'message-box';

    }, 4000);

}


// ===============================
// DATE INPUT FORMAT
// ===============================

function formatDateForInput(
    dateValue
) {

    if (!dateValue) {
        return '';
    }


    if (
        typeof dateValue === 'string' &&
        /^\d{4}-\d{2}-\d{2}/.test(dateValue)
    ) {

        return dateValue.substring(
            0,
            10
        );

    }


    const date =
        new Date(dateValue);


    if (isNaN(date.getTime())) {
        return '';
    }


    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, '0');

    const day =
        String(
            date.getDate()
        ).padStart(2, '0');


    return `${year}-${month}-${day}`;

}


// ===============================
// ESCAPE HTML
// ===============================

function escapeHtml(value) {

    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

}


// ===============================
// INITIAL LOAD
// ===============================

loadBatches();