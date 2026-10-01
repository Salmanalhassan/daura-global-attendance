const db = require('../config/database');

/*
|--------------------------------------------------------------------------
| Submit Student Payment
|--------------------------------------------------------------------------
*/
const submitPayment = (req, res) => {
    const studentId = req.user.id;

    const {
        siwes_batch_id,
        payment_method,
        transaction_reference,
        payment_date,
        notes
    } = req.body;

    // Required fields
    if (
        !siwes_batch_id ||
        !payment_method ||
        !transaction_reference ||
        !payment_date
    ) {
        return res.status(400).json({
            success: false,
            message: 'All payment fields are required'
        });
    }

    // Validate payment method
    if (!['opay', 'moniepoint'].includes(payment_method)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid payment method'
        });
    }

    // Clean transaction reference
    const transactionReference =
        String(transaction_reference).trim();

    if (!transactionReference) {
        return res.status(400).json({
            success: false,
            message: 'Transaction reference is required'
        });
    }

    /*
    |--------------------------------------------------------------------------
    | GET STUDENT
    |--------------------------------------------------------------------------
    */

    const studentSql = `
        SELECT
            id,
            student_id,
            full_name,
            status,
            siwes_batch_id
        FROM students
        WHERE id = ?
        LIMIT 1
    `;

    db.query(
        studentSql,
        [studentId],
        (studentErr, studentResults) => {

            if (studentErr) {
                console.error(
                    'Get student payment error:',
                    studentErr
                );

                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (studentResults.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }

            const student = studentResults[0];

            /*
            |--------------------------------------------------------------------------
            | CHECK STUDENT ACCOUNT
            |--------------------------------------------------------------------------
            */

            if (student.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'Student account is not active'
                });
            }

            /*
            |--------------------------------------------------------------------------
            | STUDENT MUST HAVE SIWES BATCH
            |--------------------------------------------------------------------------
            */

            if (!student.siwes_batch_id) {
                return res.status(400).json({
                    success: false,
                    message:
                        'No SIWES batch is assigned to this student'
                });
            }

            /*
            |--------------------------------------------------------------------------
            | MAKE SURE REQUESTED BATCH BELONGS TO STUDENT
            |--------------------------------------------------------------------------
            */

            if (
                Number(student.siwes_batch_id) !==
                Number(siwes_batch_id)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Selected SIWES batch does not belong to this student'
                });
            }

            /*
            |--------------------------------------------------------------------------
            | GET BATCH + ACTUAL FEE
            |--------------------------------------------------------------------------
            */

            const batchSql = `
                SELECT
                    id,
                    name,
                    start_date,
                    end_date,
                    fee,
                    status
                FROM siwes_batches
                WHERE id = ?
                LIMIT 1
            `;

            db.query(
                batchSql,
                [student.siwes_batch_id],
                (batchErr, batchResults) => {

                    if (batchErr) {
                        console.error(
                            'Get payment batch error:',
                            batchErr
                        );

                        return res.status(500).json({
                            success: false,
                            message: 'Database error'
                        });
                    }

                    if (batchResults.length === 0) {
                        return res.status(404).json({
                            success: false,
                            message: 'SIWES batch not found'
                        });
                    }

                    const batch = batchResults[0];

                    /*
                    |--------------------------------------------------------------------------
                    | GET ACTUAL FEE FROM DATABASE
                    |--------------------------------------------------------------------------
                    */

                    const paymentAmount =
                        Number(batch.fee);

                    if (
                        !Number.isFinite(paymentAmount) ||
                        paymentAmount <= 0
                    ) {
                        return res.status(400).json({
                            success: false,
                            message:
                                'SIWES batch fee has not been configured'
                        });
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | CHECK DUPLICATE TRANSACTION REFERENCE
                    |--------------------------------------------------------------------------
                    */

                    const duplicateSql = `
                        SELECT
                            id,
                            status
                        FROM payments
                        WHERE transaction_reference = ?
                        LIMIT 1
                    `;

                    db.query(
                        duplicateSql,
                        [transactionReference],
                        (duplicateErr, duplicateResults) => {

                            if (duplicateErr) {
                                console.error(
                                    'Duplicate payment check error:',
                                    duplicateErr
                                );

                                return res.status(500).json({
                                    success: false,
                                    message: 'Database error'
                                });
                            }

                            if (
                                duplicateResults.length > 0
                            ) {
                                return res.status(409).json({
                                    success: false,
                                    message:
                                        'This transaction reference has already been submitted'
                                });
                            }

                            /*
                            |--------------------------------------------------------------------------
                            | INSERT PAYMENT
                            |--------------------------------------------------------------------------
                            */

                            const insertSql = `
                                INSERT INTO payments (
                                    student_id,
                                    siwes_batch_id,
                                    amount,
                                    payment_method,
                                    transaction_reference,
                                    payment_date,
                                    status,
                                    notes
                                )
                                VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
                            `;

                            db.query(
                                insertSql,
                                [
                                    studentId,
                                    batch.id,
                                    paymentAmount,
                                    payment_method,
                                    transactionReference,
                                    payment_date,
                                    notes || null
                                ],
                                (insertErr, insertResult) => {

                                    if (insertErr) {
                                        console.error(
                                            'Insert payment error:',
                                            insertErr
                                        );

                                        return res.status(500).json({
                                            success: false,
                                            message:
                                                'Failed to submit payment'
                                        });
                                    }

                                    return res.status(201).json({
                                        success: true,
                                        message:
                                            'Payment submitted successfully and is awaiting verification',

                                        data: {
                                            payment_id:
                                                insertResult.insertId,

                                            student_id:
                                                student.student_id,

                                            student_name:
                                                student.full_name,

                                            batch: {
                                                id:
                                                    batch.id,

                                                name:
                                                    batch.name
                                            },

                                            amount:
                                                paymentAmount,

                                            payment_method:
                                                payment_method,

                                            transaction_reference:
                                                transactionReference,

                                            payment_date:
                                                payment_date,

                                            status:
                                                'pending'
                                        }
                                    });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};


/*
|--------------------------------------------------------------------------
| Get My Payments - Student
|--------------------------------------------------------------------------
*/
const getMyPayments = (req, res) => {

    const studentId = req.user.id;

    const sql = `
        SELECT
            p.id,
            p.amount,
            p.payment_method,
            p.transaction_reference,
            p.payment_date,
            p.status,
            p.submitted_at,
            p.verified_at,
            p.rejection_reason,
            p.notes,

            b.id AS batch_id,
            b.name AS batch_name,
            b.start_date AS batch_start_date,
            b.end_date AS batch_end_date

        FROM payments p

        INNER JOIN siwes_batches b
            ON p.siwes_batch_id = b.id

        WHERE p.student_id = ?

        ORDER BY p.id DESC
    `;

    db.query(sql, [studentId], (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch payment history'
            });
        }

        res.json({
            success: true,
            data: results
        });
    });
};


/*
|--------------------------------------------------------------------------
| Get All Payments - Admin
|--------------------------------------------------------------------------
*/
const getAllPayments = (req, res) => {

    const {
        status,
        payment_method,
        school_id,
        student_id,
        siwes_batch_id
    } = req.query;

    let sql = `
        SELECT
            p.id,
            p.amount,
            p.payment_method,
            p.transaction_reference,
            p.payment_date,
            p.status,
            p.submitted_at,
            p.verified_at,
            p.rejection_reason,
            p.notes,

            s.id AS student_db_id,
            s.student_id,
            s.full_name,
            s.registration_number,
            s.department,

            sc.id AS school_id,
            sc.name AS school_name,

            b.id AS batch_id,
            b.name AS batch_name,

            a.full_name AS verified_by_name

        FROM payments p

        INNER JOIN students s
            ON p.student_id = s.id

        INNER JOIN schools sc
            ON s.school_id = sc.id

        INNER JOIN siwes_batches b
            ON p.siwes_batch_id = b.id

        LEFT JOIN admins a
            ON p.verified_by = a.id

        WHERE 1 = 1
    `;

    const params = [];

    if (status) {
        sql += ` AND p.status = ?`;
        params.push(status);
    }

    if (payment_method) {
        sql += ` AND p.payment_method = ?`;
        params.push(payment_method);
    }

    if (school_id) {
        sql += ` AND s.school_id = ?`;
        params.push(school_id);
    }

    if (student_id) {
        sql += ` AND s.student_id = ?`;
        params.push(student_id);
    }

    if (siwes_batch_id) {
        sql += ` AND p.siwes_batch_id = ?`;
        params.push(siwes_batch_id);
    }

    sql += ` ORDER BY p.id DESC`;

    db.query(sql, params, (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch payments'
            });
        }

        res.json({
            success: true,
            data: results
        });
    });
};


