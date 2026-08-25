// const express = require('express');
// const connection = require('../../connection.js');
// const authenticateToken = require('../../authMiddleware');
// const MyBalanceBook = express.Router();
// MyBalanceBook.use(express.json());


// // My Balance GET API
// // MyBalanceBook.get("/balance/get", (req, res) => {
// //     const query = `SELECT id ,cash, bank, currency, credit FROM dai_balance`;

// //     connection.query(query, (err, results) => {
// //         if (err) {
// //             console.log("Error >>>>", err);
// //             res.status(500).json({ error: err.message });
// //         }

// //         res.status(200).json({
// //             message: "Balance Data Get SuccessFully",
// //             Data: results,
// //         })
// //     })
// // })

// // Change this line in your Node.js file
// MyBalanceBook.get("/my-balance-get", (req, res) => {
//     const query = `SELECT id, cash, bank, currency, credit FROM dai_balance`;

//     connection.query(query, (err, results) => {
//         if (err) {
//             console.error("GET Error:", err);
//             return res.status(500).json({ error: err.message });
//         }
//         res.status(200).json({
//             message: "Data Fetched Successfully",
//             Data: results
//         });
//     });
// });

// // My Balance POST API

// // My Balance POST API
// // MyBalanceBook.post("/my-balance-book", authenticateToken, (req, res) => {
// //     const data = req.body;

// //     // Helper function to handle a single entry logic (Upsert)
// //     const handleUpsert = (entry) => {
// //         return new Promise((resolve, reject) => {
// //             const { cash, bank, currency, credit } = entry;

// //             if (!currency) return reject("Currency is required");

// //             const updateQuery = `UPDATE dai_balance SET cash = ?, bank = ?, credit = ? WHERE currency = ?`;
// //             connection.query(updateQuery, [cash, bank, credit, currency], (err, result) => {
// //                 if (err) return reject(err);

// //                 if (result.affectedRows === 0) {
// //                     const insertQuery = `INSERT INTO dai_balance (cash, bank, currency, credit) VALUES (?, ?, ?, ?)`;
// //                     connection.query(insertQuery, [cash, bank, currency, credit], (insErr, insRes) => {
// //                         if (insErr) return reject(insErr);
// //                         resolve({ status: 'inserted', id: insRes.insertId });
// //                     });
// //                 } else {
// //                     resolve({ status: 'updated' });
// //                 }
// //             });
// //         });
// //     };

// //     // Check if body is an array (Mass Save) or single object (Row Checkmark)
// //     if (Array.isArray(data)) {
// //         // Use Promise.all to handle multiple rows
// //         Promise.all(data.map(item => handleUpsert(item)))
// //             .then(results => {
// //                 res.status(200).json({ message: "All records processed successfully", results });
// //             })
// //             .catch(err => {
// //                 res.status(500).json({ message: err.message || "Internal Server Error" });
// //             });
// //     } else {
// //         // Single row logic
// //         handleUpsert(data)
// //             .then(result => {
// //                 res.status(200).json({ message: `Record Save successfully`, data: result });
// //             })
// //             .catch(err => {
// //                 res.status(400).json({ message: err });
// //             });
// //     }
// // });

// MyBalanceBook.post("/my-balance-book", authenticateToken, (req, res) => {
//     // If frontend sends an array, just take the first item
//     const entry = Array.isArray(req.body) ? req.body[0] : req.body;

//     const { cash, bank, currency, credit } = entry;

//     if (!currency) return res.status(400).json({ message: "Currency is required" });

//     // UPSERT Logic: Update if exists, otherwise Insert
//     const updateQuery = `UPDATE dai_balance SET cash = ?, bank = ?, credit = ? WHERE currency = ?`;

//     connection.query(updateQuery, [cash, bank, credit, currency], (err, result) => {
//         if (err) return res.status(500).json({ message: err.message });

//         if (result.affectedRows === 0) {
//             const insertQuery = `INSERT INTO dai_balance (cash, bank, currency, credit) VALUES (?, ?, ?, ?)`;
//             connection.query(insertQuery, [cash, bank, currency, credit], (insErr, insRes) => {
//                 if (insErr) return res.status(500).json({ message: insErr.message });
//                 return res.status(201).json({ message: "Record Update Successfully" });
//             });
//         } else {
//             return res.status(200).json({ message: "Record Saved Successfully" });
//         }
//     });
// });

// MyBalanceBook.delete("/my-balance-delete", (req, res) => {
//     let id = req.query.id;
//     console.log("For Delete Id Received", id);

//     if (!id || isNaN(id)) {
//         return res.status(400).json({ error: "Invalid or missing deleteId" });
//     }

//     let query = `DELETE FROM dai_balance WHERE id = ?`;

