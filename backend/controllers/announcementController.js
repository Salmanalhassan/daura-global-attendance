const db = require('../config/database');


// =====================================================
// CREATE ANNOUNCEMENT
// =====================================================

const createAnnouncement = (req, res) => {

    const {
        title,
        message,
        audience_type,
        batch_id,
        school_id,
        priority,
        status,
        expires_at
    } = req.body;

    const cleanTitle = String(title || '').trim();
    const cleanMessage = String(message || '').trim();

    const audience = String(audience_type || 'all').trim();
    const announcementPriority = String(priority || 'normal').trim();
    const announcementStatus = String(status || 'draft').trim();

    if (!cleanTitle) {
        return res.status(400).json({
            success: false,
            message: 'Announcement title is required.'
        });
    }

    if (!cleanMessage) {
        return res.status(400).json({
            success: false,
            message: 'Announcement message is required.'
        });
    }

    if (!['all', 'batch', 'school'].includes(audience)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid audience type.'
        });
    }

    if (!['normal', 'important', 'urgent'].includes(announcementPriority)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid announcement priority.'
        });
    }

    if (!['draft', 'published'].includes(announcementStatus)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid announcement status.'
        });
    }


    // =================================================
    // VALIDATE AUDIENCE
    // =================================================

    let selectedBatchId = null;
    let selectedSchoolId = null;


    if (audience === 'batch') {

        if (!batch_id) {
            return res.status(400).json({
                success: false,
                message: 'Please select a SIWES batch.'
            });
        }

        selectedBatchId = Number(batch_id);

        if (!Number.isInteger(selectedBatchId) || selectedBatchId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid SIWES batch.'
            });
        }

    }


    if (audience === 'school') {

        if (!school_id) {
            return res.status(400).json({
                success: false,
                message: 'Please select a school.'
            });
        }

        selectedSchoolId = Number(school_id);

        if (!Number.isInteger(selectedSchoolId) || selectedSchoolId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid school.'
            });
        }

    }


    // =================================================
    // CHECK BATCH
    // =================================================

    const checkBatch = (callback) => {

        if (!selectedBatchId) {
            return callback(null);
        }

        const sql = `
            SELECT id
            FROM siwes_batches
            WHERE id = ?
            LIMIT 1
        `;

        db.query(sql, [selectedBatchId], (err, results) => {

            if (err) {
                console.error('Check announcement batch error:', err);
                return callback(err);
            }

            if (!results.length) {
                return res.status(404).json({
                    success: false,
                    message: 'Selected SIWES batch was not found.'
                });
            }

            callback(null);
        });
    };


    // =================================================
    // CHECK SCHOOL
    // =================================================

    const checkSchool = (callback) => {

        if (!selectedSchoolId) {
            return callback(null);
        }

        const sql = `
            SELECT id
            FROM schools
            WHERE id = ?
            LIMIT 1
        `;

        db.query(sql, [selectedSchoolId], (err, results) => {

            if (err) {
                console.error('Check announcement school error:', err);
                return callback(err);
            }

            if (!results.length) {
                return res.status(404).json({
                    success: false,
                    message: 'Selected school was not found.'
                });
            }

            callback(null);
        });
    };


    checkBatch((batchErr) => {

        if (batchErr) {
            return res.status(500).json({
                success: false,
                message: 'Failed to validate SIWES batch.'
            });
        }


        checkSchool((schoolErr) => {

            if (schoolErr) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to validate school.'
                });
            }


            // =============================================
            // PUBLISH DATE
            // =============================================

            const publishedAt =
                announcementStatus === 'published'
                    ? new Date()
                    : null;


            // =============================================
            // INSERT
            // =============================================

            const sql = `
                INSERT INTO announcements (
                    title,
                    message,
                    audience_type,
                    batch_id,
                    school_id,
                    priority,
                    status,
                    published_at,
                    expires_at,
                    created_by
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;


            db.query(
                sql,
                [
                    cleanTitle,
                    cleanMessage,
                    audience,
                    selectedBatchId,
                    selectedSchoolId,
                    announcementPriority,
                    announcementStatus,
                    publishedAt,
                    expires_at || null,
                    req.user.id
                ],
                (err, result) => {

                    if (err) {

                        console.error(
                            'Create announcement error:',
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message: 'Failed to create announcement.'
                        });
                    }


                    res.status(201).json({
                        success: true,
                        message:
                            announcementStatus === 'published'
                                ? 'Announcement published successfully.'
                                : 'Announcement saved as draft.',
                        data: {
                            id: result.insertId
                        }
                    });

                }
            );

        });

    });

};



// =====================================================
// GET ALL ANNOUNCEMENTS — ADMIN
// =====================================================

const getAllAnnouncements = (req, res) => {

    const sql = `
        SELECT
            a.id,
            a.title,
            a.message,
            a.audience_type,
            a.batch_id,
            b.name AS batch_name,
            a.school_id,
            s.name AS school_name,
            a.priority,
            a.status,
            a.published_at,
            a.expires_at,
            a.created_by,
            a.created_at,
            a.updated_at
        FROM announcements a

        LEFT JOIN siwes_batches b
            ON a.batch_id = b.id

        LEFT JOIN schools s
            ON a.school_id = s.id

        ORDER BY a.created_at DESC
    `;


    db.query(sql, (err, results) => {

        if (err) {

            console.error(
                'Get all announcements error:',
                err
            );

            return res.status(500).json({
                success: false,
                message: 'Failed to load announcements.'
            });
        }


        res.json({
            success: true,
            data: results
        });

    });

};



// =====================================================
// GET SINGLE ANNOUNCEMENT — ADMIN
// =====================================================

const getAnnouncementById = (req, res) => {

    const announcementId = Number(req.params.id);


    if (!Number.isInteger(announcementId) || announcementId <= 0) {

        return res.status(400).json({
            success: false,
            message: 'Invalid announcement ID.'
        });

    }


    const sql = `
        SELECT
            a.id,
            a.title,
            a.message,
            a.audience_type,
            a.batch_id,
            b.name AS batch_name,
            a.school_id,
            s.name AS school_name,
            a.priority,
            a.status,
            a.published_at,
            a.expires_at,
            a.created_by,
            a.created_at,
            a.updated_at
        FROM announcements a

        LEFT JOIN siwes_batches b
            ON a.batch_id = b.id

        LEFT JOIN schools s
            ON a.school_id = s.id

        WHERE a.id = ?

        LIMIT 1
    `;


    db.query(sql, [announcementId], (err, results) => {

        if (err) {

            console.error(
                'Get announcement error:',
                err
            );

            return res.status(500).json({
                success: false,
                message: 'Failed to load announcement.'
            });
        }


        if (!results.length) {

            return res.status(404).json({
                success: false,
                message: 'Announcement not found.'
            });

        }


        res.json({
            success: true,
            data: results[0]
        });

    });

};



// =====================================================
// UPDATE ANNOUNCEMENT
// =====================================================

const updateAnnouncement = (req, res) => {

    const announcementId = Number(req.params.id);


    if (!Number.isInteger(announcementId) || announcementId <= 0) {

        return res.status(400).json({
            success: false,
            message: 'Invalid announcement ID.'
        });

    }


    const {
        title,
        message,
        audience_type,
        batch_id,
        school_id,
        priority,
        status,
        expires_at
    } = req.body;


    const cleanTitle = String(title || '').trim();
    const cleanMessage = String(message || '').trim();

    const audience = String(audience_type || 'all').trim();
    const announcementPriority = String(priority || 'normal').trim();
    const announcementStatus = String(status || 'draft').trim();


    if (!cleanTitle || !cleanMessage) {

        return res.status(400).json({
            success: false,
            message: 'Title and message are required.'
        });

    }


    if (!['all', 'batch', 'school'].includes(audience)) {

        return res.status(400).json({
            success: false,
            message: 'Invalid audience type.'
        });

    }


    if (!['normal', 'important', 'urgent'].includes(announcementPriority)) {

        return res.status(400).json({
            success: false,
            message: 'Invalid announcement priority.'
        });

    }


    if (!['draft', 'published'].includes(announcementStatus)) {

        return res.status(400).json({
            success: false,
            message: 'Invalid announcement status.'
        });

    }


    let selectedBatchId = null;
    let selectedSchoolId = null;


    if (audience === 'batch') {

        selectedBatchId = Number(batch_id);

        if (!Number.isInteger(selectedBatchId) || selectedBatchId <= 0) {

            return res.status(400).json({
                success: false,
                message: 'Please select a valid SIWES batch.'
            });

        }

    }


    if (audience === 'school') {

        selectedSchoolId = Number(school_id);

        if (!Number.isInteger(selectedSchoolId) || selectedSchoolId <= 0) {

            return res.status(400).json({
                success: false,
                message: 'Please select a valid school.'
            });

        }

    }


    const publishedAt =
        announcementStatus === 'published'
            ? new Date()
            : null;


    const sql = `
        UPDATE announcements
        SET
            title = ?,
            message = ?,
            audience_type = ?,
            batch_id = ?,
            school_id = ?,
            priority = ?,
            status = ?,
            published_at = ?,
            expires_at = ?
        WHERE id = ?
    `;


    db.query(
        sql,
        [
            cleanTitle,
            cleanMessage,
            audience,
            selectedBatchId,
            selectedSchoolId,
            announcementPriority,
            announcementStatus,
            publishedAt,
            expires_at || null,
            announcementId
        ],
        (err, result) => {

            if (err) {

                console.error(
                    'Update announcement error:',
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: 'Failed to update announcement.'
                });

            }


            if (!result.affectedRows) {

                return res.status(404).json({
                    success: false,
                    message: 'Announcement not found.'
                });

            }


            res.json({
                success: true,
                message: 'Announcement updated successfully.'
            });

        }
    );

};



// =====================================================
// DELETE ANNOUNCEMENT
// =====================================================

const deleteAnnouncement = (req, res) => {

    const announcementId = Number(req.params.id);


    if (!Number.isInteger(announcementId) || announcementId <= 0) {

        return res.status(400).json({
            success: false,
            message: 'Invalid announcement ID.'
        });

    }


    const sql = `
        DELETE FROM announcements
        WHERE id = ?
    `;


    db.query(sql, [announcementId], (err, result) => {

        if (err) {

            console.error(
                'Delete announcement error:',
                err
            );

            return res.status(500).json({
                success: false,
                message: 'Failed to delete announcement.'
            });

        }


        if (!result.affectedRows) {

            return res.status(404).json({
                success: false,
                message: 'Announcement not found.'
            });

        }


        res.json({
            success: true,
            message: 'Announcement deleted successfully.'
        });

    });

};



// =====================================================
// PUBLISH ANNOUNCEMENT
// =====================================================

const publishAnnouncement = (req, res) => {

    const announcementId = Number(req.params.id);


    if (!Number.isInteger(announcementId) || announcementId <= 0) {

        return res.status(400).json({
            success: false,
            message: 'Invalid announcement ID.'
        });

    }


    const sql = `
        UPDATE announcements

        SET
            status = 'published',
            published_at = NOW()

        WHERE id = ?
    `;


    db.query(sql, [announcementId], (err, result) => {

        if (err) {

            console.error(
                'Publish announcement error:',
                err
            );

            return res.status(500).json({
                success: false,
                message: 'Failed to publish announcement.'
            });

        }


        if (!result.affectedRows) {

            return res.status(404).json({
                success: false,
                message: 'Announcement not found.'
            });

        }


        res.json({
            success: true,
            message: 'Announcement published successfully.'
        });

    });

};



// =====================================================
// UNPUBLISH ANNOUNCEMENT
// =====================================================

const unpublishAnnouncement = (req, res) => {

    const announcementId = Number(req.params.id);


    if (!Number.isInteger(announcementId) || announcementId <= 0) {

        return res.status(400).json({
            success: false,
            message: 'Invalid announcement ID.'
        });

    }


    const sql = `
        UPDATE announcements

        SET
            status = 'draft',
            published_at = NULL

        WHERE id = ?
    `;


    db.query(sql, [announcementId], (err, result) => {

        if (err) {

            console.error(
                'Unpublish announcement error:',
                err
            );

            return res.status(500).json({
                success: false,
                message: 'Failed to unpublish announcement.'
            });

        }


        if (!result.affectedRows) {

            return res.status(404).json({
                success: false,
                message: 'Announcement not found.'
            });

        }


        res.json({
            success: true,
            message: 'Announcement moved to draft.'
        });

    });

};



// =====================================================
// GET STUDENT ANNOUNCEMENTS
// =====================================================

const getStudentAnnouncements = (req, res) => {

    const studentId = Number(req.user.id);


    if (!Number.isInteger(studentId) || studentId <= 0) {

        return res.status(400).json({
            success: false,
            message: 'Invalid student account.'
        });

    }


    const sql = `
        SELECT
            a.id,
            a.title,
            a.message,
            a.audience_type,
            a.priority,
            a.published_at,
            a.expires_at,
            a.created_at,

            b.name AS batch_name,
            s.name AS school_name

        FROM announcements a

        LEFT JOIN students st
            ON st.id = ?

        LEFT JOIN siwes_batches b
            ON a.batch_id = b.id

        LEFT JOIN schools s
            ON a.school_id = s.id

        WHERE
            a.status = 'published'

            AND (
                a.expires_at IS NULL
                OR a.expires_at >= NOW()
            )

            AND (
                a.audience_type = 'all'

                OR (
                    a.audience_type = 'batch'
                    AND a.batch_id = st.siwes_batch_id
                )

                OR (
                    a.audience_type = 'school'
                    AND a.school_id = st.school_id
                )
            )

        ORDER BY
            CASE a.priority
                WHEN 'urgent' THEN 1
                WHEN 'important' THEN 2
                ELSE 3
            END,

            a.published_at DESC
    `;


    db.query(sql, [studentId], (err, results) => {

        if (err) {

            console.error(
                'Get student announcements error:',
                err
            );

            return res.status(500).json({
                success: false,
                message: 'Failed to load announcements.'
            });

        }


        res.json({
            success: true,
            data: results
        });

    });

};



module.exports = {
    createAnnouncement,
    getAllAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement,
    publishAnnouncement,
    unpublishAnnouncement,
    getStudentAnnouncements
};