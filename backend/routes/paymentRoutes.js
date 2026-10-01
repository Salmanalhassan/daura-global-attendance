const express = require('express');

const {
    protect,
    requireAdmin,
    requireStudent
} = require('../middleware/authMiddleware');

const {
    submitPayment,
    getMyPayments,
    getAllPayments,
    getPaymentById,

    getPaymentSummary,
    approvePayment,
    rejectPayment,

    getBatchFees,
    updateBatchFee
} = require('../controllers/paymentController');

const router = express.Router();


/*
|--------------------------------------------------------------------------
| Student Payment Routes
|--------------------------------------------------------------------------
*/

/*
| Submit Payment
*/
router.post(
    '/',
    protect,
    requireStudent,
    submitPayment
);


/*
| Get My Payment History
*/
router.get(
    '/my-payments',
    protect,
    requireStudent,
    getMyPayments
);


/*
|--------------------------------------------------------------------------
| Admin Payment Routes
|--------------------------------------------------------------------------
*/

/*
| Payment Summary
|
| IMPORTANT:
| This route must come BEFORE /:id
| so "summary" is not treated as an ID.
*/
router.get(
    '/summary',
    protect,
    requireAdmin,
    getPaymentSummary
);


/*
| Get SIWES Batch Fees
*/
router.get(
    '/batch-fees',
    protect,
    requireAdmin,
    getBatchFees
);


/*
| Update SIWES Batch Fee
|
| Example:
| PUT /api/payments/batch-fees/1
|
| Body:
| {
|     "fee": 50000
| }
*/
router.put(
    '/batch-fees/:id',
    protect,
    requireAdmin,
    updateBatchFee
);


/*
| Approve Payment
|
| Example:
| PUT /api/payments/approve/15
*/
router.put(
    '/approve/:id',
    protect,
    requireAdmin,
    approvePayment
);


/*
| Reject Payment
|
| Example:
| PUT /api/payments/reject/15
|
| Body:
| {
|     "rejection_reason": "Transaction reference could not be verified"
| }
*/
router.put(
    '/reject/:id',
    protect,
    requireAdmin,
    rejectPayment
);


/*
| Get All Payments
|
| Optional filters:
| ?status=pending
| ?payment_method=opay
| ?school_id=1
| ?student_id=DG001
| ?siwes_batch_id=1
*/
router.get(
    '/',
    protect,
    requireAdmin,
    getAllPayments
);


/*
| Get Single Payment
|
| IMPORTANT:
| Keep this route LAST because it uses /:id.
*/
router.get(
    '/:id',
    protect,
    requireAdmin,
    getPaymentById
);


module.exports = router;