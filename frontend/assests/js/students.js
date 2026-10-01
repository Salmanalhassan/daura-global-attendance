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
   DOM ELEMENTS
========================================= */

const studentsTableBody =
    document.getElementById("studentsTableBody");

const searchInput =
    document.getElementById("searchInput");

const schoolFilter =
    document.getElementById("schoolFilter");

const statusFilter =
    document.getElementById("statusFilter");

const resetFilters =
    document.getElementById("resetFilters");

const studentCount =
    document.getElementById("studentCount");

const studentModal =
    document.getElementById("studentModal");

const openAddStudentButton =
    document.getElementById("openAddStudentButton");

const closeModal =
    document.getElementById("closeModal");

const cancelModal =
    document.getElementById("cancelModal");

const studentForm =
    document.getElementById("studentForm");

const modalTitle =
    document.getElementById("modalTitle");

const saveStudentButton =
    document.getElementById("saveStudentButton");

const pageMessage =
    document.getElementById("pageMessage");



/* =========================================
   DATA
========================================= */

let allStudents = [];

let allSchools = [];

let allBatches = [];



/* =========================================
   ADMIN INFO
========================================= */

function loadAdminInfo() {

    const savedUser =
        localStorage.getItem("daura_admin_user");


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


        if (avatar && name.length > 0) {

            avatar.textContent =
                name.charAt(0).toUpperCase();

        }


    } catch (error) {

        console.error(
            "Failed to read admin data:",
            error
        );

    }

}


loadAdminInfo();



/* =========================================
   API HELPER
========================================= */

