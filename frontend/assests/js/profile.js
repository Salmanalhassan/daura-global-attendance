document.addEventListener(
    'DOMContentLoaded',
    async () => {


        // =================================================
        // AUTH
        // =================================================

        if (
            !requireLogin() ||
            !requireRole('student')
        ) {
            return;
        }


        // =================================================
        // USER
        // =================================================

        const user = getUser();


        // =================================================
        // ELEMENTS
        // =================================================

        const studentName =
            document.getElementById(
                'studentName'
            );

        const studentAvatar =
            document.getElementById(
                'studentAvatar'
            );

        const largeAvatar =
            document.getElementById(
                'largeAvatar'
            );

        const refreshBtn =
            document.getElementById(
                'refreshBtn'
            );

        const logoutBtn =
            document.getElementById(
                'logoutBtn'
            );

        const profileMessage =
            document.getElementById(
                'profileMessage'
            );

        const loadingState =
            document.getElementById(
                'loadingState'
            );

        const profileContent =
            document.getElementById(
                'profileContent'
            );

        const fullName =
            document.getElementById(
                'fullName'
            );

        const studentId =
            document.getElementById(
                'studentId'
            );

        const accountStatus =
            document.getElementById(
                'accountStatus'
            );

        const profileFullName =
            document.getElementById(
                'profileFullName'
            );

        const profileStudentId =
            document.getElementById(
                'profileStudentId'
            );

        const registrationNumber =
            document.getElementById(
                'registrationNumber'
            );

        const email =
            document.getElementById(
                'email'
            );

        const phone =
            document.getElementById(
                'phone'
            );

        const schoolName =
            document.getElementById(
                'schoolName'
            );

        const department =
            document.getElementById(
                'department'
            );

        const course =
            document.getElementById(
                'course'
            );

        const batchName =
            document.getElementById(
                'batchName'
            );

        const startDate =
            document.getElementById(
                'startDate'
            );

        const endDate =
            document.getElementById(
                'endDate'
            );

        const siwesStatus =
            document.getElementById(
                'siwesStatus'
            );

        const profileStatus =
            document.getElementById(
                'profileStatus'
            );

            // =================================================
// PASSWORD ELEMENTS
// =================================================

const changePasswordForm =
    document.getElementById(
        'changePasswordForm'
    );

const currentPassword =
    document.getElementById(
        'currentPassword'
    );

const newPassword =
    document.getElementById(
        'newPassword'
    );

const confirmPassword =
    document.getElementById(
        'confirmPassword'
    );

const changePasswordBtn =
    document.getElementById(
        'changePasswordBtn'
    );

const passwordMessage =
    document.getElementById(
        'passwordMessage'
    );

        // =================================================
        // STUDENT NAME FROM LOCAL STORAGE
        // =================================================

        if (user) {

            const name =
                user.full_name ||
                user.student_id ||
                'Student';


            if (studentName) {

                studentName.textContent =
                    name;

            }


            if (studentAvatar) {

                studentAvatar.textContent =
                    name
                        .charAt(0)
                        .toUpperCase();

            }


            if (largeAvatar) {

                largeAvatar.textContent =
                    name
                        .charAt(0)
                        .toUpperCase();

            }

        }


        // =================================================
        // MESSAGE
        // =================================================

        function showMessage(message) {

            if (!profileMessage) {
                return;
            }

            profileMessage.textContent =
                message;

            profileMessage.hidden =
                false;

        }


        function hideMessage() {

            if (!profileMessage) {
                return;
            }

            profileMessage.textContent =
                '';

            profileMessage.hidden =
                true;

        }


        // =================================================
        // DATE FORMAT
        // =================================================

        function formatDate(value) {

            if (!value) {
                return '-';
            }


            const dateString =
                String(value).substring(
                    0,
                    10
                );


            const parts =
                dateString.split('-');


            if (parts.length !== 3) {
                return dateString;
            }


            return `${parts[2]}/${parts[1]}/${parts[0]}`;

        }


        // =================================================
        // STATUS FORMAT
        // =================================================

        function formatStatus(status) {

            if (!status) {
                return '-';
            }


            const text =
                String(status);


            return (
                text.charAt(0).toUpperCase() +
                text.slice(1)
            );

        }


        // =================================================
        // LOAD PROFILE
        // =================================================

        async function loadProfile() {

            hideMessage();


            if (loadingState) {

                loadingState.hidden =
                    false;

            }


            if (profileContent) {

                profileContent.hidden =
                    true;

            }


            try {

                console.log(
                    'Loading student profile...'
                );


                const response =
                    await apiRequest(
                        '/students/my-profile'
                    );


                console.log(
                    'Student profile:',
                    response
                );


                if (!response.success) {

                    throw new Error(
                        response.message ||
                        'Failed to load profile'
                    );

                }


                /*
                 * Support the current backend
                 * response structure and also
                 * nested data if present.
                 */

                const student =
                    response.student ||
                    response.data?.student ||
                    response.data ||
                    null;


                const school =
                    response.school ||
                    response.data?.school ||
                    student?.school ||
                    null;


                const batch =
                    response.siwes_batch ||
                    response.data?.siwes_batch ||
                    student?.siwes_batch ||
                    null;


                if (!student) {

                    throw new Error(
                        'Student profile data not found'
                    );

                }


                // =================================================
                // NAME
                // =================================================

                const name =
                    student.full_name ||
                    student.student_id ||
                    'Student';


                if (studentName) {

                    studentName.textContent =
                        name;

                }


                if (largeAvatar) {

                    largeAvatar.textContent =
                        name
                            .charAt(0)
                            .toUpperCase();

                }


                if (studentAvatar) {

                    studentAvatar.textContent =
                        name
                            .charAt(0)
                            .toUpperCase();

                }


                if (fullName) {

                    fullName.textContent =
                        student.full_name ||
                        '-';

                }


                if (profileFullName) {

                    profileFullName.textContent =
                        student.full_name ||
                        '-';

                }


                // =================================================
                // STUDENT ID
                // =================================================

                if (studentId) {

                    studentId.textContent =
                        student.student_id ||
                        '-';

                }


                if (profileStudentId) {

                    profileStudentId.textContent =
                        student.student_id ||
                        '-';

                }


                // =================================================
                // REGISTRATION NUMBER
                // =================================================

                if (registrationNumber) {

                    registrationNumber.textContent =
                        student.registration_number ||
                        '-';

                }


                // =================================================
                // EMAIL
                // =================================================

                if (email) {

                    email.textContent =
                        student.email ||
                        '-';

                }


                // =================================================
                // PHONE
                // =================================================

                if (phone) {

                    phone.textContent =
                        student.phone ||
                        '-';

                }


                // =================================================
                // SCHOOL
                // =================================================

                if (schoolName) {

                    schoolName.textContent =
                        school?.name ||
                        '-';

                }


                // =================================================
                // DEPARTMENT
                // =================================================

                if (department) {

                    department.textContent =
                        student.department ||
                        '-';

                }


                // =================================================
                // COURSE
                // =================================================

                if (course) {

                    course.textContent =
                        student.course ||
                        '-';

                }


                // =================================================
                // BATCH
                // =================================================

                if (batchName) {

                    batchName.textContent =
                        batch?.name ||
                        '-';

                }


                // =================================================
                // DATES
                // =================================================

                if (startDate) {

                    startDate.textContent =
                        formatDate(
                            student.start_date
                        );

                }


                if (endDate) {

                    endDate.textContent =
                        formatDate(
                            student.end_date
                        );

                }


                // =================================================
                // STATUS
                // =================================================

                const status =
                    student.status ||
                    null;


                if (accountStatus) {

                    accountStatus.textContent =
                        formatStatus(status);

                }


                if (profileStatus) {

                    profileStatus.textContent =
                        formatStatus(status);

                }


                if (siwesStatus) {

                    siwesStatus.textContent =
                        formatStatus(
                            batch?.status ||
                            status
                        );

                }


                // =================================================
                // SHOW CONTENT
                // =================================================

                if (loadingState) {

                    loadingState.hidden =
                        true;

                }


                if (profileContent) {

                    profileContent.hidden =
                        false;

                }


            } catch (error) {

                console.error(
                    'Profile error:',
                    error
                );


                if (loadingState) {

                    loadingState.hidden =
                        true;

                }


                if (profileContent) {

                    profileContent.hidden =
                        true;

                }


                showMessage(
                    error.message ||
                    'Failed to load profile information.'
                );

            }

        }


        // =================================================
        // REFRESH
        // =================================================

        if (refreshBtn) {

            refreshBtn.addEventListener(
                'click',
                loadProfile
            );

        }


        // =================================================
        // LOGOUT
        // =================================================

        if (logoutBtn) {

            logoutBtn.addEventListener(
                'click',
                logout
            );

        }


        // =================================================
// CHANGE PASSWORD
// =================================================

if (changePasswordForm) {

    changePasswordForm.addEventListener(
        'submit',
        async (event) => {

            event.preventDefault();


            // =========================================
            // VALUES
            // =========================================

            const current =
                currentPassword?.value.trim();

            const newPass =
                newPassword?.value.trim();

            const confirm =
                confirmPassword?.value.trim();


            // =========================================
            // CLEAR MESSAGE
            // =========================================

            if (passwordMessage) {

                passwordMessage.textContent =
                    '';

                passwordMessage.className =
                    'password-message';

                passwordMessage.hidden =
                    true;

            }


            // =========================================
            // VALIDATION
            // =========================================

            if (
                !current ||
                !newPass ||
                !confirm
            ) {

                showPasswordMessage(
                    'Please fill in all password fields.',
                    'error'
                );

                return;

            }


            if (newPass.length < 6) {

                showPasswordMessage(
                    'New password must be at least 6 characters long.',
                    'error'
                );

                return;

            }


            if (newPass !== confirm) {

                showPasswordMessage(
                    'New password and confirm password do not match.',
                    'error'
                );

                return;

            }


            // =========================================
            // DISABLE BUTTON
            // =========================================

            if (changePasswordBtn) {

                changePasswordBtn.disabled =
                    true;

                changePasswordBtn.textContent =
                    'Changing Password...';

            }


            try {

                const response =
                    await apiRequest(
                        '/students/change-password',
                        {
                            method: 'PUT',

                            body: JSON.stringify({
                                current_password:
                                    current,

                                new_password:
                                    newPass,

                                confirm_password:
                                    confirm
                            })
                        }
                    );


                // =====================================
                // SUCCESS
                // =====================================

                if (!response.success) {

                    throw new Error(
                        response.message ||
                        'Failed to change password'
                    );

                }


                showPasswordMessage(
                    response.message ||
                    'Password changed successfully.',
                    'success'
                );


                // =====================================
                // CLEAR FORM
                // =====================================

                if (changePasswordForm) {

                    changePasswordForm.reset();

                }


            } catch (error) {

                console.error(
                    'Change password error:',
                    error
                );


                showPasswordMessage(
                    error.message ||
                    'Failed to change password.',
                    'error'
                );


            } finally {

                if (changePasswordBtn) {

                    changePasswordBtn.disabled =
                        false;

                    changePasswordBtn.textContent =
                        '🔐 Change Password';

                }

            }

        }
    );

}


// =================================================
// PASSWORD MESSAGE
// =================================================

function showPasswordMessage(
    message,
    type
) {

    if (!passwordMessage) {
        return;
    }


    passwordMessage.textContent =
        message;


    passwordMessage.className =
        `password-message ${type}`;


    passwordMessage.hidden =
        false;

}
        // =================================================
        // INITIAL LOAD
        // =================================================

        await loadProfile();

    }
);