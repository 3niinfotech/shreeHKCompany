const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { logAuditInTx } = require("../../services/auditIntegration.js");
const { ensureUserActiveColumn } = require("../../services/userActiveColumnService.js");
const { isUserOnline } = require("../../services/userPresenceService.js");
const AdminUserRouter = express.Router();
const md5 = require('md5');
AdminUserRouter.use(express.json());

AdminUserRouter.get('/getAdminManageUser', authenticateToken, async (req, res) => {
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
            pass AS password,
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

AdminUserRouter.post('/admin-manage-user', authenticateToken, async (req, res) => {
    const { id, fname, lname, username, email, mobileno, userroll, password, is_active } = req.body;
    const activeVal =
        is_active === undefined || is_active === null || is_active === ""
            ? 1
            : Number(is_active) ? 1 : 0;

    try {
        await ensureUserActiveColumn();

        if (id && id !== 0) {
            await helper.runInTransaction(async (q) => {
                const rows = await q("SELECT * FROM user WHERE user_id = ?", [id]);
                const oldRow = rows[0] || null;

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
                    oldValue: oldRow,
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
        return res.status(500).json({ message: err.message });
    }
});


AdminUserRouter.delete("/manage-user/delete", authenticateToken, async (req, res) => {
    const id = req.query.deleteId;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "Invalid or missing deleteId" });
    }

    try {
        await helper.runInTransaction(async (q) => {
            const rows = await q("SELECT * FROM user WHERE user_id = ?", [id]);
            const oldRow = rows[0] || null;
            await q("DELETE FROM user WHERE user_id = ?", [id]);
            await logAuditInTx(q, {
                actionType: "DELETE",
                moduleName: "User",
                recordId: id,
                recordReference: oldRow?.user_name || String(id),
                oldValue: oldRow,
            });
        });
        res.status(201).json({ message: "Manage-User deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New alias API: get all login users from user table
AdminUserRouter.get('/getLoginAllUsers', authenticateToken, (req, res) => {
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
AdminUserRouter.post('/addNewUser', authenticateToken, (req, res) => {
    const { fname, lname, username, email, mobileno, userroll, password } = req.body;

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
AdminUserRouter.delete('/deleteUser', authenticateToken, (req, res) => {
    const id = req.query.deleteId || req.query.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "Invalid or missing deleteId" });
    }

    const query = `DELETE FROM user WHERE user_id = ?`;
    connection.query(query, [id], (error) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.status(200).json({ message: "User deleted successfully" });
    });
});



module.exports = AdminUserRouter