async function apiRequest(
    url,
    options = {}
) {

    const response =
        await fetch(url, {

            ...options,

            headers: {

                "Content-Type":
                    "application/json",

                "Authorization":
                    `Bearer ${token}`,

                ...(options.headers || {})

            }

        });


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


    if (!response.ok || !data.success) {

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

let messageTimer;


function showMessage(
    message,
    type = "success"
) {

    clearTimeout(messageTimer);


    pageMessage.textContent =
        message;


    pageMessage.className =
        `page-message ${type}`;


    messageTimer =
        setTimeout(() => {

            pageMessage.className =
                "page-message";

            pageMessage.textContent =
                "";

        }, 5000);

}



/* =========================================
   LOAD SCHOOLS
========================================= */

async function loadSchools() {

    try {

        const data =
            await apiRequest(
                `${API_URL}/schools`
            );


        allSchools =
            data.data || [];


        populateSchoolSelects();


    } catch (error) {

        console.error(
            "Schools error:",
            error
        );

    }

}



/* =========================================
   POPULATE SCHOOL SELECTS
========================================= */

function populateSchoolSelects() {

    schoolFilter.innerHTML = `
        <option value="">
            All Schools
        </option>
    `;


    const schoolSelect =
        document.getElementById(
            "schoolId"
        );


    schoolSelect.innerHTML = `
        <option value="">
            Select School
        </option>
    `;


    allSchools.forEach(school => {

        const optionFilter =
            document.createElement("option");


        optionFilter.value =
            school.id;


        optionFilter.textContent =
            school.name;


        schoolFilter.appendChild(
            optionFilter
        );


        if (
            school.status === "active"
        ) {

            const optionForm =
                document.createElement("option");


            optionForm.value =
                school.id;


            optionForm.textContent =
                school.name;


            schoolSelect.appendChild(
                optionForm
            );

        }

    });

}



/* =========================================
   LOAD BATCHES
========================================= */

async function loadBatches() {

    try {

        const data =
            await apiRequest(
                `${API_URL}/batches`
            );


        allBatches =
            data.data || [];


        populateBatchSelect();


    } catch (error) {

        console.error(
            "Batches error:",
            error
        );

    }

}



/* =========================================
   POPULATE BATCH
========================================= */

function populateBatchSelect() {

    const batchSelect =
        document.getElementById(
            "batchId"
        );


    batchSelect.innerHTML = `
        <option value="">
            Select Batch
        </option>
    `;


    allBatches.forEach(batch => {

        const option =
            document.createElement("option");


        option.value =
            batch.id;


        option.textContent =
            batch.name;


        batchSelect.appendChild(
            option
        );

    });

}



/* =========================================
   LOAD STUDENTS
========================================= */

async function loadStudents() {

    studentsTableBody.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="loading-cell"
            >
                Loading students...
            </td>
        </tr>
    `;


    try {

        const data =
            await apiRequest(
                `${API_URL}/students`
            );


        allStudents =
            data.data || [];


        renderStudents(
            allStudents
        );


    } catch (error) {

        console.error(
            "Students error:",
            error
        );


        studentsTableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="error-cell"
                >
                    Failed to load students.
                    ${error.message}
                </td>
            </tr>
        `;

    }

}



/* =========================================
   RENDER STUDENTS
========================================= */

function renderStudents(
    students
) {

    studentsTableBody.innerHTML = "";


    studentCount.textContent =
        `${students.length} ${
            students.length === 1
                ? "Student"
                : "Students"
        }`;


    if (students.length === 0) {

        studentsTableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-cell"
                >
                    No students found.
                </td>
            </tr>
        `;

        return;

    }


    students.forEach(student => {

        const row =
            document.createElement("tr");


        const school =
            getSchoolName(
                student.school_id
            );


        const firstLetter =
            (
                student.full_name ||
                "S"
            )
            .charAt(0)
            .toUpperCase();


        const status =
            student.status ||
            "active";


        row.innerHTML = `

            <td>

                <div class="student-info">

                    <div class="student-avatar">
                        ${firstLetter}
                    </div>

                    <div>

                        <div class="student-name">
                            ${escapeHtml(
                                student.full_name
                            )}
                        </div>

                        <div class="student-id">
                            ${escapeHtml(
                                student.student_id
                            )}
                        </div>

                    </div>

                </div>

            </td>


            <td>
                ${escapeHtml(
                    student.registration_number ||
                    "-"
                )}
            </td>


            <td>

                <div class="school-name">
                    ${escapeHtml(
                        school
                    )}
                </div>

            </td>


            <td>
                ${escapeHtml(
                    student.department ||
                    "-"
                )}
            </td>


            <td>

                <div class="period">

                    ${formatDate(
                        student.start_date
                    )}

                    <span>
                        to
                        ${formatDate(
                            student.end_date
                        )}
                    </span>

                </div>

            </td>


            <td>

                <span
                    class="status-badge status-${status}"
                >
                    ${status}
                </span>

            </td>


            <td>

                <button
                    type="button"
                    class="edit-button"
                    data-edit-id="${student.id}"
                >
                    Edit
                </button>

            </td>

        `;


        studentsTableBody.appendChild(
            row
        );

    });


    document
        .querySelectorAll(
            "[data-edit-id]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        button.dataset.editId;

                    openEditStudent(
                        id
                    );

                }
            );

        });

}



/* =========================================
   FILTER STUDENTS
========================================= */

function filterStudents() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const school =
        schoolFilter.value;


    const status =
        statusFilter.value;


    const filtered =
        allStudents.filter(student => {


            const matchesSearch =
                !search ||

                (
                    String(
                        student.full_name || ""
                    )
                    .toLowerCase()
                    .includes(search)
                ) ||

                (
                    String(
                        student.student_id || ""
                    )
                    .toLowerCase()
                    .includes(search)
                ) ||

                (
                    String(
                        student.registration_number || ""
                    )
                    .toLowerCase()
                    .includes(search)
                );


            const matchesSchool =
                !school ||
                String(
                    student.school_id
                ) === String(school);


            const matchesStatus =
                !status ||
                student.status === status;


            return (
                matchesSearch &&
                matchesSchool &&
                matchesStatus
            );

        });


    renderStudents(
        filtered
    );

}



/* =========================================
   GET SCHOOL NAME
========================================= */

function getSchoolName(
    schoolId
) {

    const school =
        allSchools.find(
            item =>
                String(item.id) ===
                String(schoolId)
        );


    return school
        ? school.name
        : "Unknown School";

}



/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(
    value
) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}



/* =========================================
   DATE FORMAT
========================================= */

function formatDate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (Number.isNaN(
        date.getTime()
    )) {

        return value;

    }


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}



/* =========================================
   OPEN ADD MODAL
========================================= */

function openAddStudent() {

    studentForm.reset();


    document.getElementById(
        "editStudentId"
    ).value = "";


    modalTitle.textContent =
        "Add New Student";


    saveStudentButton.textContent =
        "Save Student";


    document.getElementById(
        "passwordGroup"
    ).style.display =
        "block";


    document.getElementById(
        "password"
    ).required = true;


    studentModal.classList.add(
        "show"
    );

}



/* =========================================
   OPEN EDIT MODAL
========================================= */

async function openEditStudent(
    id
) {

    try {

        const data =
            await apiRequest(
                `${API_URL}/students/${id}`
            );


        const student =
            data.data;


        document.getElementById(
            "editStudentId"
        ).value =
            student.id;


        document.getElementById(
            "studentId"
        ).value =
            student.student_id || "";


        document.getElementById(
            "fullName"
        ).value =
            student.full_name || "";


        document.getElementById(
            "registrationNumber"
        ).value =
            student.registration_number || "";


        document.getElementById(
            "email"
        ).value =
            student.email || "";


        document.getElementById(
            "phone"
        ).value =
            student.phone || "";


        document.getElementById(
            "schoolId"
        ).value =
            student.school_id || "";


        document.getElementById(
            "department"
        ).value =
            student.department || "";


        document.getElementById(
            "course"
        ).value =
            student.course || "";


        document.getElementById(
            "batchId"
        ).value =
            student.siwes_batch_id || "";


        document.getElementById(
            "status"
        ).value =
            student.status || "active";


        document.getElementById(
            "startDate"
        ).value =
            formatInputDate(
                student.start_date
            );


        document.getElementById(
            "endDate"
        ).value =
            formatInputDate(
                student.end_date
            );


        document.getElementById(
            "password"
        ).value = "";


        document.getElementById(
            "passwordGroup"
        ).style.display =
            "none";


        document.getElementById(
            "password"
        ).required = false;


        modalTitle.textContent =
            "Edit Student";


        saveStudentButton.textContent =
            "Update Student";


        studentModal.classList.add(
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
   INPUT DATE
========================================= */

function formatInputDate(
    value
) {

    if (!value) {
        return "";
    }


    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}/.test(value)
    ) {

        return value.substring(
            0,
            10
        );

    }


    const date =
        new Date(value);


    if (Number.isNaN(
        date.getTime()
    )) {

        return "";

    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}



/* =========================================
   CLOSE MODAL
========================================= */

function closeStudentModal() {

    studentModal.classList.remove(
        "show"
    );

    studentForm.reset();

}



/* =========================================
   SAVE STUDENT
========================================= */

async function saveStudent(
    event
) {

    event.preventDefault();


    const editId =
        document.getElementById(
            "editStudentId"
        ).value;


    const studentId =
        document.getElementById(
            "studentId"
        ).value.trim();


    const fullName =
        document.getElementById(
            "fullName"
        ).value.trim();


    const registrationNumber =
        document.getElementById(
            "registrationNumber"
        ).value.trim();


    const email =
        document.getElementById(
            "email"
        ).value.trim();


    const phone =
        document.getElementById(
            "phone"
        ).value.trim();


    const schoolId =
        document.getElementById(
            "schoolId"
        ).value;


    const department =
        document.getElementById(
            "department"
        ).value.trim();


    const course =
        document.getElementById(
            "course"
        ).value.trim();


    const batchId =
        document.getElementById(
            "batchId"
        ).value;


    const status =
        document.getElementById(
            "status"
        ).value;


    const startDate =
        document.getElementById(
            "startDate"
        ).value;


    const endDate =
        document.getElementById(
            "endDate"
        ).value;


    const password =
        document.getElementById(
            "password"
        ).value;



    /* DATE VALIDATION */

    if (
        startDate &&
        endDate &&
        startDate > endDate
    ) {

        showMessage(
            "SIWES start date cannot be after end date.",
            "error"
        );

        return;

    }



    /* CREATE DATA */

    const body = {

        student_id:
            studentId,

        full_name:
            fullName,

        registration_number:
            registrationNumber,

        email:
            email || null,

        phone:
            phone || null,

        school_id:
            Number(schoolId),

        department:
            department || null,

        course:
            course || null,

        siwes_batch_id:
            batchId
                ? Number(batchId)
                : null,

        start_date:
            startDate,

        end_date:
            endDate,

        status:
            status

    };


    if (!editId) {

        body.password =
            password;

    }



    try {

        saveStudentButton.disabled =
            true;


        saveStudentButton.textContent =
            editId
                ? "Updating..."
                : "Saving...";



        if (editId) {

            await apiRequest(
                `${API_URL}/students/${editId}`,
                {
                    method: "PUT",
                    body: JSON.stringify(
                        body
                    )
                }
            );


            showMessage(
                "Student updated successfully.",
                "success"
            );


        } else {

            await apiRequest(
                `${API_URL}/students`,
                {
                    method: "POST",
                    body: JSON.stringify(
                        body
                    )
                }
            );


            showMessage(
                "Student registered successfully.",
                "success"
            );

        }


        closeStudentModal();


        await loadStudents();


    } catch (error) {

        console.error(
            "Save student error:",
            error
        );


        showMessage(
            error.message,
            "error"
        );


    } finally {

        saveStudentButton.disabled =
            false;


        saveStudentButton.textContent =
            editId
                ? "Update Student"
                : "Save Student";

    }

}



/* =========================================
   EVENTS
========================================= */

openAddStudentButton.addEventListener(
    "click",
    openAddStudent
);


closeModal.addEventListener(
    "click",
    closeStudentModal
);


cancelModal.addEventListener(
    "click",
    closeStudentModal
);


studentForm.addEventListener(
    "submit",
    saveStudent
);


searchInput.addEventListener(
    "input",
    filterStudents
);


schoolFilter.addEventListener(
    "change",
    filterStudents
);


statusFilter.addEventListener(
    "change",
    filterStudents
);


resetFilters.addEventListener(
    "click",
    () => {

        searchInput.value = "";

        schoolFilter.value = "";

        statusFilter.value = "";

        renderStudents(
            allStudents
        );

    }
);



/* =========================================
   CLOSE MODAL OUTSIDE
========================================= */

studentModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            studentModal
        ) {

            closeStudentModal();

        }

    }
);



/* =========================================
   ESC KEY
========================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            studentModal.classList.contains(
                "show"
            )
        ) {

            closeStudentModal();

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
    .forEach(element => {

        element.addEventListener(
            "click",
            event => {

                event.preventDefault();

                alert(
                    "This section will be activated in the next module."
                );

            }
        );

    });



/* =========================================
   INITIAL LOAD
========================================= */

async function initializePage() {

    await Promise.all([
        loadSchools(),
        loadBatches()
    ]);


    await loadStudents();

}


initializePage();