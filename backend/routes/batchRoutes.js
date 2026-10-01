const express = require('express');

const {
    protect,
    requireAdmin
} = require('../middleware/authMiddleware');

const {
    addBatch,
    getAllBatches,
    getBatchById,
    updateBatch
} = require('../controllers/batchController');

const router = express.Router();


// ADD BATCH
router.post(
    '/',
    protect,
    requireAdmin,
    addBatch
);


// GET ALL BATCHES
router.get(
    '/',
    protect,
    requireAdmin,
    getAllBatches
);


// GET ONE BATCH
router.get(
    '/:id',
    protect,
    requireAdmin,
    getBatchById
);


// UPDATE BATCH
router.put(
    '/:id',
    protect,
    requireAdmin,
    updateBatch
);


module.exports = router;