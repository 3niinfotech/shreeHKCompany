// profileRouter.js  ← REPLACE existing file

const express = require("express");
const router = express.Router();
const connection = require("../../connection.js");
const md5 = require('md5');
const { authenticateToken, isSuperAdmin } = require('../../authMiddleware.js');
const { fetchRowById, auditCrud } = require('../../services/auditMutationHelper.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ══════════════════════════════════════════════════════════════
//   SECTION 1 — APNI PROFILE (Har logged-in user ke liye)
//   user table columns: user_id, user_name, user_email,
//   first_name, last_name, mobile, profile_image, roll
// ══════════════════════════════════════════════════════════════

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/profiles/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// POST: Apni profile update karo (Ab image bhi yahi handle karega)
// POST: Apni profile update karo (No designation)
router.post('/api/profile/update', authenticateToken, upload.single('profile_image'), async (req, res) => {
    
    // Safety Check: Check if user_id exists in token
    if (!req.user || !req.user.user_id) {
        return res.status(401).json({ status: false, message: 'User ID not found in token. Please login again.' });
    }

    const userId = req.user.user_id;
    const { fname, lname, phone, address } = req.body;

    let oldRow = null;
    try {
        oldRow = await fetchRowById('user', userId, 'user_id');
    } catch (e) {
        console.error('Profile audit fetch error:', e);
    }

    let query = `UPDATE user SET first_name = ?, last_name = ?, mobile = ?, address = ?`;
    let params = [fname, lname, phone, address];

    if (req.file) {
        query += `, profile_image = ?`;
        params.push(`/uploads/profiles/${req.file.filename}`);
    }

    query += ` WHERE user_id = ?`;
    params.push(userId);

    connection.query(query, params, async (err) => {
        if (err) {
            console.error("SQL Error:", err.sqlMessage);
            return res.status(500).json({ status: false, message: err.message });
        }

        const newValue = {
            first_name: fname,
            last_name: lname,
            mobile: phone,
            address,
            user_id: userId,
        };
        if (req.file) {
            newValue.profile_image = `/uploads/profiles/${req.file.filename}`;
        }

        try {
            await auditCrud({
                actionType: 'UPDATE',
                moduleName: 'My Profile',
                recordId: userId,
                recordReference: req.user.username || String(userId),
                oldValue: oldRow,
                newValue,
            });
        } catch (auditErr) {
            console.error('Profile audit error:', auditErr);
        }

        res.json({ status: true, message: 'Profile updated successfully.' });
    });
});

// GET:  profile look
router.get('/api/profile/me', authenticateToken, (req, res) => {
    const userId = req.user.user_id;

    const query = `
        SELECT user_id, user_name, user_email, first_name, last_name,
               mobile, profile_image, address, roll,
               company_name, tel_no
        FROM user
        WHERE user_id = ?`;
    connection.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ status: false, message: err.message });
        if (results.length === 0) return res.status(404).json({ status: false, message: 'User not found.' });

        const u = results[0];
        res.json({
            status: true,
            data: {
                ...u,
                // React form ke liye
                fname: u.first_name,
                lname: u.last_name,
                email: u.user_email,
                phone: u.mobile,
                role: u.roll === 1 ? 'super_admin' : 'admin'
            }
        });
    });
});

// POST: Apni profile update karo
// (sirf first_name, last_name, mobile, address — roll/email nahi)
// router.post('/api/profile/update', authenticateToken, (req, res) => {
//     const userId = req.user.user_id;
//     const { fname, lname, phone, address, designation } = req.body;

//     const query = `
//         UPDATE user 
//         SET first_name = ?, last_name = ?, mobile = ?, address = ?, designation = ?
//         WHERE user_id = ?
//     `;
//     connection.query(query, [fname, lname, phone, address, designation, userId], (err) => {
//         if (err) return res.status(500).json({ status: false, message: err.message });
//         res.json({ status: true, message: 'Profile updated successfully.' });
//     });
// });

// POST: Apna password change karo (purana verify + naya set)
router.post('/api/profile/change-password', authenticateToken, (req, res) => {
    const userId = req.user.user_id;
    const { oldPass, newPass } = req.body;

    if (!oldPass || !newPass) {
        return res.status(400).json({ status: false, message: 'Both passwords required.' });
    }
    if (newPass.length < 6) {
        return res.status(400).json({ status: false, message: 'New password must be at least 6 characters.' });
    }

    // Step 1: Purana password verify karo
    connection.query('SELECT pass FROM user WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ status: false, message: err.message });
        if (results.length === 0) return res.status(404).json({ status: false, message: 'User not found.' });

        if (md5(oldPass) !== results[0].pass) {
            return res.status(400).json({ status: false, message: 'Current password is incorrect.' });
        }

        // Step 2: Naya password save karo
        connection.query(
            'UPDATE user SET pass = ? WHERE user_id = ?',
            [md5(newPass), userId],
            (err2) => {
                if (err2) return res.status(500).json({ status: false, message: err2.message });
                res.json({ status: true, message: 'Password changed successfully.' });
            }
        );
    });
});

// ══════════════════════════════════════════════════════════════
//   SECTION 2 — SUPER ADMIN PANEL (roll = 1 only)
// ══════════════════════════════════════════════════════════════