/*
|--------------------------------------------------------------------------
| Get Payment By ID - Admin
|--------------------------------------------------------------------------
*/
const getPaymentById = (req, res) => {

    const paymentId = req.params.id;

    const sql = `
        SELECT
            p.id,
            p.amount,
            p.payment_method,
            p.transaction_reference,
            p.payment_date,
            p.status,
            p.submitted_at,
            p.verified_at,
            p.rejection_reason,
            p.notes,

            s.id AS student_db_id,
            s.student_id,
            s.full_name,
            s.registration_number,
            s.email,
            s.phone,
            s.department,
            s.course,

            sc.id AS school_id,
            sc.name AS school_name,

            b.id AS batch_id,
            b.name AS batch_name,
            b.start_date AS batch_start_date,
            b.end_date AS batch_end_date,

            a.full_name AS verified_by_name

        FROM payments p

        INNER JOIN students s
            ON p.student_id = s.id

        INNER JOIN schools sc
            ON s.school_id = sc.id

        INNER JOIN siwes_batches b
            ON p.siwes_batch_id = b.id

        LEFT JOIN admins a
            ON p.verified_by = a.id

        WHERE p.id = ?

        LIMIT 1
    `;

    db.query(sql, [paymentId], (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch payment'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.json({
            success: true,
            data: results[0]
        });
    });
};


