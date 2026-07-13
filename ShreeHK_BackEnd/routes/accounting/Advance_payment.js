const express = require("express");
const connection = require("../../connection.js");
const AdvancePayment = express.Router();
AdvancePayment.use(express.json());
const { authenticateToken } = require("../../authMiddleware.js");
const { fetchRowById, auditCrud, parseBodyId } = require("../../services/auditMutationHelper.js");

AdvancePayment.get("/advance/get", authenticateToken, (req, res) => {
    const query = `SELECT id, party, date, type, book, cheque, amount, description, company, user FROM acc_advance`;

    connection.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ err: err.message });
        }

        res.status(200).json({
            message: "Advance Payment Data fetch Successfully",
            Data: result,
        });
    });
});

AdvancePayment.post("/advance-payment", authenticateToken, (req, res) => {
    const id = parseBodyId(req.body.id);
    const party = req.body.party ?? req.body.name ?? "";
    const date = req.body.date ?? "";
    const book = req.body.book ?? req.body.booktype ?? "";
    const type = req.body.type ?? req.body["dr-cr"] ?? "";
    const cheque = req.body.cheque ?? req.body.cheque_no ?? "";
    const amount = req.body.amount ?? 0;
    const description = req.body.description ?? "";
    const company = req.body.company ?? "";
    const user = req.body.user ?? "";

    const isUpdate = Number.isFinite(id) && id > 0;

    const query = isUpdate
        ? `UPDATE acc_advance
           SET party = ?, date = ?, type = ?, book = ?, cheque = ?, amount = ?, description = ?, company = ?, user = ?
           WHERE id = ?`
        : `INSERT INTO acc_advance 
           (party, date, type, book, cheque, amount, description, company, user) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const queryValues = isUpdate
        ? [party, date, type, book, cheque, amount, description, company, user, id]
        : [party, date, type, book, cheque, amount, description, company, user];

    const newValue = {
        party,
        other_party: "",
        date,
        type,
        book,
        cheque,
        amount,
        description,
        company,
        user,
    };

    const finishSave = (oldValue) => {
        connection.query(query, queryValues, (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const savedId = isUpdate ? id : result?.insertId;

            auditCrud({
                actionType: isUpdate ? "UPDATE" : "CREATE",
                moduleName: "Advance Payment",
                recordId: savedId,
                recordReference: String(description || amount || party || savedId || ""),
                oldValue: oldValue || null,
                newValue: { ...newValue, id: savedId },
            }).catch(() => {});

            res.status(isUpdate ? 200 : 201).json({
                message: isUpdate ? "Advance payment updated successfully!" : "Advance payment created successfully!",
                Data: { id: savedId, party, date, type, cheque, amount, book, description, company, user },
            });
        });
    };

    if (isUpdate) {
        connection.query(
            `SELECT party, date, type, book, cheque, amount, description, company, user FROM acc_advance WHERE id = ?`,
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

AdvancePayment.delete("/advance-delete", authenticateToken, async (req, res) => {
    const id = parseInt(req.query.deleteId, 10);
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "Invalid or missing deleteId" });
    }

    try {
        const oldRow = await fetchRowById("acc_advance", id);
        await new Promise((resolve, reject) => {
            connection.query(`DELETE FROM acc_advance WHERE id = ?`, [id], (error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        await auditCrud({
            actionType: "DELETE",
            moduleName: "Advance Payment",
            recordId: id,
            recordReference: String(oldRow?.description || oldRow?.amount || id),
            oldValue: oldRow,
        });

        res.status(201).json({ message: "Advance-Payment deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = AdvancePayment;
