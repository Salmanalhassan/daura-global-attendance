const crypto = require('crypto');
const QRCode = require('qrcode');
const db = require('../config/database');

// CREATE QR SESSION// CREATE QR SESSION
const createQRSession = async (req, res) => {
    try {

        const {
            session_type,
            session_date,
            start_time,
            end_time
        } = req.body;


        // =========================
        // VALIDATION
        // =========================

        if (
            !session_date ||
            !start_time ||
            !end_time
        ) {
            return res.status(400).json({
                success: false,
                message: 'Session date, start time and end time are required'
            });
        }


        if (end_time <= start_time) {
            return res.status(400).json({
                success: false,
                message: 'End time must be after start time'
            });
        }


        // =========================
        // CREATE QR TOKEN
        // =========================

        const qrToken =
            crypto.randomBytes(32).toString('hex');


        // =========================
        // QR DATA
        // =========================

        const qrData = JSON.stringify({
            token: qrToken,
            date: session_date
        });


        const qrImage =
            await QRCode.toDataURL(qrData);


        // =========================
        // EXPIRY
        // =========================
        // QR expires automatically
        // at the session end time.

        const expiresAt =
            `${session_date} ${end_time}`;


        // =========================
        // DATABASE
        // =========================

        const sql = `
            INSERT INTO qr_sessions
            (
                qr_token,
                session_type,
                session_date,
                start_time,
                end_time,
                expires_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `;


        db.query(
            sql,
            [
                qrToken,
                session_type || 'morning',
                session_date,
                start_time,
                end_time,
                expiresAt
            ],
            (err, result) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create QR session'
                    });

                }


                // =========================
                // SUCCESS RESPONSE
                // =========================

                res.status(201).json({

                    success: true,

                    message:
                        'QR session created successfully',

                    session_id:
                        result.insertId,

                    qr_token:
                        qrToken,

                    qr_code:
                        qrImage,

                    session_type:
                        session_type || 'morning',

                    session_date:
                        session_date,

                    start_time:
                        start_time,

                    end_time:
                        end_time,

                    expires_at:
                        expiresAt

                });

            }
        );

    }

    catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Server error'
        });

    }
};



// GET ALL QR SESSIONS
const getAllQRSessions = (req, res) => {

    const sql = `
        SELECT
            id,
            session_type,
            session_date,
            start_time,
            end_time,
            expires_at,
            status,
            created_at
        FROM qr_sessions
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch QR sessions'
            });
        }

        res.json({
            success: true,
            data: results
        });
    });
};


// GET ONE QR SESSION
const getQRSessionById = (req, res) => {

    const { id } = req.params;

    db.query(
        `SELECT
            id,
            session_type,
            session_date,
            start_time,
            end_time,
            expires_at,
            status,
            created_at
         FROM qr_sessions
         WHERE id = ?`,
        [id],
        (err, results) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'QR session not found'
                });
            }

            res.json({
                success: true,
                data: results[0]
            });
        }
    );
};


module.exports = {
    createQRSession,
    getAllQRSessions,
    getQRSessionById
};