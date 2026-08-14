const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken, isSuperAdmin } = require("../../authMiddleware.js");
const { logAuditInTx } = require("../../services/auditIntegration.js");
const { ensureUserActiveColumn } = require("../../services/userActiveColumnService.js");
const { isUserOnline } = require("../../services/userPresenceService.js");
const AdminUserRouter = express.Router();
const md5 = require('md5');
AdminUserRouter.use(express.json());

const SUPER_ADMIN_ROLL_ID = 1;

const safeUserRow = (row) => {
    if (!row) return null;
    const safe = { ...row };
    delete safe.pass;
    delete safe.password;
    return safe;
};

const validateUserPayload = async ({ id = 0, fname, lname, username, email, mobileno, userroll, password }) => {
    if (!fname || !lname || !username || !email || !mobileno || userroll === undefined || userroll === null || userroll === "") {
        return "First name, last name, username, email, mobile number, and role are required.";
    }
    if (!id && (!password || String(password).length < 8)) {
        return "A password of at least 8 characters is required for a new user.";
    }
    if (password && String(password).length < 8) {
        return "Password must contain at least 8 characters.";
    }

    const roles = await helper.query("SELECT id FROM roll WHERE id = ? LIMIT 1", [userroll]);
    if (!roles.length) return "Selected role does not exist.";

    const duplicates = await helper.query(
        "SELECT user_id FROM user WHERE (user_name = ? OR user_email = ?) AND user_id <> ? LIMIT 1",
        [String(username).trim(), String(email).trim(), Number(id) || 0],
    );
    if (duplicates.length) return "Username or email is already in use.";
    return null;
};

AdminUserRouter.get('/getAdminManageUser', authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        await ensureUserActiveColumn();

        const results = await helper.query(`
        SELECT
            user_id AS id,
            first_name AS fname,
            last_name AS lname,
            user_name AS username,
            user_email AS email,
            mobile AS mobileno,
            roll AS userroll,
            COALESCE(is_active, 1) AS is_active
        FROM user
    `);

        const Data = results.map((row) => ({
            ...row,
            is_online: isUserOnline(row.id),
        }));

        res.status(200).json({
            message: "Users fetched successfully!",
            TotalItems: Data.length,
            Data,
        });
    } catch (err) {
        console.log("Error >>>>>>>>>", err);
        res.status(500).json({ error: err.message });
    }
});

// AdminUserRouter.post('/admin-manage-user', authenticateToken, (req, res) => {
//     const { fname, lname, username, email, mobileno, userroll, password } = req.body;

//     const query = `INSERT INTO dummy ( fname, lname, username, email, mobileno, userroll, password) VALUES (?, ?, ?, ?, ?, ?, ?)`;

//     connection.query(query, [fname, lname, username, email, mobileno, userroll, md5(password)], // <-- hashing password here
//         (err, result) => {
//             if (err) {
//                 console.log("Error  >>>>>>>>>", err);
//                 return res.status(500).json({ error: err.message });
//             }

//             console.log("Result >>>>>>>>>", result);
//             res.status(201).json({
//                 message: "Admin user created successfully!",
//                 user: {
//                     id: result.insertId,
//                     fname,
//                     lname,
//                     username,
//                     email,
//                     mobileno,
//                     userroll
//                 }
//             });
//         }
//     );
// });

