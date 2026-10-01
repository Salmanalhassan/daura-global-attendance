const express = require('express');
const path = require('path');

const db = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const studentRoutes = require('./routes/studentRoutes');
const batchRoutes = require('./routes/batchRoutes');
const qrRoutes = require('./routes/qrRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const paymentSettingsRoutes = require('./routes/paymentSettingsRoutes');
const announcementRoutes = require('./routes/announcementRoutes');

const app = express();

const PORT = 5000;


/* =========================================================
   PATH TO FRONTEND
   ========================================================= */

const frontendPath = path.resolve(
    __dirname,
    '..',
    'frontend'
);

console.log('Frontend path:', frontendPath);


/* =========================================================
   MIDDLEWARE
   ========================================================= */

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


/* =========================================================
   SERVE FRONTEND FILES
   ========================================================= */

app.use(
    express.static(frontendPath)
);


/* =========================================================
   API ROUTES
   ========================================================= */

app.use('/api/auth', authRoutes);

app.use('/api/admin', adminRoutes);

app.use('/api/schools', schoolRoutes);

app.use('/api/students', studentRoutes);

app.use('/api/batches', batchRoutes);

app.use('/api/qr', qrRoutes);

app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);
app.use(
    '/api/payment-settings',
    paymentSettingsRoutes
);
app.use('/api/announcements', announcementRoutes);


/* =========================================================
   FRONTEND HOME PAGE
   ========================================================= */

app.get('/', (req, res) => {

    res.sendFile(
        path.join(
            frontendPath,
            'index.html'
        )
    );

});


/* =========================================================
   DATABASE TEST
   ========================================================= */

app.get('/api/test-db', (req, res) => {

    db.query(
        'SELECT 1 AS result',
        (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: 'Database connection failed'
                });

            }

            res.json({
                success: true,
                message: 'Database connection is working',
                data: results
            });

        }
    );

});


/* =========================================================
   API 404
   ========================================================= */

app.use('/api', (req, res) => {

    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });

});


/* =========================================================
   START SERVER
   ========================================================= */

app.listen(PORT, () => {

    console.log('');
    console.log('==========================================');
    console.log('      DAURA GLOBAL ATTENDANCE SYSTEM');
    console.log('==========================================');
    console.log(
        `🚀 Server running: http://localhost:${PORT}`
    );
    console.log(
        `🌐 Frontend: http://localhost:${PORT}/`
    );
    console.log(
        `📁 Frontend path: ${frontendPath}`
    );
    console.log('==========================================');
    console.log('');

});