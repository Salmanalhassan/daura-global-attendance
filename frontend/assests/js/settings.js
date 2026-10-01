// ==========================================
// ADMIN SETTINGS
// DAURA GLOBALTECHNOLOGY
// ==========================================


// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

// Admin Login yana ajiye token a wannan key.
const adminToken =
    localStorage.getItem('daura_admin_token');


// Admin Login yana ajiye user a wannan key.
const adminUserRaw =
    localStorage.getItem('daura_admin_user');


// Parse saved admin user safely.
let adminUser = null;

try {

    if (adminUserRaw) {

        adminUser =
            JSON.parse(adminUserRaw);

    }

} catch (error) {

    console.error(
        'Failed to read admin user:',
        error
    );

    adminUser = null;

}


// ==========================================
// AUTH CHECK
// ==========================================

// IMPORTANT:
// We only check for the admin token here.
//
// We do NOT check:
// adminUser.role
//
// because the login response may not include
// role inside data.user even though the JWT
// itself is a valid admin token.

if (!adminToken) {

    window.location.href =
        'login.html';

}


// ==========================================
// API CONFIGURATION
// ==========================================

const SETTINGS_API_BASE_URL =
    '/api';


// ==========================================
// ADMIN API REQUEST
// ==========================================

async function adminApiRequest(
    endpoint,
    options = {}
) {

    const token =
        localStorage.getItem(
            'daura_admin_token'
        );


    // ======================================
    // TOKEN CHECK
    // ======================================

    if (!token) {

        window.location.href =
            'login.html';

        throw new Error(
            'Admin authentication required.'
        );

    }


    // ======================================
    // HEADERS
    // ======================================

    const headers = {

        'Content-Type':
            'application/json',

        ...(options.headers || {})

    };


    headers.Authorization =
        `Bearer ${token}`;


    // ======================================
    // REQUEST
    // ======================================

    const response =
        await fetch(
            `${SETTINGS_API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers
            }
        );


    // ======================================
    // RESPONSE
    // ======================================

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


    // ======================================
    // SESSION EXPIRED
    // ======================================

    if (
        response.status === 401
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
            'login.html';


        throw new Error(
            'Your admin session has expired.'
        );

    }


    // ======================================
    // FORBIDDEN
    // ======================================

    if (
        response.status === 403
    ) {

        throw new Error(
            data.message ||
            'Admin access required.'
        );

    }


    // ======================================
    // OTHER ERRORS
    // ======================================

    if (!response.ok) {

        throw new Error(
            data.message ||
            'Request failed'
        );

    }


    return data;

}


// ==========================================
// ELEMENTS
// ==========================================

const profileForm =
    document.getElementById(
        'profileForm'
    );


const passwordForm =
    document.getElementById(
        'passwordForm'
    );


const fullNameInput =
    document.getElementById(
        'fullName'
    );


const usernameInput =
    document.getElementById(
        'username'
    );


const currentPasswordInput =
    document.getElementById(
        'currentPassword'
    );


const newPasswordInput =
    document.getElementById(
        'newPassword'
    );


const confirmPasswordInput =
    document.getElementById(
        'confirmPassword'
    );


const messageBox =
    document.getElementById(
        'messageBox'
    );


const logoutBtn =
    document.getElementById(
        'logoutBtn'
    );


// ==========================================
// MESSAGE
// ==========================================

function showMessage(
    message,
    type = 'success'
) {

    if (!messageBox) {

        return;

    }


    messageBox.textContent =
        message;


    messageBox.classList.remove(
        'hidden',
        'success',
        'error'
    );


    messageBox.classList.add(
        type
    );


    setTimeout(() => {

        messageBox.classList.add(
            'hidden'
        );

    }, 4000);

}


// ==========================================
// LOAD ADMIN PROFILE
// ==========================================

async function loadProfile() {

    try {

        const result =
            await adminApiRequest(
                '/admin/profile'
            );


        if (!result) {

            return;

        }


        const admin =
            result.admin || {};


        if (fullNameInput) {

            fullNameInput.value =
                admin.full_name || '';

        }


        if (usernameInput) {

            usernameInput.value =
                admin.username || '';

        }


        // ==================================
        // UPDATE SAVED ADMIN USER
        // ==================================

        const savedUser =
            localStorage.getItem(
                'daura_admin_user'
            );


        if (savedUser) {

            try {

                const user =
                    JSON.parse(
                        savedUser
                    );


                user.id =
                    admin.id ||
                    user.id;


                user.full_name =
                    admin.full_name ||
                    user.full_name;


                user.username =
                    admin.username ||
                    user.username;


                // If backend profile confirms
                // admin, keep the role.

                user.role =
                    user.role ||
                    'admin';


                localStorage.setItem(
                    'daura_admin_user',
                    JSON.stringify(user)
                );


            } catch (error) {

                console.error(
                    'Failed to update admin user:',
                    error
                );

            }

        }


    } catch (error) {

        console.error(
            'Load profile error:',
            error
        );


        showMessage(
            error.message ||
            'Failed to load profile.',
            'error'
        );

    }

}


// ==========================================
// UPDATE PROFILE
// ==========================================

if (profileForm) {

    profileForm.addEventListener(
        'submit',
        async (event) => {

            event.preventDefault();


            const full_name =
                fullNameInput.value.trim();


            const username =
                usernameInput.value.trim();


            // ==================================
            // VALIDATION
            // ==================================

            if (
                !full_name ||
                !username
            ) {

                showMessage(
                    'Full name and username are required.',
                    'error'
                );

                return;

            }


            const button =
                profileForm.querySelector(
                    'button'
                );


            button.disabled =
                true;


            button.textContent =
                'Updating...';


            try {

                const result =
                    await adminApiRequest(
                        '/admin/profile',
                        {
                            method: 'PUT',

                            body:
                                JSON.stringify({
                                    full_name,
                                    username
                                })
                        }
                    );


                if (!result) {

                    return;

                }


                showMessage(
                    result.message ||
                    'Profile updated successfully.',
                    'success'
                );


                // ==================================
                // UPDATE LOCAL ADMIN USER
                // ==================================

                const savedUserRaw =
                    localStorage.getItem(
                        'daura_admin_user'
                    );


                if (savedUserRaw) {

                    try {

                        const savedUser =
                            JSON.parse(
                                savedUserRaw
                            );


                        savedUser.full_name =
                            full_name;


                        savedUser.username =
                            username;


                        localStorage.setItem(
                            'daura_admin_user',
                            JSON.stringify(
                                savedUser
                            )
                        );


                    } catch (error) {

                        console.error(
                            'Failed to update local admin user:',
                            error
                        );

                    }

                }


            } catch (error) {

                console.error(
                    'Update profile error:',
                    error
                );


                showMessage(
                    error.message ||
                    'Failed to update profile.',
                    'error'
                );


            } finally {

                button.disabled =
                    false;


                button.textContent =
                    'Update Profile';

            }

        }
    );

}


// ==========================================
// CHANGE PASSWORD
// ==========================================

if (passwordForm) {

    passwordForm.addEventListener(
        'submit',
        async (event) => {

            event.preventDefault();


            const current_password =
                currentPasswordInput.value;


            const new_password =
                newPasswordInput.value;


            const confirm_password =
                confirmPasswordInput.value;


            // ==================================
            // VALIDATION
            // ==================================

            if (
                !current_password ||
                !new_password ||
                !confirm_password
            ) {

                showMessage(
                    'Please fill in all password fields.',
                    'error'
                );

                return;

            }


            if (
                new_password !==
                confirm_password
            ) {

                showMessage(
                    'New passwords do not match.',
                    'error'
                );

                return;

            }


            if (
                new_password.length < 6
            ) {

                showMessage(
                    'New password must be at least 6 characters.',
                    'error'
                );

                return;

            }


            const button =
                passwordForm.querySelector(
                    'button'
                );


            button.disabled =
                true;


            button.textContent =
                'Changing...';


            try {

                const result =
                    await adminApiRequest(
                        '/admin/change-password',
                        {
                            method: 'PUT',

                            body:
                                JSON.stringify({
                                    current_password,
                                    new_password
                                })
                        }
                    );


                if (!result) {

                    return;

                }


                showMessage(
                    result.message ||
                    'Password changed successfully.',
                    'success'
                );


                passwordForm.reset();


            } catch (error) {

                console.error(
                    'Change password error:',
                    error
                );


                showMessage(
                    error.message ||
                    'Failed to change password.',
                    'error'
                );


            } finally {

                button.disabled =
                    false;


                button.textContent =
                    'Change Password';

            }

        }
    );

}


// =========================================================
// PAYMENT SETTINGS
// =========================================================


// ==========================================
// LOAD PAYMENT SETTINGS
// ==========================================

async function loadPaymentSettings() {

    try {

        const result =
            await adminApiRequest(
                '/payment-settings'
            );


        if (!result) {

            return;

        }


        const data =
            result.data || {};


        // ==================================
        // OPAY
        // ==================================

        const opayName =
            document.getElementById(
                'opayAccountName'
            );


        const opayNumber =
            document.getElementById(
                'opayAccountNumber'
            );


        // ==================================
        // MONIEPOINT
        // ==================================

        const moniepointName =
            document.getElementById(
                'moniepointAccountName'
            );


        const moniepointNumber =
            document.getElementById(
                'moniepointAccountNumber'
            );


        // ==================================
        // FILL VALUES
        // ==================================

        if (opayName) {

            opayName.value =
                data.opay_account_name || '';

        }


        if (opayNumber) {

            opayNumber.value =
                data.opay_account_number || '';

        }


        if (moniepointName) {

            moniepointName.value =
                data.moniepoint_account_name || '';

        }


        if (moniepointNumber) {

            moniepointNumber.value =
                data.moniepoint_account_number || '';

        }


    } catch (error) {

        console.error(
            'Load payment settings error:',
            error
        );


        showMessage(
            error.message ||
            'Failed to load payment settings.',
            'error'
        );

    }

}


// ==========================================
// PAYMENT SETTINGS FORM
// ==========================================

const paymentSettingsForm =
    document.getElementById(
        'paymentSettingsForm'
    );


if (paymentSettingsForm) {

    paymentSettingsForm.addEventListener(
        'submit',
        async (event) => {

            event.preventDefault();


            // ==================================
            // VALUES
            // ==================================

            const opayAccountName =
                document.getElementById(
                    'opayAccountName'
                ).value.trim();


            const opayAccountNumber =
                document.getElementById(
                    'opayAccountNumber'
                ).value.trim();


            const moniepointAccountName =
                document.getElementById(
                    'moniepointAccountName'
                ).value.trim();


            const moniepointAccountNumber =
                document.getElementById(
                    'moniepointAccountNumber'
                ).value.trim();


            const button =
                document.getElementById(
                    'savePaymentSettingsBtn'
                );


            // ==================================
            // OPAY VALIDATION
            // ==================================

            if (
                (
                    opayAccountName &&
                    !opayAccountNumber
                ) ||
                (
                    !opayAccountName &&
                    opayAccountNumber
                )
            ) {

                showMessage(
                    'Please provide both OPay account name and account number.',
                    'error'
                );

                return;

            }


            // ==================================
            // MONIEPOINT VALIDATION
            // ==================================

            if (
                (
                    moniepointAccountName &&
                    !moniepointAccountNumber
                ) ||
                (
                    !moniepointAccountName &&
                    moniepointAccountNumber
                )
            ) {

                showMessage(
                    'Please provide both Moniepoint account name and account number.',
                    'error'
                );

                return;

            }


            // ==================================
            // BUTTON
            // ==================================

            button.disabled =
                true;


            button.textContent =
                'Saving...';


            try {

                const result =
                    await adminApiRequest(
                        '/payment-settings',
                        {
                            method: 'PUT',

                            body:
                                JSON.stringify({

                                    opay_account_name:
                                        opayAccountName,

                                    opay_account_number:
                                        opayAccountNumber,

                                    moniepoint_account_name:
                                        moniepointAccountName,

                                    moniepoint_account_number:
                                        moniepointAccountNumber

                                })
                        }
                    );


                if (!result) {

                    return;

                }


                showMessage(
                    result.message ||
                    'Payment settings saved successfully.',
                    'success'
                );


            } catch (error) {

                console.error(
                    'Save payment settings error:',
                    error
                );


                showMessage(
                    error.message ||
                    'Failed to save payment settings.',
                    'error'
                );


            } finally {

                button.disabled =
                    false;


                button.textContent =
                    'Save Payment Settings';

            }

        }
    );

}


// ==========================================
// LOGOUT
// ==========================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        'click',
        () => {

            // Remove Admin authentication

            localStorage.removeItem(
                'daura_admin_token'
            );


            localStorage.removeItem(
                'daura_admin_user'
            );


            localStorage.removeItem(
                'daura_role'
            );


            // Remove global authentication
            // too, if any exists.

            localStorage.removeItem(
                'daura_global_token'
            );


            localStorage.removeItem(
                'daura_global_user'
            );


            window.location.href =
                'login.html';

        }
    );

}


// ==========================================
// INITIAL LOAD
// ==========================================

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        await loadProfile();

        await loadPaymentSettings();

    }
);