AdminUserRouter.post('/admin-manage-user', authenticateToken, isSuperAdmin, async (req, res) => {
    const { id, fname, lname, username, email, mobileno, userroll, password, is_active } = req.body;
    const activeVal =
        is_active === undefined || is_active === null || is_active === ""
            ? 1
            : Number(is_active) ? 1 : 0;

    try {
        await ensureUserActiveColumn();
        const validationError = await validateUserPayload({
            id, fname, lname, username, email, mobileno, userroll, password,
        });
        if (validationError) {
            return res.status(400).json({ status: false, message: validationError });
        }

        if (id && id !== 0) {
            await helper.runInTransaction(async (q) => {
                const rows = await q("SELECT * FROM user WHERE user_id = ?", [id]);
                const oldRow = rows[0] || null;
                if (!oldRow) {
                    const error = new Error("User not found.");
                    error.statusCode = 404;
                    throw error;
                }

                const demotingSuperAdmin =
                    Number(oldRow.roll) === SUPER_ADMIN_ROLL_ID &&
                    (Number(userroll) !== SUPER_ADMIN_ROLL_ID || activeVal === 0);
                if (demotingSuperAdmin) {
                    if (Number(id) === Number(req.user.user_id)) {
                        const error = new Error("You cannot demote or deactivate your own Super Admin account.");
                        error.statusCode = 403;
                        throw error;
                    }
                    const counts = await q(
                        "SELECT COUNT(*) AS total FROM user WHERE roll = ? AND COALESCE(is_active, 1) = 1",
                        [SUPER_ADMIN_ROLL_ID],
                    );
                    if (Number(counts[0]?.total) <= 1) {
                        const error = new Error("The last active Super Admin cannot be demoted or deactivated.");
                        error.statusCode = 403;
                        throw error;
                    }
                }

                if (password && password.trim() !== "") {
                    await q(
                        `UPDATE user SET first_name = ?, last_name = ?, user_name = ?, user_email = ?, mobile = ?, roll = ?, pass = ?, is_active = ? WHERE user_id = ?`,
                        [fname, lname, username, email, mobileno, userroll, md5(password), activeVal, id],
                    );
                } else {
                    await q(
                        `UPDATE user SET first_name = ?, last_name = ?, user_name = ?, user_email = ?, mobile = ?, roll = ?, is_active = ? WHERE user_id = ?`,
                        [fname, lname, username, email, mobileno, userroll, activeVal, id],
                    );
                }

                const newRows = await q("SELECT user_id, first_name, last_name, user_name, user_email, mobile, roll, is_active FROM user WHERE user_id = ?", [id]);
                await logAuditInTx(q, {
                    actionType: "UPDATE",
                    moduleName: "User",
                    recordId: id,
                    recordReference: username,
                    oldValue: safeUserRow(oldRow),
                    newValue: newRows[0],
                });
            });

            return res.status(200).json({
                message: "User updated successfully",
                data: { id, fname, lname, username, email, mobileno, userroll, is_active: activeVal },
            });
        }

        const insertId = await helper.runInTransaction(async (q) => {
            const result = await q(
                `INSERT INTO user (first_name, last_name, user_name, user_email, mobile, roll, pass, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [fname, lname, username, email, mobileno, userroll, md5(password), activeVal],
            );
            const newRows = await q(
                "SELECT user_id, first_name, last_name, user_name, user_email, mobile, roll, is_active FROM user WHERE user_id = ?",
                [result.insertId],
            );
            await logAuditInTx(q, {
                actionType: "CREATE",
                moduleName: "User",
                recordId: result.insertId,
                recordReference: username,
                newValue: newRows[0],
            });
            return result.insertId;
        });

        return res.status(201).json({
            message: "User inserted successfully",
            data: { id: insertId, fname, lname, username, email, mobileno, userroll, is_active: activeVal },
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({ status: false, message: err.message });
    }
});


AdminUserRouter.delete("/manage-user/delete", authenticateToken, isSuperAdmin, async (req, res) => {
    const id = req.query.deleteId;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "Invalid or missing deleteId" });
    }
    if (Number(id) === Number(req.user.user_id)) {
        return res.status(403).json({ status: false, message: "You cannot delete your own account." });
    }

    try {
        await helper.runInTransaction(async (q) => {
            const rows = await q("SELECT * FROM user WHERE user_id = ?", [id]);
            const oldRow = rows[0] || null;
            if (!oldRow) {
                const error = new Error("User not found.");
                error.statusCode = 404;
                throw error;
            }
            if (Number(oldRow.roll) === SUPER_ADMIN_ROLL_ID) {
                const counts = await q(
                    "SELECT COUNT(*) AS total FROM user WHERE roll = ? AND COALESCE(is_active, 1) = 1",
                    [SUPER_ADMIN_ROLL_ID],
                );
                if (Number(counts[0]?.total) <= 1) {
                    const error = new Error("The last active Super Admin cannot be deleted.");
                    error.statusCode = 403;
                    throw error;
                }
            }
            await q("DELETE FROM user WHERE user_id = ?", [id]);
            await logAuditInTx(q, {
                actionType: "DELETE",
                moduleName: "User",
                recordId: id,
                recordReference: oldRow?.user_name || String(id),
                oldValue: safeUserRow(oldRow),
            });
        });
        res.status(200).json({ status: true, message: "Manage-User deleted successfully" });
    } catch (error) {
        res.status(error.statusCode || 500).json({ status: false, message: error.message });
    }
});

// New alias API: get all login users from user table
AdminUserRouter.get('/getLoginAllUsers', authenticateToken, isSuperAdmin, (req, res) => {
    const query = `
        SELECT
            user_id AS id,
            first_name AS fname,
            last_name AS lname,
            user_name AS username,
            user_email AS email,
            mobile AS mobileno,
            roll AS userroll
        FROM user
    `;

    connection.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.status(200).json({
            message: "Users fetched successfully!",
            Data: results
        });
    });
});

// New alias API: add user in user table
AdminUserRouter.post('/addNewUser', authenticateToken, isSuperAdmin, async (req, res) => {
    const { fname, lname, username, email, mobileno, userroll, password } = req.body;
    try {
        const validationError = await validateUserPayload({
            fname, lname, username, email, mobileno, userroll, password,
        });
        if (validationError) {
            return res.status(400).json({ status: false, message: validationError });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }

    const insertQuery = `
        INSERT INTO user (first_name, last_name, user_name, user_email, mobile, roll, pass)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(insertQuery, [fname, lname, username, email, mobileno, userroll, md5(password)], (insertErr, insertResult) => {
        if (insertErr) {
            return res.status(500).json({ message: insertErr.message });
        }

        return res.status(201).json({
            message: "User inserted successfully",
            data: {
                id: insertResult.insertId,
                fname, lname, username, email, mobileno, userroll
            }
        });
    });
});

// New alias API: delete user from user table
AdminUserRouter.delete('/deleteUser', authenticateToken, isSuperAdmin, async (req, res) => {
    const id = req.query.deleteId || req.query.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "Invalid or missing deleteId" });
    }
    if (Number(id) === Number(req.user.user_id)) {
        return res.status(403).json({ status: false, message: "You cannot delete your own account." });
    }

    try {
        const rows = await helper.query("SELECT roll FROM user WHERE user_id = ? LIMIT 1", [id]);
        if (!rows.length) {
            return res.status(404).json({ status: false, message: "User not found." });
        }
        if (Number(rows[0].roll) === SUPER_ADMIN_ROLL_ID) {
            const counts = await helper.query(
                "SELECT COUNT(*) AS total FROM user WHERE roll = ? AND COALESCE(is_active, 1) = 1",
                [SUPER_ADMIN_ROLL_ID],
            );
            if (Number(counts[0]?.total) <= 1) {
                return res.status(403).json({ status: false, message: "The last active Super Admin cannot be deleted." });
            }
        }
        await helper.query("DELETE FROM user WHERE user_id = ?", [id]);
        return res.status(200).json({ status: true, message: "User deleted successfully" });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
});



module.exports = AdminUserRouter