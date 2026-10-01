const API_URL = "/api";


/* =========================================
   AUTH
========================================= */

const token =
    localStorage.getItem("daura_admin_token");


if (!token) {

    window.location.href = "login.html";

}



/* =========================================
   DOM
========================================= */

const schoolsTableBody =
    document.getElementById(
        "schoolsTableBody"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const statusFilter =
    document.getElementById(
        "statusFilter"
    );

const resetFilters =
    document.getElementById(
        "resetFilters"
    );

const schoolCount =
    document.getElementById(
        "schoolCount"
    );

const schoolModal =
    document.getElementById(
        "schoolModal"
    );

const openAddSchoolButton =
    document.getElementById(
        "openAddSchoolButton"
    );

const closeModal =
    document.getElementById(
        "closeModal"
    );

const cancelModal =
    document.getElementById(
        "cancelModal"
    );

const schoolForm =
    document.getElementById(
        "schoolForm"
    );

const modalTitle =
    document.getElementById(
        "modalTitle"
    );

const saveSchoolButton =
    document.getElementById(
        "saveSchoolButton"
    );

const pageMessage =
    document.getElementById(
        "pageMessage"
    );



/* =========================================
   DATA
========================================= */

let allSchools = [];

let messageTimer;



/* =========================================
   ADMIN INFORMATION
========================================= */

function loadAdminInfo() {

    const savedUser =
        localStorage.getItem(
            "daura_admin_user"
        );


    if (!savedUser) {
        return;
    }


    try {

        const user =
            JSON.parse(savedUser);


        const name =
            user.full_name ||
            user.username ||
            "Admin";


        document.getElementById(
            "adminName"
        ).textContent = name;


        const avatar =
            document.querySelector(
                ".admin-avatar"
            );


        if (
            avatar &&
            name.length > 0
        ) {

            avatar.textContent =
                name
                    .charAt(0)
                    .toUpperCase();

        }


    } catch (error) {

        console.error(
            "Admin data error:",
            error
        );

    }

}


loadAdminInfo();



/* =========================================
   API REQUEST
========================================= */

async function apiRequest(
    url,
    options = {}
) {

    const response =
        await fetch(
            url,
            {

                ...options,

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${token}`,

                    ...(options.headers || {})

                }

            }
        );


    const data =
        await response.json();


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        localStorage.removeItem(
            "daura_admin_token"
        );

        localStorage.removeItem(
            "daura_admin_user"
        );

        localStorage.removeItem(
            "daura_role"
        );


        window.location.href =
            "login.html";


        throw new Error(
            "Authentication expired"
        );

    }


    if (
        !response.ok ||
        !data.success
    ) {

        throw new Error(
            data.message ||
            "Request failed"
        );

    }


    return data;

}



/* =========================================
   MESSAGE
========================================= */

function showMessage(
    message,
    type = "success"
) {

    clearTimeout(
        messageTimer
    );


    pageMessage.textContent =
        message;


    pageMessage.className =
        `page-message ${type}`;


    messageTimer =
        setTimeout(
            () => {

                pageMessage.className =
                    "page-message";

                pageMessage.textContent =
                    "";

            },
            5000
        );

}



/* =========================================
   LOAD SCHOOLS
========================================= */

async function loadSchools() {

    schoolsTableBody.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="loading-cell"
            >
                Loading schools...
            </td>
        </tr>
    `;


    try {

        const data =
            await apiRequest(
                `${API_URL}/schools`
            );


        allSchools =
            data.data || [];


        renderSchools(
            allSchools
        );


    } catch (error) {

        console.error(
            "Load schools error:",
            error
        );


        schoolsTableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="error-cell"
                >
                    Failed to load schools.
                    ${escapeHtml(
                        error.message
                    )}
                </td>
            </tr>
        `;

    }

}



/* =========================================
   RENDER SCHOOLS
========================================= */

function renderSchools(
    schools
) {

    schoolsTableBody.innerHTML =
        "";


    schoolCount.textContent =
        `${schools.length} ${
            schools.length === 1
                ? "School"
                : "Schools"
        }`;


    if (
        schools.length === 0
    ) {

        schoolsTableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-cell"
                >
                    No schools found.
                </td>
            </tr>
        `;

        return;

    }


    schools.forEach(
        school => {

            const row =
                document.createElement(
                    "tr"
                );


            const firstLetter =
                (
                    school.name ||
                    "S"
                )
                .charAt(0)
                .toUpperCase();


            const status =
                school.status ||
                "active";


            row.innerHTML = `

                <td>

                    <div class="school-info">

                        <div class="school-avatar">
                            🏫
                        </div>

                        <div>

                            <div class="school-name">
                                ${escapeHtml(
                                    school.name
                                )}
                            </div>

                            <div class="school-id">
                                School ID: ${school.id}
                            </div>

                        </div>

                    </div>

                </td>


                <td>

                    <div class="school-address">
                        ${escapeHtml(
                            school.address ||
                            "-"
                        )}
                    </div>

                </td>


                <td>

                    <div class="contact-info">
                        ${escapeHtml(
                            school.contact ||
                            "-"
                        )}
                    </div>

                </td>


                <td>

                    <div class="email-info">
                        ${escapeHtml(
                            school.email ||
                            "-"
                        )}
                    </div>

                </td>


                <td>

                    <span class="students-number">
                        ${school.student_count ?? 0}
                    </span>

                </td>


                <td>

                    <span
                        class="status-badge status-${status}"
                    >
                        ${escapeHtml(
                            status
                        )}
                    </span>

                </td>


                <td>

                    <button
                        type="button"
                        class="edit-button"
                        data-edit-id="${school.id}"
                    >
                        Edit
                    </button>

                </td>

            `;


            schoolsTableBody.appendChild(
                row
            );

        }
    );


    document
        .querySelectorAll(
            "[data-edit-id]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        openEditSchool(
                            button.dataset.editId
                        );

                    }
                );

            }
        );

}