/*
|--------------------------------------------------------------------------
| Payment Summary - Admin Dashboard
|--------------------------------------------------------------------------
*/
const getPaymentSummary = (req, res) => {

    const sql = `
        SELECT
            COUNT(*) AS total_payments,

            COALESCE(
                SUM(
                    CASE
                        WHEN status = 'pending'
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS pending_payments,

            COALESCE(
                SUM(
                    CASE
                        WHEN status = 'approved'
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS approved_payments,

            COALESCE(
                SUM(
                    CASE
                        WHEN status = 'rejected'
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS rejected_payments,

            COALESCE(
                SUM(
                    CASE
                        WHEN status = 'approved'
                        THEN amount
                        ELSE 0
                    END
                ),
                0
            ) AS approved_amount,

            COALESCE(
                SUM(
                    CASE
                        WHEN status = 'pending'
                        THEN amount
                        ELSE 0
                    END
                ),
                0
            ) AS pending_amount,

            COALESCE(
                SUM(
                    CASE
                        WHEN status = 'rejected'
                        THEN amount
                        ELSE 0
                    END
                ),
                0
            ) AS rejected_amount

        FROM payments
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(
                'Payment summary error:',
                err
            );

            return res.status(500).json({
                success: false,
                message: 'Failed to load payment summary'
            });
        }

        const summary = results[0];

        res.json({
            success: true,
            data: {
                total_payments:
                    Number(summary.total_payments) || 0,

                pending_payments:
                    Number(summary.pending_payments) || 0,

                approved_payments:
                    Number(summary.approved_payments) || 0,

                rejected_payments:
                    Number(summary.rejected_payments) || 0,

                approved_amount:
                    Number(summary.approved_amount) || 0,

                pending_amount:
                    Number(summary.pending_amount) || 0,

                rejected_amount:
                    Number(summary.rejected_amount) || 0
            }
        });
    });
};


/*
|--------------------------------------------------------------------------
| Approve Payment - Admin
|--------------------------------------------------------------------------
*/
const approvePayment = (req, res) => {

    const paymentId = req.params.id;
    const adminId = req.user.id;

    /*
    |--------------------------------------------------------------------------
    | GET PAYMENT
    |--------------------------------------------------------------------------
    */

    const checkSql = `
        SELECT
            id,
            status
        FROM payments
        WHERE id = ?
        LIMIT 1
    `;

    db.query(
        checkSql,
        [paymentId],
        (checkErr, results) => {

            if (checkErr) {
                console.error(
                    'Check payment before approval error:',
                    checkErr
                );

                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found'
                });
            }

            const payment = results[0];

            /*
            |--------------------------------------------------------------------------
            | ONLY PENDING PAYMENT CAN BE APPROVED
            |--------------------------------------------------------------------------
            */

            if (payment.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message:
                        `Payment is already ${payment.status}`
                });
            }

            /*
            |--------------------------------------------------------------------------
            | APPROVE
            |--------------------------------------------------------------------------
            */

            const updateSql = `
                UPDATE payments
                SET
                    status = 'approved',
                    verified_at = NOW(),
                    verified_by = ?,
                    rejection_reason = NULL
                WHERE id = ?
                  AND status = 'pending'
            `;

            db.query(
                updateSql,
                [adminId, paymentId],
                (updateErr, updateResult) => {

                    if (updateErr) {
                        console.error(
                            'Approve payment error:',
                            updateErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                'Failed to approve payment'
                        });
                    }

                    if (updateResult.affectedRows === 0) {
                        return res.status(400).json({
                            success: false,
                            message:
                                'Payment could not be approved'
                        });
                    }

                    return res.json({
                        success: true,
                        message:
                            'Payment approved successfully'
                    });
                }
            );
        }
    );
};


/*
|--------------------------------------------------------------------------
| Reject Payment - Admin
|--------------------------------------------------------------------------
*/
const rejectPayment = (req, res) => {

    const paymentId = req.params.id;
    const adminId = req.user.id;

    const rejectionReason =
        String(req.body.rejection_reason || '').trim();

    /*
    |--------------------------------------------------------------------------
    | REJECTION REASON REQUIRED
    |--------------------------------------------------------------------------
    */

    if (!rejectionReason) {
        return res.status(400).json({
            success: false,
            message:
                'Rejection reason is required'
        });
    }

    /*
    |--------------------------------------------------------------------------
    | GET PAYMENT
    |--------------------------------------------------------------------------
    */

    const checkSql = `
        SELECT
            id,
            status
        FROM payments
        WHERE id = ?
        LIMIT 1
    `;

    db.query(
        checkSql,
        [paymentId],
        (checkErr, results) => {

            if (checkErr) {
                console.error(
                    'Check payment before rejection error:',
                    checkErr
                );

                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found'
                });
            }

            const payment = results[0];

            /*
            |--------------------------------------------------------------------------
            | ONLY PENDING PAYMENT CAN BE REJECTED
            |--------------------------------------------------------------------------
            */

            if (payment.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message:
                        `Payment is already ${payment.status}`
                });
            }

            /*
            |--------------------------------------------------------------------------
            | REJECT PAYMENT
            |--------------------------------------------------------------------------
            */

            const updateSql = `
                UPDATE payments
                SET
                    status = 'rejected',
                    verified_at = NOW(),
                    verified_by = ?,
                    rejection_reason = ?
                WHERE id = ?
                  AND status = 'pending'
            `;

            db.query(
                updateSql,
                [
                    adminId,
                    rejectionReason,
                    paymentId
                ],
                (updateErr, updateResult) => {

                    if (updateErr) {
                        console.error(
                            'Reject payment error:',
                            updateErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                'Failed to reject payment'
                        });
                    }

                    if (updateResult.affectedRows === 0) {
                        return res.status(400).json({
                            success: false,
                            message:
                                'Payment could not be rejected'
                        });
                    }

                    return res.json({
                        success: true,
                        message:
                            'Payment rejected successfully'
                    });
                }
            );
        }
    );
};


/*
|--------------------------------------------------------------------------
| Get SIWES Batch Fees - Admin
|--------------------------------------------------------------------------
*/
const getBatchFees = (req, res) => {

    const sql = `
        SELECT
            id,
            name,
            start_date,
            end_date,
            fee,
            status,
            description
        FROM siwes_batches
        ORDER BY start_date DESC, id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(
                'Get batch fees error:',
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    'Failed to load SIWES batch fees'
            });
        }

        const data = results.map(batch => ({
            id: batch.id,
            name: batch.name,
            start_date: batch.start_date,
            end_date: batch.end_date,
            fee: Number(batch.fee) || 0,
            status: batch.status,
            description: batch.description
        }));

        res.json({
            success: true,
            data
        });
    });
};


