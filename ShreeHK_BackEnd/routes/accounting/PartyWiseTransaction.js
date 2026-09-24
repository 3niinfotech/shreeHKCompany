const express = require('express');
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { authenticateToken } = require('../../authMiddleware.js');
const { logAuditInTx } = require("../../services/auditIntegration.js");
const { buildUserContext } = require("../../tenantHelper.js");
const PartyWiseTransaction = express.Router();
PartyWiseTransaction.use(express.json());


// PartyWiseTransaction get api 

PartyWiseTransaction.get('/partywisetransaction', authenticateToken, (req, res) => {
    const companyId = buildUserContext(req).companyId;
    if (!companyId || companyId <= 0) {
        return res.status(200).json({
            message: "PartyWiseTransaction Data Fetch SuccessFully",
            TotalItems: 0,
            Data: [],
        });
    }

    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const countQuery = `SELECT COUNT(*) AS total FROM dai_party WHERE company = ?`;
    const query = `SELECT id, under_group, under_subgroup, address, contact_number, name FROM dai_party WHERE company = ? ORDER BY id DESC LIMIT ? OFFSET ?`;

    connection.query(countQuery, [companyId], (countErr, countResult) => {
        if (countErr) {
            return res.status(500).json({ err: countErr.message });
        }
        const totalItems = countResult?.[0]?.total || 0;

        connection.query(query, [companyId, limit, offset], (err, result) => {
            if (err) {
                return res.status(500).json({ err: err.message });
            }

            res.status(200).json({
                message: "PartyWiseTransaction Data Fetch SuccessFully",
                TotalItems: totalItems,
                Data: result,
            });
        });
    });
});


// PartyWiseTransaction.delete('/partywisetransaction/delete', authenticateToken, (req, res) => {
//     const id = req.query.id;

//     let query = `DELETE FROM dai_party WHERE id=${id}`;

//     connection.query(query, (error, result) => {
//         if (error) {
//             console.log("Error >>>>>>>>>>>>>>>>>>", error);

//             res.status(500).json({
//                 error: error.message,
//                 Data: result,
//             });
//             return;
//         }

//         res.status(201).json({ message: "PartyWiseTransaction deleted successfully" });
//     })
// })


PartyWiseTransaction.post('/partywisetransaction/save', authenticateToken, async (req, res) => {
    const companyId = buildUserContext(req).companyId;
    const { id } = req.body;
    const body = { ...req.body };
    delete body.id;
    if (!body.company && companyId > 0) {
        body.company = companyId;
    }

    if (!body || Object.keys(body).length === 0) {
        return res.status(400).json({ status: false, Message: 'Request body is empty' });
    }

    const recordId = Number(id) || 0;
    let message = 'There was an error. Please check it';

    try {
        await helper.runInTransaction(async (q) => {
            let oldRow = null;
            if (recordId !== 0) {
                const rows = await q("SELECT * FROM dai_party WHERE id=?", [recordId]);
                oldRow = rows[0] || null;
            }

            if (recordId === 0) {
                const insertResponse = helper.insertString(body);
                const result = await q(
                    `INSERT INTO dai_party (${insertResponse[0]}) VALUES (${insertResponse[1]})`,
                );
                const newId = result.insertId;
                const newRows = await q("SELECT * FROM dai_party WHERE id=?", [newId]);
                message = 'Party added successfully';
                await logAuditInTx(q, {
                    actionType: "CREATE",
                    moduleName: "Party Wise Transaction",
                    recordId: newId,
                    recordReference: newRows[0]?.name || String(newId),
                    newValue: newRows[0],
                });
            } else {
                const updateResponse = helper.updateString(body);
                await q(`UPDATE dai_party SET ${updateResponse} WHERE id=?`, [recordId]);
                const newRows = await q("SELECT * FROM dai_party WHERE id=?", [recordId]);
                message = 'Party updated successfully';
                await logAuditInTx(q, {
                    actionType: "UPDATE",
                    moduleName: "Party Wise Transaction",
                    recordId: recordId,
                    recordReference: newRows[0]?.name || String(recordId),
                    oldValue: oldRow,
                    newValue: newRows[0],
                });
            }
        });

        res.status(201).json({ status: true, Message: message });
    } catch (err) {
        res.status(500).json({ status: false, Message: err.message });
    }
});


PartyWiseTransaction.delete('/partywisetransaction/delete', authenticateToken, async (req, res) => {
    const id = parseInt(req.query.deleteId || req.query.id, 10);
    const companyId = buildUserContext(req).companyId;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID is required" });
    }
    if (!companyId || companyId <= 0) {
        return res.status(400).json({ error: "Invalid tenant company context" });
    }

    try {
        const errorMsg = await helper.runInTransaction(async (q) => {
            const rows = await q("SELECT * FROM dai_party WHERE id = ? AND company = ?", [id, companyId]);
            const deletedData = rows[0] || null;
            if (!deletedData) {
                throw new Error("Party not found");
            }

            // 1. Inward check
            const inw = await q(
                "SELECT id FROM dai_inward WHERE (party = ? OR party = ?) AND company = ? AND (deleted = 0 OR deleted IS NULL) LIMIT 1",
                [String(id), deletedData.name || "", companyId]
            );
            if (inw.length > 0) {
                return "Cannot delete party: Active or historical transactions are linked to this party.";
            }

            // 2. Outward check
            const out = await q(
                "SELECT id FROM dai_outward WHERE (party = ? OR party = ?) AND company = ? LIMIT 1",
                [String(id), deletedData.name || "", companyId]
            );
            if (out.length > 0) {
                return "Cannot delete party: Active or historical transactions are linked to this party.";
            }

            // 3. Accounting transactions check
            const txn = await q(
                "SELECT id FROM acc_transaction WHERE (party = ? OR other_party = ? OR party = ? OR other_party = ?) AND company = ? AND (deleted = 0 OR deleted IS NULL) LIMIT 1",
                [String(id), String(id), deletedData.name || "", deletedData.name || "", companyId]
            );
            if (txn.length > 0) {
                return "Cannot delete party: Active or historical transactions are linked to this party.";
            }

            // 4. Advance payments check
            const adv = await q(
                "SELECT id FROM acc_advance WHERE (party = ? OR party = ?) AND company = ? AND (deleted = 0 OR deleted IS NULL) LIMIT 1",
                [id, String(id), companyId]
            );
            if (adv.length > 0) {
                return "Cannot delete party: Active or historical transactions are linked to this party.";
            }

            await q("DELETE FROM dai_party WHERE id = ? AND company = ?", [id, companyId]);
            await logAuditInTx(q, {
                actionType: "DELETE",
                moduleName: "Party Wise Transaction",
                recordId: id,
                recordReference: deletedData?.name || String(id),
                oldValue: deletedData,
                companyId,
            });

            return null;
        });

        if (errorMsg) {
            return res.status(409).json({ error: errorMsg, message: errorMsg });
        }

        res.status(200).json({
            message: "PartyWiseTransaction deleted successfully",
        });
    } catch (err) {
        const status = err.message === "Party not found" ? 404 : 500;
        res.status(status).json({ error: err.message });
    }
});


module.exports = PartyWiseTransaction;