/* =========================================
   FILTER
========================================= */

function filterSchools() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const status =
        statusFilter.value;


    const filtered =
        allSchools.filter(
            school => {

                const searchableText = [

                    school.name,

                    school.address,

                    school.contact,

                    school.email

                ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchableText.includes(
                        search
                    );


                const matchesStatus =
                    !status ||
                    school.status ===
                    status;


                return (
                    matchesSearch &&
                    matchesStatus
                );

            }
        );


    renderSchools(
        filtered
    );

}



/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(
    value
) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}



/* =========================================
   OPEN ADD MODAL
========================================= */

function openAddSchool() {

    schoolForm.reset();


    document.getElementById(
        "editSchoolId"
    ).value = "";


    modalTitle.textContent =
        "Add New School";


    saveSchoolButton.textContent =
        "Save School";


    schoolModal.classList.add(
        "show"
    );

}



/* =========================================
   OPEN EDIT MODAL
========================================= */

async function openEditSchool(
    id
) {

    try {

        const data =
            await apiRequest(
                `${API_URL}/schools/${id}`
            );


        const school =
            data.data;


        document.getElementById(
            "editSchoolId"
        ).value =
            school.id;


        document.getElementById(
            "schoolName"
        ).value =
            school.name || "";


        document.getElementById(
            "schoolAddress"
        ).value =
            school.address || "";


        document.getElementById(
            "schoolContact"
        ).value =
            school.contact || "";


        document.getElementById(
            "schoolEmail"
        ).value =
            school.email || "";


        document.getElementById(
            "schoolStatus"
        ).value =
            school.status ||
            "active";


        modalTitle.textContent =
            "Edit School";


        saveSchoolButton.textContent =
            "Update School";


        schoolModal.classList.add(
            "show"
        );


    } catch (error) {

        showMessage(
            error.message,
            "error"
        );

    }

}



/* =========================================
   CLOSE MODAL
========================================= */

function closeSchoolModal() {

    schoolModal.classList.remove(
        "show"
    );

    schoolForm.reset();

}



/* =========================================
   SAVE SCHOOL
========================================= */

async function saveSchool(
    event
) {

    event.preventDefault();


    const editId =
        document.getElementById(
            "editSchoolId"
        ).value;


    const name =
        document.getElementById(
            "schoolName"
        ).value.trim();


    const address =
        document.getElementById(
            "schoolAddress"
        ).value.trim();


    const contact =
        document.getElementById(
            "schoolContact"
        ).value.trim();


    const email =
        document.getElementById(
            "schoolEmail"
        ).value.trim();


    const status =
        document.getElementById(
            "schoolStatus"
        ).value;


    const body = {

        name,

        address:
            address || null,

        contact:
            contact || null,

        email:
            email || null,

        status

    };


    try {

        saveSchoolButton.disabled =
            true;


        saveSchoolButton.textContent =
            editId
                ? "Updating..."
                : "Saving...";


        if (editId) {

            await apiRequest(
                `${API_URL}/schools/${editId}`,
                {
                    method: "PUT",

                    body:
                        JSON.stringify(
                            body
                        )
                }
            );


            showMessage(
                "School updated successfully.",
                "success"
            );


        } else {

            await apiRequest(
                `${API_URL}/schools`,
                {
                    method: "POST",

                    body:
                        JSON.stringify(
                            body
                        )
                }
            );


            showMessage(
                "School added successfully.",
                "success"
            );

        }


        closeSchoolModal();


        await loadSchools();


    } catch (error) {

        console.error(
            "Save school error:",
            error
        );


        showMessage(
            error.message,
            "error"
        );


    } finally {

        saveSchoolButton.disabled =
            false;


        saveSchoolButton.textContent =
            editId
                ? "Update School"
                : "Save School";

    }

}



/* =========================================
   EVENTS
========================================= */

openAddSchoolButton.addEventListener(
    "click",
    openAddSchool
);


closeModal.addEventListener(
    "click",
    closeSchoolModal
);


cancelModal.addEventListener(
    "click",
    closeSchoolModal
);


schoolForm.addEventListener(
    "submit",
    saveSchool
);


searchInput.addEventListener(
    "input",
    filterSchools
);


statusFilter.addEventListener(
    "change",
    filterSchools
);


resetFilters.addEventListener(
    "click",
    () => {

        searchInput.value = "";

        statusFilter.value = "";

        renderSchools(
            allSchools
        );

    }
);



/* =========================================
   CLOSE OUTSIDE
========================================= */

schoolModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            schoolModal
        ) {

            closeSchoolModal();

        }

    }
);



/* =========================================
   ESCAPE
========================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            schoolModal.classList.contains(
                "show"
            )
        ) {

            closeSchoolModal();

        }

    }
);



/* =========================================
   LOGOUT
========================================= */

document
    .getElementById(
        "logoutButton"
    )
    .addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "daura_admin_token"
            );

            localStorage.removeItem(
                "daura_admin_user"
            );

            localStorage.removeItem(
                "daura_role"
            );

            window.location.href =
                "login.html";

        }
    );



/* =========================================
   COMING SOON
========================================= */

document
    .querySelectorAll(
        "[data-coming-soon]"
    )
    .forEach(
        element => {

            element.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    alert(
                       "This section will be activated in the next module."
                    );

                }
            );

        }
    );



/* =========================================
   INITIALIZE
========================================= */

loadSchools();