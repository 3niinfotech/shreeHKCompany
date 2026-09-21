const express = require("express");
const connection = require("../../connection.js");
const AdvancePayment = express.Router();
AdvancePayment.use(express.json());
const { authenticateToken } = require("../../authMiddleware.js");
const { fetchRowById, auditCrud, parseBodyId } = require("../../services/auditMutationHelper.js");
const { buildUserContext } = require("../../tenantHelper.js");

AdvancePayment.get("/advance/get", authenticateToken, (req, res) => {
    const companyId = buildUserContext(req).companyId;
    if (!companyId || companyId <= 0) {
        return res.status(200).json({
            message: "Advance Payment Data fetch Successfully",
            Data: [],
        });
    }

    const query = `
        SELECT a.id, a.party, a.date, a.type, a.book, a.cheque, a.amount, a.use_amount, a.balance_amount, a.invoice, a.invoice_id, a.assign_date, a.description, a.company, a.user,
               p.name AS party_name
        FROM acc_advance a
        LEFT JOIN dai_party p ON (a.party = CAST(p.id AS CHAR) OR a.party = p.name) AND (p.company = ? OR p.company IS NULL)
        WHERE (a.deleted = 0 OR a.deleted IS NULL) AND a.company = ?
        ORDER BY a.id DESC
    `;

    connection.query(query, [companyId, companyId], (err, result) => {
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
    const contextCompanyId = buildUserContext(req).companyId;
    const id = parseBodyId(req.body.id);
    const party = req.body.party ?? req.body.name ?? "";
    const date = req.body.date ?? "";
    const book = req.body.book ?? req.body.booktype ?? "";
    const type = req.body.type ?? req.body["dr-cr"] ?? "";
    const cheque = req.body.cheque ?? req.body.cheque_no ?? "";
    const amount = req.body.amount ?? 0;
    const use_amount = req.body.use_amount !== undefined ? req.body.use_amount : null;
    const balance_amount = req.body.balance_amount !== undefined ? req.body.balance_amount : null;
    const invoice = req.body.invoice ?? req.body.invoice_id ?? "";
    const assign_date = req.body.assign_date ?? req.body.use_date ?? null;
    const description = req.body.description ?? "";
    const company = req.body.company ?? contextCompanyId;
    const user = req.body.user ?? "";

    const isUpdate = Number.isFinite(id) && id > 0;

    const query = isUpdate
        ? `UPDATE acc_advance
           SET party = ?, date = ?, type = ?, book = ?, cheque = ?, amount = ?, use_amount = ?, balance_amount = ?, invoice = ?, assign_date = ?, description = ?, company = ?, user = ?
           WHERE id = ?`
        : `INSERT INTO acc_advance 
           (party, date, type, book, cheque, amount, use_amount, balance_amount, invoice, assign_date, description, company, user) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const queryValues = isUpdate
        ? [party, date, type, book, cheque, amount, use_amount, balance_amount, invoice, assign_date, description, company, user, id]
        : [party, date, type, book, cheque, amount, use_amount, balance_amount, invoice, assign_date, description, company, user];

    const newValue = {
        party,
        other_party: "",
        date,
        type,
        book,
        cheque,
        amount,
        use_amount,
        balance_amount,
        invoice,
        assign_date,
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
            }).catch(() => { });

            res.status(isUpdate ? 200 : 201).json({
                message: isUpdate ? "Advance payment updated successfully!" : "Advance payment created successfully!",
                Data: { id: savedId, party, date, type, cheque, amount, use_amount, balance_amount, invoice, assign_date, book, description, company, user },
            });
        });
    };

    if (isUpdate) {
        connection.query(
            `SELECT party, date, type, book, cheque, amount, use_amount, balance_amount, invoice, assign_date, description, company, user FROM acc_advance WHERE id = ?`,
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