/*
|--------------------------------------------------------------------------
| Update SIWES Batch Fee - Admin
|--------------------------------------------------------------------------
*/
const updateBatchFee = (req, res) => {

    const batchId = req.params.id;

    const fee = Number(req.body.fee);

    /*
    |--------------------------------------------------------------------------
    | VALIDATE FEE
    |--------------------------------------------------------------------------
    */

    if (
        !Number.isFinite(fee) ||
        fee < 0
    ) {
        return res.status(400).json({
            success: false,
            message:
                'Fee must be a valid number greater than or equal to 0'
        });
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK BATCH
    |--------------------------------------------------------------------------
    */

    const checkSql = `
        SELECT
            id,
            name
        FROM siwes_batches
        WHERE id = ?
        LIMIT 1
    `;

    db.query(
        checkSql,
        [batchId],
        (checkErr, results) => {

            if (checkErr) {
                console.error(
                    'Check SIWES batch fee error:',
                    checkErr
                );

                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'SIWES batch not found'
                });
            }

            /*
            |--------------------------------------------------------------------------
            | UPDATE FEE
            |--------------------------------------------------------------------------
            */

            const updateSql = `
                UPDATE siwes_batches
                SET fee = ?
                WHERE id = ?
            `;

            db.query(
                updateSql,
                [fee, batchId],
                (updateErr, updateResult) => {

                    if (updateErr) {
                        console.error(
                            'Update SIWES batch fee error:',
                            updateErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                'Failed to update SIWES batch fee'
                        });
                    }

                    if (
                        updateResult.affectedRows === 0
                    ) {
                        return res.status(400).json({
                            success: false,
                            message:
                                'Fee was not updated'
                        });
                    }

                    return res.json({
                        success: true,
                        message:
                            'SIWES batch fee updated successfully',

                        data: {
                            batch_id:
                                Number(batchId),

                            batch_name:
                                results[0].name,

                            fee:
                                fee
                        }
                    });
                }
            );
        }
    );
};


/*
|--------------------------------------------------------------------------
| EXPORT CONTROLLERS
|--------------------------------------------------------------------------
*/
module.exports = {
    submitPayment,
    getMyPayments,
    getAllPayments,
    getPaymentById,

    getPaymentSummary,
    approvePayment,
    rejectPayment,

    getBatchFees,
    updateBatchFee
};