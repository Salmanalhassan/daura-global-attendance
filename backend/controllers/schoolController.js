const db = require('../config/database');

// ADD SCHOOL
const addSchool = (req, res) => {
    const { name, address, contact, email } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            message: 'School name is required'
        });
    }

    const sql = `
        INSERT INTO schools
        (name, address, contact, email)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [name, address || null, contact || null, email || null],
        (err, result) => {

            if (err) {
                console.error(err);

                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        success: false,
                        message: 'School already exists'
                    });
                }

                return res.status(500).json({
                    success: false,
                    message: 'Failed to add school'
                });
            }

            res.status(201).json({
                success: true,
                message: 'School added successfully',
                school_id: result.insertId
            });
        }
    );
};

// GET ALL SCHOOLS
const getAllSchools = (req, res) => {

    const sql = `
        SELECT
            s.id,
            s.name,
            s.address,
            s.contact,
            s.email,
            s.status,
            s.created_at,
            COUNT(st.id) AS student_count
        FROM schools s
        LEFT JOIN students st
            ON st.school_id = s.id
        GROUP BY
            s.id,
            s.name,
            s.address,
            s.contact,
            s.email,
            s.status,
            s.created_at
        ORDER BY s.id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch schools'
            });
        }

        res.json({
            success: true,
            data: results
        });
    });
};


// GET ONE SCHOOL
const getSchoolById = (req, res) => {

    const { id } = req.params;

    db.query(
        'SELECT * FROM schools WHERE id = ?',
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
                    message: 'School not found'
                });
            }

            res.json({
                success: true,
                data: results[0]
            });
        }
    );
};


// UPDATE SCHOOL
const updateSchool = (req, res) => {

    const { id } = req.params;
    const { name, address, contact, email, status } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            message: 'School name is required'
        });
    }

    const sql = `
        UPDATE schools
        SET name = ?,
            address = ?,
            contact = ?,
            email = ?,
            status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            name,
            address || null,
            contact || null,
            email || null,
            status || 'active',
            id
        ],
        (err, result) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: 'Failed to update school'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'School not found'
                });
            }

            res.json({
                success: true,
                message: 'School updated successfully'
            });
        }
    );
};


module.exports = {
    addSchool,
    getAllSchools,
    getSchoolById,
    updateSchool
};