const express = require('express');
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const {authenticateToken} = require('../../authMiddleware.js');
const { logAuditInTx } = require("../../services/auditIntegration.js");
const PartyWiseTransaction = express.Router();
PartyWiseTransaction.use(express.json());


// PartyWiseTransaction get api 

PartyWiseTransaction.get('/partywisetransaction', authenticateToken, (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const query = `SELECT id, under_group, under_subgroup, address, contact_number, name FROM dai_party LIMIT ? OFFSET ?`;

    connection.query(query, [limit, offset], (err, result) => {
        if (err) {
            return res.status(500).json({ err: err.message });
        }

        res.status(200).json({
            message: "PartyWiseTransaction Data Fetch SuccessFully",
            TotalItems: result.length,
            Data: result,
        });
    });
})


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
    const { id } = req.body;
    const body = { ...req.body };
    delete body.id;

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
    const id = req.query.deleteId || req.query.id;

    if (!id) {
        return res.status(400).json({ error: "ID is required" });
    }

    try {
        await helper.runInTransaction(async (q) => {
            const rows = await q("SELECT * FROM dai_party WHERE id = ?", [id]);
            if (!rows.length) {
                throw new Error("Party not found");
            }
            const deletedData = rows[0];
            await q("DELETE FROM dai_party WHERE id = ?", [id]);
            await logAuditInTx(q, {
                actionType: "DELETE",
                moduleName: "Party Wise Transaction",
                recordId: id,
                recordReference: deletedData?.name || String(id),
                oldValue: deletedData,
            });
        });

        res.status(200).json({
            message: "PartyWiseTransaction deleted successfully",
        });
    } catch (err) {
        const status = err.message === "Party not found" ? 404 : 500;
        res.status(status).json({ error: err.message });
    }
});


module.exports = PartyWiseTransaction;