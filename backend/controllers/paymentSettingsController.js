const db = require('../config/database');


/* =========================================================
   GET PAYMENT SETTINGS
   Admin + Student
========================================================= */

const getPaymentSettings = (req, res) => {

    const sql = `
        SELECT
            id,
            opay_account_name,
            opay_account_number,
            moniepoint_account_name,
            moniepoint_account_number,
            updated_at
        FROM payment_settings
        ORDER BY id ASC
        LIMIT 1
    `;


    db.query(sql, (err, results) => {

        if (err) {

            console.error(
                'Get payment settings error:',
                err
            );

            return res.status(500).json({
                success: false,
                message: 'Failed to load payment settings'
            });

        }


        if (!results.length) {

            return res.json({
                success: true,
                data: {
                    opay_account_name: '',
                    opay_account_number: '',
                    moniepoint_account_name: '',
                    moniepoint_account_number: ''
                }
            });

        }


        res.json({
            success: true,
            data: results[0]
        });

    });

};


/* =========================================================
   UPDATE PAYMENT SETTINGS
   ADMIN ONLY
========================================================= */

const updatePaymentSettings = (req, res) => {

    const {
        opay_account_name,
        opay_account_number,
        moniepoint_account_name,
        moniepoint_account_number
    } = req.body;


    const opayName =
        String(opay_account_name || '').trim();

    const opayNumber =
        String(opay_account_number || '').trim();

    const moniepointName =
        String(moniepoint_account_name || '').trim();

    const moniepointNumber =
        String(moniepoint_account_number || '').trim();


    /*
     * Require both details for each payment method
     * if that method is being configured.
     */

    if (
        (opayName && !opayNumber) ||
        (!opayName && opayNumber)
    ) {

        return res.status(400).json({
            success: false,
            message:
                'Please provide both OPay account name and account number.'
        });

    }


    if (
        (moniepointName && !moniepointNumber) ||
        (!moniepointName && moniepointNumber)
    ) {

        return res.status(400).json({
            success: false,
            message:
                'Please provide both Moniepoint account name and account number.'
        });

    }


    const checkSql = `
        SELECT id
        FROM payment_settings
        ORDER BY id ASC
        LIMIT 1
    `;


    db.query(
        checkSql,
        (checkErr, results) => {

            if (checkErr) {

                console.error(
                    'Check payment settings error:',
                    checkErr
                );

                return res.status(500).json({
                    success: false,
                    message:
                        'Failed to check payment settings'
                });

            }


            /*
             * UPDATE existing settings
             */

            if (results.length) {

                const id = results[0].id;


                const updateSql = `
                    UPDATE payment_settings
                    SET
                        opay_account_name = ?,
                        opay_account_number = ?,
                        moniepoint_account_name = ?,
                        moniepoint_account_number = ?
                    WHERE id = ?
                `;


                db.query(
                    updateSql,
                    [
                        opayName || null,
                        opayNumber || null,
                        moniepointName || null,
                        moniepointNumber || null,
                        id
                    ],
                    (updateErr) => {

                        if (updateErr) {

                            console.error(
                                'Update payment settings error:',
                                updateErr
                            );

                            return res.status(500).json({
                                success: false,
                                message:
                                    'Failed to update payment settings'
                            });

                        }


                        res.json({
                            success: true,
                            message:
                                'Payment settings updated successfully'
                        });

                    }
                );

                return;
            }


            /*
             * INSERT if no settings exist
             */

            const insertSql = `
                INSERT INTO payment_settings (
                    opay_account_name,
                    opay_account_number,
                    moniepoint_account_name,
                    moniepoint_account_number
                )
                VALUES (?, ?, ?, ?)
            `;


            db.query(
                insertSql,
                [
                    opayName || null,
                    opayNumber || null,
                    moniepointName || null,
                    moniepointNumber || null
                ],
                (insertErr) => {

                    if (insertErr) {

                        console.error(
                            'Insert payment settings error:',
                            insertErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                'Failed to save payment settings'
                        });

                    }


                    res.status(201).json({
                        success: true,
                        message:
                            'Payment settings saved successfully'
                    });

                }
            );

        }
    );

};


module.exports = {
    getPaymentSettings,
    updatePaymentSettings
};