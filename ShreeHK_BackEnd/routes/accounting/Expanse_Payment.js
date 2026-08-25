const express = require("express");
const connection = require("../../connection.js");
const ExpansePayment = express.Router();
ExpansePayment.use(express.json());
const { authenticateToken } = require("../../authMiddleware.js");
const { logAudit } = require("../../services/auditIntegration.js");
const { fetchRowById, auditCrud, parseBodyId } = require("../../services/auditMutationHelper.js");
const { buildUserContext } = require("../../tenantHelper.js");


// get expanse payment data api

ExpansePayment.get("/expanse/get", authenticateToken, (req, res) => {
    const companyId = buildUserContext(req).companyId;
    if (!companyId || companyId <= 0) {
        return res.status(200).json({
            message: "Expanse Payment Data Successfully Fetch",
            Data: [],
        });
    }

    const query = `SELECT id, party, other_party, date, type, book, cheque, amount, description
                   FROM acc_transaction
                   WHERE company = ?
                   ORDER BY id DESC`;

    connection.query(query, [companyId], (err, result) => {
        if (err) {
            return res.status(500).json({ err: err.message });
        }

        res.status(200).json({
            message: "Expanse Payment Data Successfully Fetch",
            Data: result,
        })
    })
})

// expansepayment post api

ExpansePayment.post("/expanse-payment", authenticateToken, (req, res) => {
    const companyId = buildUserContext(req).companyId;
    const rawId = req.body.id;
    const id =
        typeof rawId === "object" && rawId !== null
            ? Number(rawId.id ?? rawId.value ?? rawId.data ?? 0)
            : Number(rawId);
    const party = req.body.party;
    const date = req.body.date;
    const type = req.body.type;
    const amount = req.body.amount;
    const other_party = req.body.other_party ?? req.body.otherpartyname ?? "";
    const book = req.body.book ?? req.body.booktype ?? "";
    const cheque = req.body.cheque ?? req.body.cheque_no ?? "";
    const description = req.body.description ?? "";

    const isUpdate = Number.isFinite(id) && id > 0;

    const query = isUpdate
        ? `UPDATE acc_transaction
           SET party = ?, other_party = ?, date = ?, type = ?, book = ?, cheque = ?, amount = ?, description = ?, company = ?
           WHERE id = ?`
        : `INSERT INTO acc_transaction
           (party, other_party, date, type, book, cheque, amount, description, company) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const queryValues = isUpdate
        ? [party, other_party, date, type, book, cheque, amount, description, companyId, id]
        : [party, other_party, date, type, book, cheque, amount, description, companyId];

    const newValue = {
        party,
        other_party,
        date,
        type,
        book,
        cheque,
        amount,
        description,
    };

    const finishSave = (oldValue) => {
        connection.query(query, queryValues, (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const savedId = isUpdate ? id : result?.insertId;

            logAudit({
                actionType: isUpdate ? "UPDATE" : "CREATE",
                moduleName: "Expanse",
                recordId: savedId,
                recordReference: String(description || amount || party || savedId || ""),
                oldValue: oldValue || null,
                newValue,
                description: isUpdate
                    ? `Expanse updated — ${description || amount || savedId}`
                    : `Expanse created — ${description || amount || party}`,
            }).catch(() => { });

            res.status(isUpdate ? 200 : 201).json({
                message: isUpdate ? "Expanse payment updated successfully!" : "Expanse payment created successfully!",
                Data: { id: isUpdate ? id : result?.insertId, party, other_party, date, type, cheque, amount, book, description }
            });
        });
    };

    if (isUpdate) {
        connection.query(
            `SELECT party, other_party, date, type, book, cheque, amount, description FROM acc_transaction WHERE id = ?`,
            [id],
            (fetchErr, rows) => {
                if (fetchErr) {
                    return res.status(500).json({ error: fetchErr.message });
                }
                finishSave(rows?.[0] || null);
            },
        );
        return;
    }

    finishSave(null);
});

// expanse delete api

ExpansePayment.delete('/expanse-delete', authenticateToken, async (req, res) => {
    const id = parseInt(req.query.deleteId, 10);
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "Invalid or missing deleteId" });
    }

    try {
        const oldRow = await fetchRowById("acc_transaction", id);
        await new Promise((resolve, reject) => {
            connection.query(`DELETE FROM acc_transaction WHERE id = ?`, [id], (error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        await auditCrud({
            actionType: "DELETE",
            moduleName: "Expanse",
            recordId: id,
            recordReference: String(oldRow?.description || oldRow?.amount || id),
            oldValue: oldRow,
        });

        res.status(201).json({ message: "Expanse deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = ExpansePayment;