const express = require('express');

const {
    protect,
    requireAdmin
} = require('../middleware/authMiddleware');

const {
    getPaymentSettings,
    updatePaymentSettings
} = require('../controllers/paymentSettingsController');


const router = express.Router();


/*
|--------------------------------------------------------------------------
| GET PAYMENT SETTINGS
|--------------------------------------------------------------------------
| Admin and Student can view the payment account details.
|--------------------------------------------------------------------------
*/

router.get(
    '/',
    protect,
    getPaymentSettings
);


/*
|--------------------------------------------------------------------------
| UPDATE PAYMENT SETTINGS
|--------------------------------------------------------------------------
| Admin only.
|--------------------------------------------------------------------------
*/

router.put(
    '/',
    protect,
    requireAdmin,
    updatePaymentSettings
);


module.exports = router;