//     connection.query(query, [id], (error) => {
//         if (error) {
//             console.log("Error in delete query:", error);
//             return res.status(500).json({ error: error.message });
//         }
//         res.status(201).json({ message: "my-balance-data deleted successfully" });
//     });
// });

// module.exports = MyBalanceBook;


const express = require('express');
const connection = require('../../connection.js');
const { authenticateToken } = require('../../authMiddleware');
const { fetchRowById, fetchRowByField, auditCrud } = require('../../services/auditMutationHelper.js');
const { buildUserContext } = require('../../tenantHelper.js');
const MyBalanceBook = express.Router();

MyBalanceBook.use(express.json());

// 1. GET API
MyBalanceBook.get("/balance/get", authenticateToken, (req, res) => {
    const companyId = buildUserContext(req).companyId;
    if (!companyId || companyId <= 0) {
        return res.status(200).json({
            message: "Balance Data Retrieved Successfully",
            Data: [],
        });
    }

    const query = `SELECT id, cash, bank, currency, credit FROM dai_balance WHERE company = ?`;
    connection.query(query, [companyId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({
            message: "Balance Data Retrieved Successfully",
            Data: results,
        });
    });
});

// 2. POST API — id > 0 = update, id = 0 = insert (check currency first)
MyBalanceBook.post("/my-balance-book", authenticateToken, async (req, res) => {
    const companyId = buildUserContext(req).companyId || 1;
    const entry = Array.isArray(req.body) ? req.body[0] : req.body;
    const { id, cash, bank, currency, credit } = entry;

    const safeId = Number(id) || 0;
    const safeCash = Number(cash) || 0;
    const safeBank = String(bank || '');
    const safeCurrency = String(currency || '').trim();
    const safeCredit = Number(credit) || 0;

    if (!safeCurrency) {
        return res.status(400).json({ message: "Currency is required" });
    }

    const newValue = { cash: safeCash, bank: safeBank, currency: safeCurrency, credit: safeCredit, company: companyId };

    const logSave = async (actionType, recordId, oldValue) => {
        await auditCrud({
            actionType,
            moduleName: "My Balance",
            recordId,
            recordReference: safeCurrency,
            oldValue,
            newValue: { ...newValue, id: recordId },
        });
    };

    try {
        if (safeId > 0) {
            const oldRow = await fetchRowById("dai_balance", safeId);
            await new Promise((resolve, reject) => {
                connection.query(
                    `UPDATE dai_balance SET cash = ?, bank = ?, credit = ?, currency = ?, company = ? WHERE id = ?`,
                    [safeCash, safeBank, safeCredit, safeCurrency, companyId, safeId],
                    (err) => (err ? reject(err) : resolve()),
                );
            });
            await logSave("UPDATE", safeId, oldRow);
            return res.status(200).json({ message: "Record Updated Successfully" });
        }

        const existingRows = await new Promise((resolve) => {
            connection.query("SELECT * FROM dai_balance WHERE currency = ? AND company = ? LIMIT 1", [safeCurrency, companyId], (err, r) => resolve(r));
        });
        const existing = existingRows?.[0] || null;

        if (existing) {
            await new Promise((resolve, reject) => {
                connection.query(
                    `UPDATE dai_balance SET cash = ?, bank = ?, credit = ? WHERE id = ? AND company = ?`,
                    [safeCash, safeBank, safeCredit, existing.id, companyId],
                    (err) => (err ? reject(err) : resolve()),
                );
            });
            await logSave("UPDATE", existing.id, existing);
            return res.status(200).json({ message: "Record Updated Successfully" });
        }

        const insertResult = await new Promise((resolve, reject) => {
            connection.query(
                `INSERT INTO dai_balance (cash, bank, currency, credit, company) VALUES (?, ?, ?, ?, ?)`,
                [safeCash, safeBank, safeCurrency, safeCredit, companyId],
                (err, result) => (err ? reject(err) : resolve(result)),
            );
        });
        await logSave("CREATE", insertResult.insertId, null);
        return res.status(201).json({ message: "New Record Created Successfully" });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// 3. DELETE API
MyBalanceBook.delete("/my-balance-delete", authenticateToken, async (req, res) => {
    const id = req.query.deleteId;

    if (!id) {
        return res.status(400).json({ error: "ID is required" });
    }

    try {
        const oldRow = await fetchRowById("dai_balance", id);
        await new Promise((resolve, reject) => {
            connection.query(`DELETE FROM dai_balance WHERE id = ?`, [id], (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
        await auditCrud({
            actionType: "DELETE",
            moduleName: "My Balance",
            recordId: id,
            recordReference: oldRow?.currency || String(id),
            oldValue: oldRow,
        });
        res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = MyBalanceBook;