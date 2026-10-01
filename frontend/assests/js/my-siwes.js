document.addEventListener(
    'DOMContentLoaded',
    async () => {

        // ==========================================
        // AUTH
        // ==========================================

        if (
            !requireLogin() ||
            !requireRole('student')
        ) {
            return;
        }


        // ==========================================
        // USER
        // ==========================================

        const user = getUser();


        // ==========================================
        // ELEMENTS
        // ==========================================

        const studentName =
            document.getElementById(
                'studentName'
            );

        const studentAvatar =
            document.getElementById(
                'studentAvatar'
            );

        const refreshBtn =
            document.getElementById(
                'refreshBtn'
            );

        const logoutBtn =
            document.getElementById(
                'logoutBtn'
            );

        const siwesMessage =
            document.getElementById(
                'siwesMessage'
            );

        const loadingState =
            document.getElementById(
                'loadingState'
            );

        const siwesContent =
            document.getElementById(
                'siwesContent'
            );

        const batchName =
            document.getElementById(
                'batchName'
            );

        const batchDescription =
            document.getElementById(
                'batchDescription'
            );

        const siwesStatus =
            document.getElementById(
                'siwesStatus'
            );

        const trainingPeriod =
            document.getElementById(
                'trainingPeriod'
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

        const registrationNumber =
            document.getElementById(
                'registrationNumber'
            );

        const startDate =
            document.getElementById(
                'startDate'
            );

        const endDate =
            document.getElementById(
                'endDate'
            );

        const description =
            document.getElementById(
                'description'
            );


        // ==========================================
        // STUDENT NAME
        // ==========================================

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

        }


        // ==========================================
        // MESSAGE
        // ==========================================

        function showMessage(message) {

            if (!siwesMessage) {
                return;
            }

            siwesMessage.textContent =
                message;

            siwesMessage.hidden =
                false;

        }


        function hideMessage() {

            if (!siwesMessage) {
                return;
            }

            siwesMessage.textContent =
                '';

            siwesMessage.hidden =
                true;

        }


        // ==========================================
        // DATE FORMAT
        // ==========================================

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


        // ==========================================
        // STATUS FORMAT
        // ==========================================

        function formatStatus(status) {

            if (!status) {
                return '-';
            }


            const text =
                String(status);


            return (
                text
                    .charAt(0)
                    .toUpperCase() +
                text.slice(1)
            );

        }


        // ==========================================
        // LOAD SIWES
        // ==========================================

        async function loadSIWES() {

            hideMessage();


            if (loadingState) {

                loadingState.hidden =
                    false;

            }


            if (siwesContent) {

                siwesContent.hidden =
                    true;

            }


            try {

                console.log(
                    'Loading SIWES information...'
                );


                const response =
                    await apiRequest(
                        '/students/my-siwes'
                    );


                console.log(
                    'SIWES response:',
                    response
                );


                if (
                    !response.success
                ) {

                    throw new Error(
                        response.message ||
                        'Failed to load SIWES information'
                    );

                }


                /*
                 * Backend response is expected
                 * to contain:
                 *
                 * response.student
                 * response.school
                 * response.siwes_batch
                 */


                const student =
                    response.student ||
                    response.data?.student ||
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


                // ==================================
                // STUDENT DATA
                // ==================================

                if (department) {

                    department.textContent =
                        student?.department ||
                        '-';

                }


                if (course) {

                    course.textContent =
                        student?.course ||
                        '-';

                }


                if (registrationNumber) {

                    registrationNumber.textContent =
                        student?.registration_number ||
                        '-';

                }


                if (startDate) {

                    startDate.textContent =
                        formatDate(
                            student?.start_date
                        );

                }


                if (endDate) {

                    endDate.textContent =
                        formatDate(
                            student?.end_date
                        );

                }


                // ==================================
                // SCHOOL
                // ==================================

                if (schoolName) {

                    schoolName.textContent =
                        school?.name ||
                        '-';

                }


                // ==================================
                // BATCH
                // ==================================

                if (batchName) {

                    batchName.textContent =
                        batch?.name ||
                        'SIWES Batch';

                }


                if (batchDescription) {

                    batchDescription.textContent =
                        batch?.description ||
                        'Your SIWES training information';

                }


                if (description) {

                    description.textContent =
                        batch?.description ||
                        'No description available.';

                }


                // ==================================
                // STATUS
                // ==================================

                const status =
                    student?.status ||
                    batch?.status ||
                    null;


                if (siwesStatus) {

                    siwesStatus.textContent =
                        formatStatus(status);

                }


                // ==================================
                // TRAINING PERIOD
                // ==================================

                if (trainingPeriod) {

                    const start =
                        formatDate(
                            student?.start_date
                        );

                    const end =
                        formatDate(
                            student?.end_date
                        );


                    if (
                        start !== '-' &&
                        end !== '-'
                    ) {

                        trainingPeriod.textContent =
                            `${start} - ${end}`;

                    } else {

                        trainingPeriod.textContent =
                            '-';

                    }

                }


                // ==================================
                // SHOW CONTENT
                // ==================================

                if (loadingState) {

                    loadingState.hidden =
                        true;

                }


                if (siwesContent) {

                    siwesContent.hidden =
                        false;

                }


            } catch (error) {

                console.error(
                    'My SIWES error:',
                    error
                );


                if (loadingState) {

                    loadingState.hidden =
                        true;

                }


                if (siwesContent) {

                    siwesContent.hidden =
                        true;

                }


                showMessage(
                    error.message ||
                    'Failed to load SIWES information.'
                );

            }

        }


        // ==========================================
        // REFRESH
        // ==========================================

        if (refreshBtn) {

            refreshBtn.addEventListener(
                'click',
                loadSIWES
            );

        }


        // ==========================================
        // LOGOUT
        // ==========================================

        if (logoutBtn) {

            logoutBtn.addEventListener(
                'click',
                logout
            );

        }


        // ==========================================
        // INITIAL LOAD
        // ==========================================

        await loadSIWES();

    }
);