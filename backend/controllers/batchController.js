const db = require('../config/database');

// ADD SIWES BATCH
const addBatch = (req, res) => {
    const {
        name,
        start_date,
        end_date,
        description,
        status
    } = req.body;

    if (!name || !start_date || !end_date) {
        return res.status(400).json({
            success: false,
            message: 'Name, start date and end date are required'
        });
    }

    if (new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({
            success: false,
            message: 'End date cannot be before start date'
        });
    }

    const sql = `
        INSERT INTO siwes_batches
        (name, start_date, end_date, description, status)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            name,
            start_date,
            end_date,
            description || null,
            status || 'upcoming'
        ],
        (err, result) => {

            if (err) {
                console.error(err);

                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        success: false,
                        message: 'Batch already exists'
                    });
                }

                return res.status(500).json({
                    success: false,
                    message: 'Failed to create SIWES batch'
                });
            }

            res.status(201).json({
                success: true,
                message: 'SIWES batch created successfully',
                batch_id: result.insertId
            });
        }
    );
};


// GET ALL BATCHES
const getAllBatches = (req, res) => {

    const sql = `
        SELECT *
        FROM siwes_batches
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch SIWES batches'
            });
        }

        res.json({
            success: true,
            data: results
        });
    });
};


// GET ONE BATCH
const getBatchById = (req, res) => {

    const { id } = req.params;

    const sql = `
        SELECT *
        FROM siwes_batches
        WHERE id = ?
    `;

    db.query(sql, [id], (err, results) => {

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
                message: 'SIWES batch not found'
            });
        }

        res.json({
            success: true,
            data: results[0]
        });
    });
};


// UPDATE BATCH
const updateBatch = (req, res) => {

    const { id } = req.params;

    const {
        name,
        start_date,
        end_date,
        description,
        status
    } = req.body;

    if (!name || !start_date || !end_date) {
        return res.status(400).json({
            success: false,
            message: 'Name, start date and end date are required'
        });
    }

    if (new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({
            success: false,
            message: 'End date cannot be before start date'
        });
    }

    const sql = `
        UPDATE siwes_batches
        SET
            name = ?,
            start_date = ?,
            end_date = ?,
            description = ?,
            status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            name,
            start_date,
            end_date,
            description || null,
            status || 'upcoming',
            id
        ],
        (err, result) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: 'Failed to update SIWES batch'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'SIWES batch not found'
                });
            }

            res.json({
                success: true,
                message: 'SIWES batch updated successfully'
            });
        }
    );
};


module.exports = {
    addBatch,
    getAllBatches,
    getBatchById,
    updateBatch
};