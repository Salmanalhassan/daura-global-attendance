/* =========================================================
   DAURA GLOBALTECHNOLOGY
   GLOBAL FRONTEND JAVASCRIPT
   ========================================================= */


/* =========================================================
   API
   ========================================================= */

const API_BASE_URL =
    '/api';


/* =========================================================
   TOKEN MANAGEMENT
   ========================================================= */

function saveToken(token) {

    localStorage.setItem(
        'daura_global_token',
        token
    );

}


function getToken() {

    return localStorage.getItem(
        'daura_global_token'
    );

}


function removeToken() {

    localStorage.removeItem(
        'daura_global_token'
    );

}


/* =========================================================
   USER MANAGEMENT
   ========================================================= */

function saveUser(user) {

    localStorage.setItem(
        'daura_global_user',
        JSON.stringify(user)
    );

}


function getUser() {

    const user =
        localStorage.getItem(
            'daura_global_user'
        );


    if (!user) {

        return null;

    }


    try {

        return JSON.parse(user);

    } catch (error) {

        return null;

    }

}


function removeUser() {

    localStorage.removeItem(
        'daura_global_user'
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

    removeToken();

    removeUser();

    window.location.href = '/';

}


/* =========================================================
   API REQUEST
   ========================================================= */

async function apiRequest(
    endpoint,
    options = {}
) {

    const token =
        getToken();


    const headers = {

        'Content-Type':
            'application/json',

        ...(options.headers || {})

    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers
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
        response.status === 401
    ) {

        removeToken();

        removeUser();

        window.location.href = '/';

        throw new Error(
            'Your session has expired'
        );

    }


    if (!response.ok) {

        throw new Error(
            data.message ||
            'Request failed'
        );

    }


    return data;

}


/* =========================================================
   LOGIN CHECK
   ========================================================= */

function requireLogin() {

    if (!getToken()) {

        window.location.href = '/';

        return false;

    }


    return true;

}


/* =========================================================
   ROLE CHECK
   ========================================================= */

function requireRole(role) {

    const user =
        getUser();


    if (!user) {

        window.location.href = '/';

        return false;

    }


    if (
        user.role !== role
    ) {

        window.location.href = '/';

        return false;

    }


    return true;

}


/* =========================================================
   CURRENT YEAR
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        const currentYear =
            document.getElementById(
                'currentYear'
            );


        if (currentYear) {

            currentYear.textContent =
                new Date().getFullYear();

        }

    }
);