// GET: Sabhi users ki list
router.get('/api/admin/users', authenticateToken, isSuperAdmin, (req, res) => {
    const query = `
        SELECT user_id, user_name, user_email, first_name, last_name,
               mobile, roll, profile_image, company_name, designation
        FROM user
        ORDER BY roll ASC, first_name ASC
    `;
    connection.query(query, (err, results) => {
        if (err) return res.status(500).json({ status: false, message: err.message });

        const data = results.map(u => ({
            ...u,
            role: u.roll === 1 ? 'super_admin' : 'admin'
        }));
        res.json({ status: true, data });
    });
});

// GET: Ek user ki detail
router.get('/api/admin/users/:id', authenticateToken, isSuperAdmin, (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT user_id, user_name, user_email, first_name, last_name,
               mobile, roll, profile_image, address, company_name,
        FROM user WHERE user_id = ?
    `;
    connection.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ status: false, message: err.message });
        if (results.length === 0) return res.status(404).json({ status: false, message: 'User not found.' });

        const u = results[0];
        res.json({
            status: true,
            data: { ...u, role: u.roll === 1 ? 'super_admin' : 'admin' }
        });
    });
});

// POST: Naya user create karo (Super Admin only)
router.post('/api/admin/users/create', authenticateToken, isSuperAdmin, (req, res) => {
    const { user_name, user_email, first_name, last_name, mobile, password, roll, designation, company_name } = req.body;

    if (!user_name || !user_email || !password) {
        return res.status(400).json({ status: false, message: 'user_name, user_email, password required.' });
    }

    const userRoll = roll === 1 ? 1 : 2; // Sirf 1 ya 2

    // Email duplicate check
    connection.query('SELECT user_id FROM user WHERE user_email = ? OR user_name = ?', [user_email, user_name], (err, exists) => {
        if (err) return res.status(500).json({ status: false, message: err.message });
        if (exists.length > 0) return res.status(409).json({ status: false, message: 'Username or email already exists.' });

        const query = `
            INSERT INTO user (user_name, user_email, first_name, last_name, mobile, pass, roll, company_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        connection.query(
            query,
            [user_name, user_email, first_name, last_name, mobile, md5(password), userRoll, designation, company_name],
            (err2, result) => {
                if (err2) return res.status(500).json({ status: false, message: err2.message });
                res.json({ status: true, message: 'User created successfully.', user_id: result.insertId });
            }
        );
    });
});

// POST: Kisi bhi user ki details update karo (Super Admin only)
router.post('/api/admin/users/:id/update', authenticateToken, isSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { user_name, user_email, first_name, last_name, mobile, designation, company_name, roll } = req.body;

    const userRoll = roll === 1 ? 1 : 2;

    const query = `
        UPDATE user 
        SET user_name = ?, user_email = ?, first_name = ?, last_name = ?,
            mobile = ?, company_name = ?, roll = ?
        WHERE user_id = ?
    `;
    connection.query(query, [user_name, user_email, first_name, last_name, mobile, designation, company_name, userRoll, id], (err) => {
        if (err) return res.status(500).json({ status: false, message: err.message });
        res.json({ status: true, message: 'User updated successfully.' });
    });
});

// POST: Kisi bhi user ka password reset karo (Super Admin only)
router.post('/api/admin/users/:id/reset-password', authenticateToken, isSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { newPass } = req.body;

    if (!newPass || newPass.length < 6) {
        return res.status(400).json({ status: false, message: 'Password must be at least 6 characters.' });
    }

    // Super admin apna password yahan se reset nahi kar sakta
    if (parseInt(id) === req.user.user_id) {
        return res.status(400).json({ status: false, message: 'Use /change-password for your own password.' });
    }

    connection.query('UPDATE user SET pass = ? WHERE user_id = ?', [md5(newPass), id], (err, result) => {
        if (err) return res.status(500).json({ status: false, message: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ status: false, message: 'User not found.' });
        res.json({ status: true, message: 'Password reset successfully.' });
    });
});

// POST: Role change karo (Super Admin only)
router.post('/api/admin/users/:id/change-role', authenticateToken, isSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { roll } = req.body;

    if (![1, 2].includes(parseInt(roll))) {
        return res.status(400).json({ status: false, message: 'roll must be 1 (super_admin) or 2 (admin).' });
    }
    if (parseInt(id) === req.user.user_id) {
        return res.status(400).json({ status: false, message: 'You cannot change your own role.' });
    }

    connection.query('UPDATE user SET roll = ? WHERE user_id = ?', [roll, id], (err) => {
        if (err) return res.status(500).json({ status: false, message: err.message });
        res.json({ status: true, message: `Role changed to ${roll === 1 ? 'super_admin' : 'admin'}.` });
    });
});

// DELETE: User delete karo (Super Admin only)
router.delete('/api/admin/users/:id/delete', authenticateToken, isSuperAdmin, (req, res) => {
    const { id } = req.params;

    if (parseInt(id) === req.user.user_id) {
        return res.status(400).json({ status: false, message: 'You cannot delete your own account.' });
    }

    connection.query('DELETE FROM user WHERE user_id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ status: false, message: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ status: false, message: 'User not found.' });
        res.json({ status: true, message: 'User deleted successfully.' });
    });
});

module.exports = router;