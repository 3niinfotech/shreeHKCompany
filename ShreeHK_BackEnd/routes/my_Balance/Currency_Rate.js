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
    const { currency, USD, HKD } = req.body || {};
    const safeCurrency = String(currency || "").trim();
    const numUSD = Number(USD);
    const numHKD = Number(HKD);

    if (!safeCurrency) {
        return res.status(400).json({ status: false, message: "Currency name is required" });
    }

    if (isNaN(numUSD) || isNaN(numHKD) || numUSD <= 0 || numHKD <= 0) {
        return res.status(400).json({
            status: false,
            message: "Exchange rates must be positive numbers greater than 0",
        });
    }

    const newValue = { currency: safeCurrency, USD: numUSD, HKD: numHKD, company: companyId };

    try {
        const existingRows = await new Promise((resolve) => {
            connection.query("SELECT * FROM dai_currencyrate WHERE currency = ? AND company = ? LIMIT 1", [safeCurrency, companyId], (err, r) => resolve(r));
        });
        const existing = existingRows?.[0] || null;

        if (existing) {
            await new Promise((resolve, reject) => {
                connection.query(
                    `UPDATE dai_currencyrate SET USD = ?, HKD = ? WHERE currency = ? AND company = ?`,
                    [numUSD, numHKD, safeCurrency, companyId],
                    (err) => (err ? reject(err) : resolve()),
                );
            });
            await auditCrud({
                actionType: "UPDATE",
                moduleName: "Currency Rate",
                recordId: existing.id,
                recordReference: safeCurrency,
                oldValue: existing,
                newValue: { ...newValue, id: existing.id },
            });
            return res.status(200).json({ status: true, message: "Currency rate updated", data: newValue });
        }

        const insertResult = await new Promise((resolve, reject) => {
            connection.query(
                `INSERT INTO dai_currencyrate (currency, USD, HKD, company) VALUES (?, ?, ?, ?)`,
                [safeCurrency, numUSD, numHKD, companyId],
                (err, result) => (err ? reject(err) : resolve(result)),
            );
        });
        await auditCrud({
            actionType: "CREATE",
            moduleName: "Currency Rate",
            recordId: insertResult.insertId,
            recordReference: safeCurrency,
            newValue: { ...newValue, id: insertResult.insertId },
        });
        return res.status(201).json({
            status: true,
            message: "Currency rate inserted successfully",
            data: { id: insertResult.insertId, ...newValue },
        });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
});


const deleteCurrencyRateHandler = async (req, res) => {
    const rawId = req.query.deleteId ?? req.query.id ?? req.body?.deleteId ?? req.body?.id;
    const id = Number(rawId);
    const companyId = buildUserContext(req).companyId;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid or missing deleteId" });
    }

    try {
        const oldRows = await new Promise((resolve) => {
            connection.query("SELECT * FROM dai_currencyrate WHERE id = ? AND company = ? LIMIT 1", [id, companyId], (err, r) => resolve(r));
        });
        const oldRow = oldRows?.[0] || null;
        if (!oldRow) {
            return res.status(404).json({ status: false, message: "Record not found or access denied" });
        }

        await new Promise((resolve, reject) => {
            connection.query(`DELETE FROM dai_currencyrate WHERE id = ? AND company = ?`, [id, companyId], (error) => {
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
        res.status(200).json({ status: true, message: "currencyrate data deleted successfully" });
    } catch (error) {
        res.status(500).json({ status: false, error: error.message });
    }
};

CurrencyRate.delete("/currency-rate-delete", authenticateToken, deleteCurrencyRateHandler);

module.exports = CurrencyRate;
