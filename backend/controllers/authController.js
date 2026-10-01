const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = 'daura_global_secret_key';

// ADMIN REGISTER
const registerAdmin = async (req, res) => {
    try {
        const { full_name, username, password } = req.body;

        if (!full_name || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if username already exists
        db.query(
            'SELECT id FROM admins WHERE username = ?',
            [username],
            async (err, results) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Database error'
                    });
                }

                if (results.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Username already exists'
                    });
                }

                // Hash password
                const passwordHash = await bcrypt.hash(password, 10);

                // Insert admin
                db.query(
                    `INSERT INTO admins 
                    (full_name, username, password_hash)
                    VALUES (?, ?, ?)`,
                    [full_name, username, passwordHash],
                    (err, result) => {
                        if (err) {
                            console.error(err);

                            return res.status(500).json({
                                success: false,
                                message: 'Failed to create admin'
                            });
                        }

                        res.status(201).json({
                            success: true,
                            message: 'Admin registered successfully',
                            admin_id: result.insertId
                        });
                    }
                );
            }
        );

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


// ADMIN LOGIN
const loginAdmin = (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required'
        });
    }

    db.query(
        'SELECT * FROM admins WHERE username = ?',
        [username],
        async (err, results) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
            }

            const admin = results[0];

            // Compare password
            const passwordMatch = await bcrypt.compare(
                password,
                admin.password_hash
            );

            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
            }

            // Create JWT
            const token = jwt.sign(
                {
                    id: admin.id,
                    username: admin.username,
                    role: 'admin'
                },
                JWT_SECRET,
                {
                    expiresIn: '1d'
                }
            );

            res.json({
                success: true,
                message: 'Login successful',
                token,
                admin: {
                    id: admin.id,
                    full_name: admin.full_name,
                    username: admin.username,
                    role: 'admin'
                }
            });
        }
    );
};


const loginStudent = (req, res) => {

    const { student_id, password } = req.body;

    if (!student_id || !password) {
        return res.status(400).json({
            success: false,
            message: 'Student ID and password are required'
        });
    }

    const sql = `
        SELECT
            id,
            student_id,
            full_name,
            password_hash,
            status
        FROM students
        WHERE student_id = ?
    `;

    db.query(sql, [student_id], async (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid student ID or password'
            });
        }

        const student = results[0];

        if (student.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Student account is not active'
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            student.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid student ID or password'
            });
        }

        const token = jwt.sign(
            {
                id: student.id,
                student_id: student.student_id,
                role: 'student'
            },
            JWT_SECRET,
            {
                expiresIn: '1d'
            }
        );

        res.json({
            success: true,
            message: 'Student login successful',
            token: token,
            student: {
                id: student.id,
                student_id: student.student_id,
                full_name: student.full_name
            }
        });
    });
};
module.exports = {
    registerAdmin,
    loginAdmin,
    loginStudent
};