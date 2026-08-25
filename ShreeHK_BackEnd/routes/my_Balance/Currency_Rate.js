const express = require("express");
const connection = require('../../connection.js');
const { authenticateToken } = require('../../authMiddleware.js');
const { fetchRowById, fetchRowByField, auditCrud } = require('../../services/auditMutationHelper.js');
const { buildUserContext } = require('../../tenantHelper.js');
const CurrencyRate = express.Router();
CurrencyRate.use(express.json());

CurrencyRate.get("/currency-rate/get", authenticateToken, (req, res) => {
    const companyId = buildUserContext(req).companyId;
    if (!companyId || companyId <= 0) {
        return res.status(200).json({
            message: "CurrencyRate Successfully Retrieved",
            Data: [],
        });
    }

    const query = `SELECT id, currency, USD, HKD FROM dai_currencyrate WHERE company = ?`;

    connection.query(query, [companyId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }

        res.status(200).json({
            message: "CurrencyRate Successfully Retrieved",
            Data: result,
        });
    });
});

CurrencyRate.post("/currency-rate", authenticateToken, async (req, res) => {
    const companyId = buildUserContext(req).companyId || 1;
    const { currency, USD, HKD } = req.body;
    const newValue = { currency, USD, HKD, company: companyId };

    try {
        const existingRows = await new Promise((resolve) => {
            connection.query("SELECT * FROM dai_currencyrate WHERE currency = ? AND company = ? LIMIT 1", [currency, companyId], (err, r) => resolve(r));
        });
        const existing = existingRows?.[0] || null;

        if (existing) {
            await new Promise((resolve, reject) => {
                connection.query(
                    `UPDATE dai_currencyrate SET USD = ?, HKD = ? WHERE currency = ? AND company = ?`,
                    [USD, HKD, currency, companyId],
                    (err) => (err ? reject(err) : resolve()),
                );
            });
            await auditCrud({
                actionType: "UPDATE",
                moduleName: "Currency Rate",
                recordId: existing.id,
                recordReference: currency,
                oldValue: existing,
                newValue: { ...newValue, id: existing.id },
            });
            return res.status(200).json({ message: "Currency rate updated", data: newValue });
        }

        const insertResult = await new Promise((resolve, reject) => {
            connection.query(
                `INSERT INTO dai_currencyrate (currency, USD, HKD, company) VALUES (?, ?, ?, ?)`,
                [currency, USD, HKD, companyId],
                (err, result) => (err ? reject(err) : resolve(result)),
            );
        });
        await auditCrud({
            actionType: "CREATE",
            moduleName: "Currency Rate",
            recordId: insertResult.insertId,
            recordReference: currency,
            newValue: { ...newValue, id: insertResult.insertId },
        });
        return res.status(201).json({
            message: "Currency rate inserted successfully",
            data: { id: insertResult.insertId, ...newValue },
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

const deleteCurrencyRateHandler = async (req, res) => {
    const rawId = req.query.deleteId ?? req.query.id ?? req.body?.deleteId ?? req.body?.id;
    const id = Number(rawId);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid or missing deleteId" });
    }

    try {
        const oldRow = await fetchRowById("dai_currencyrate", id);
        await new Promise((resolve, reject) => {
            connection.query(`DELETE FROM dai_currencyrate WHERE id = ?`, [id], (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
        await auditCrud({
            actionType: "DELETE",
            moduleName: "Currency Rate",
            recordId: id,
            recordReference: oldRow?.currency || String(id),
            oldValue: oldRow,
        });
        res.status(201).json({ message: "currencyrate data deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

CurrencyRate.delete("/currency-rate-delete", authenticateToken, deleteCurrencyRateHandler);

module.exports = CurrencyRate;
