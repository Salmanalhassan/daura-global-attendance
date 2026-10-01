/* =========================================================
   DAURA GLOBALTECHNOLOGY
   STUDENT SCAN QR JAVASCRIPT
   ========================================================= */


/* =========================================================
   AUTH CHECK
   ========================================================= */

if (
    !requireLogin() ||
    !requireRole('student')
) {
    throw new Error(
        'Student authentication required'
    );
}


/* =========================================================
   USER
   ========================================================= */

const currentUser =
    getUser();


/* =========================================================
   ELEMENTS
   ========================================================= */

const studentName =
    document.getElementById(
        'studentName'
    );

const studentAvatar =
    document.getElementById(
        'studentAvatar'
    );

const scannerStatus =
    document.getElementById(
        'scannerStatus'
    );

const attendanceMessage =
    document.getElementById(
        'attendanceMessage'
    );

const startScannerBtn =
    document.getElementById(
        'startScannerBtn'
    );

const stopScannerBtn =
    document.getElementById(
        'stopScannerBtn'
    );

const logoutBtn =
    document.getElementById(
        'logoutBtn'
    );


/* =========================================================
   DISPLAY STUDENT
   ========================================================= */

if (
    currentUser &&
    currentUser.full_name
) {

    studentName.textContent =
        currentUser.full_name;


    studentAvatar.textContent =
        currentUser.full_name
            .trim()
            .charAt(0)
            .toUpperCase();

}


/* =========================================================
   QR SCANNER
   ========================================================= */

let html5QrCode = null;

let scannerRunning = false;

let attendanceSubmitting = false;


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
    message,
    type = 'info'
) {

    attendanceMessage.textContent =
        message;

    attendanceMessage.className =
        `attendance-message ${type}`;

    attendanceMessage.hidden =
        false;

}


function hideMessage() {

    attendanceMessage.hidden =
        true;

}


/* =========================================================
   SCANNER STATUS
   ========================================================= */

function setScannerStatus(
    text
) {

    scannerStatus.textContent =
        text;

}


/* =========================================================
   START SCANNER
   ========================================================= */

async function startScanner() {

    if (scannerRunning) {
        return;
    }


    hideMessage();


    if (
        typeof Html5Qrcode ===
        'undefined'
    ) {

        showMessage(
            'QR scanner library could not be loaded. Please refresh the page and try again.',
            'error'
        );

        return;

    }


    try {

        html5QrCode =
            new Html5Qrcode(
                'qr-reader'
            );


        setScannerStatus(
            'Starting...'
        );


        startScannerBtn.disabled =
            true;

        stopScannerBtn.disabled =
            false;


        await html5QrCode.start(

            {
                facingMode:
                    'environment'
            },

            {
                fps: 10,

                qrbox: {
                    width: 250,
                    height: 250
                },

                aspectRatio: 1.0

            },

            onScanSuccess,

            onScanFailure

        );


        scannerRunning =
            true;


        setScannerStatus(
            'Scanning'
        );


        showMessage(
            'Scanner is ready. Point your camera at the attendance QR code.',
            'info'
        );


    } catch (error) {

        console.error(
            'Scanner start error:',
            error
        );


        scannerRunning =
            false;


        startScannerBtn.disabled =
            false;

        stopScannerBtn.disabled =
            true;


        setScannerStatus(
            'Camera unavailable'
        );


        showMessage(
            'Unable to start the camera. Please allow camera permission and try again.',
            'error'
        );

    }

}


/* =========================================================
   SCAN FAILURE
   ========================================================= */

function onScanFailure(
    errorMessage
) {

    /*
       This callback runs repeatedly while the camera
       is looking for a QR code.

       We intentionally do not show an error here because
       "QR not found yet" is normal scanner behaviour.
    */

}


/* =========================================================
   SCAN SUCCESS
   ========================================================= */

async function onScanSuccess(
    decodedText
) {

    if (
        attendanceSubmitting
    ) {
        return;
    }


    attendanceSubmitting =
        true;


    setScannerStatus(
        'QR detected'
    );


    showMessage(
        'QR code detected. Verifying attendance...',
        'info'
    );


    /*
       Stop scanning temporarily so that the same QR
       cannot trigger many requests at once.
    */

    await stopScanner();


    let qrToken;


    try {

        /*
           Our QR data is generated as JSON:

           {
               token: "...",
               date: "YYYY-MM-DD"
           }

           First try to decode that JSON.
        */

        const qrData =
            JSON.parse(
                decodedText
            );


        if (
            !qrData.token
        ) {

            throw new Error(
                'Invalid attendance QR code'
            );

        }


        qrToken =
            qrData.token;


    } catch (error) {

        /*
           If the QR contains a plain token instead
           of JSON, use the scanned text itself.
        */

        if (
            decodedText &&
            decodedText.trim()
        ) {

            qrToken =
                decodedText.trim();

        } else {

            attendanceSubmitting =
                false;

            setScannerStatus(
                'Invalid QR'
            );

            showMessage(
                'This is not a valid attendance QR code.',
                'error'
            );

            return;

        }

    }


    await markAttendance(
        qrToken
    );

}


/* =========================================================
   MARK ATTENDANCE
   ========================================================= */

async function markAttendance(
    qrToken
) {

    try {

        /*
           IMPORTANT:

           apiRequest() automatically adds:

           Authorization: Bearer TOKEN

           using the token already saved by app.js.
        */

        const data =
            await apiRequest(
                '/attendance/mark',
                {
                    method: 'POST',

                    body: JSON.stringify({
                        qr_token:
                            qrToken
                    })
                }
            );


        if (
            data.success
        ) {

            setScannerStatus(
                'Attendance marked'
            );


            showMessage(
                data.message ||
                'Attendance marked successfully.',
                'success'
            );


            startScannerBtn.disabled =
                false;

            stopScannerBtn.disabled =
                true;


            attendanceSubmitting =
                false;


            return;

        }


        throw new Error(
            data.message ||
            'Attendance could not be marked'
        );


    } catch (error) {

        console.error(
            'Attendance error:',
            error
        );


        setScannerStatus(
            'Scan failed'
        );


        showMessage(
            error.message ||
            'Unable to mark attendance.',
            'error'
        );


        startScannerBtn.disabled =
            false;

        stopScannerBtn.disabled =
            true;


        attendanceSubmitting =
            false;

    }

}


/* =========================================================
   STOP SCANNER
   ========================================================= */

async function stopScanner() {

    if (
        !html5QrCode ||
        !scannerRunning
    ) {

        return;

    }


    try {

        await html5QrCode.stop();


        html5QrCode.clear();


    } catch (error) {

        console.error(
            'Scanner stop error:',
            error
        );

    }


    scannerRunning =
        false;


    startScannerBtn.disabled =
        false;

    stopScannerBtn.disabled =
        true;


    setScannerStatus(
        'Stopped'
    );

}


/* =========================================================
   START BUTTON
   ========================================================= */

startScannerBtn.addEventListener(
    'click',
    () => {

        startScanner();

    }
);


/* =========================================================
   STOP BUTTON
   ========================================================= */

stopScannerBtn.addEventListener(
    'click',
    () => {

        stopScanner();

    }
);


/* =========================================================
   LOGOUT
   ========================================================= */

logoutBtn.addEventListener(
    'click',
    () => {

        logout();

    }
);


/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
    'beforeunload',
    () => {

        if (
            html5QrCode &&
            scannerRunning
        ) {

            html5QrCode
                .stop()
                .catch(() => {});

        }

    }
);