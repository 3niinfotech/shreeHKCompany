const express = require("express");
const connection = require("../../connection.js");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../../authMiddleware.js");
const helper = require("../../helper.js");
const { buildUserContext, metaQuery } = require("../../tenantHelper.js");
const commonRouter = express.Router();

const SECRET_KEY = "NitechDigitalServices";

commonRouter.use(bodyParser.json());

async function ensureIncrementRow(companyId) {
  if (!companyId || Number(companyId) <= 0) return null;

  const queryAsync = (sql, values = []) =>
    new Promise((resolve, reject) => {
      connection.query(sql, values, (error, data) => (error ? reject(error) : resolve(data)));
    });

  const existingRows = await queryAsync(
    "SELECT * FROM dai_incrementid WHERE company=? LIMIT 1",
    [companyId]
  );
  if (existingRows?.[0]) return existingRows[0];

  // Seed defaults for company (needed after DB switch / new company)
  try {
    const columns = await queryAsync("SHOW COLUMNS FROM dai_incrementid");
    const available = new Set((columns || []).map((c) => c.Field));
    const seedValues = {
      company: companyId,
      inward: "Inward-1",
      // Numeric only — Entry No / Invoice should show "1", not "Outward-1" / "Invoice-1"
      outward: "1",
      invoice: "1",
      reference: "1",
      purchase: "Purchase-1",
      sale: "Sale-1",
      payment: "Payment-1",
      receipt: "Receipt-1",
      journal: "Journal-1",
      contra: "Contra-1",
    };
    const payload = {};
    Object.keys(seedValues).forEach((key) => {
      if (available.has(key)) payload[key] = seedValues[key];
    });
    if (payload.company) {
      const data = helper.insertString(payload);
      await queryAsync(`INSERT INTO dai_incrementid (${data[0]}) VALUES (${data[1]})`);
    }
  } catch (seedErr) {
    if (seedErr?.code !== "ER_DUP_ENTRY") {
      console.error("ensureIncrementRow seed:", seedErr?.message || seedErr);
    }
  }

  const again = await queryAsync(
    "SELECT * FROM dai_incrementid WHERE company=? LIMIT 1",
    [companyId]
  );
  return again?.[0] || null;
}

// Get common increment
commonRouter.get("/common/getIncrement", authenticateToken, async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  try {
    const companyId = buildUserContext(req).companyId;
    let user = await ensureIncrementRow(companyId);

    if (user && typeof user.inward === "string" && user.inward.includes("NaN")) {
      user.inward = user.inward.replace(/-?NaN/gi, "") || "Inward-1";
    }

    // Legacy seeds "Invoice-1" / "Outward-1" → numeric for Entry No + Invoice columns
    const normalizeLegacySeq = async (field, prefixRe) => {
      if (!user || typeof user[field] !== "string") return;
      if (!prefixRe.test(user[field].trim())) return;
      const numeric = user[field].replace(prefixRe, "").trim() || "1";
      user[field] = numeric;
      try {
        await new Promise((resolve, reject) => {
          connection.query(
            `UPDATE dai_incrementid SET ${field} = ? WHERE company = ?`,
            [numeric, companyId],
            (err) => (err ? reject(err) : resolve())
          );
        });
      } catch (_) {
        /* non-fatal */
      }
    };
    await normalizeLegacySeq("invoice", /^invoice[-_\s]*/i);
    await normalizeLegacySeq("outward", /^outward[-_\s]*/i);

    // Align preview with real next numbers (max existing entry/invoice + 1)
    if (user && companyId) {
      try {
        const used = await queryAsync(
          "SELECT entryno, invoiceno FROM dai_outward WHERE company = ? OR company = ?",
          [companyId, String(companyId)]
        );
        let maxEntry = 0;
        let maxInvoice = 0;
        for (const r of used || []) {
          const e = parseInt(String(r.entryno ?? "").replace(/\D/g, ""), 10);
          const i = parseInt(String(r.invoiceno ?? "").replace(/\D/g, ""), 10);
          if (!Number.isNaN(e) && e > maxEntry) maxEntry = e;
          if (!Number.isNaN(i) && i > maxInvoice) maxInvoice = i;
        }
        const seqEntry = parseInt(String(user.outward ?? "").replace(/\D/g, ""), 10) || 1;
        const seqInvoice = parseInt(String(user.invoice ?? "").replace(/\D/g, ""), 10) || 1;
        const nextEntry = Math.max(seqEntry, maxEntry + 1);
        const nextInvoice = Math.max(seqInvoice, maxInvoice + 1);
        user.outward = String(nextEntry);
        user.invoice = String(nextInvoice);
        if (nextEntry !== seqEntry || nextInvoice !== seqInvoice) {
          await queryAsync(
            "UPDATE dai_incrementid SET outward = ?, invoice = ? WHERE company = ?",
            [String(nextEntry), String(nextInvoice), companyId]
          );
        }
      } catch (_) {
        /* non-fatal — form still works; sendTo allocates server-side */
      }
    }

    if (user && user.company != null) {
      try {
        const companies = await metaQuery(
          "SELECT name, invoice_prefix, memo_prefix, purchase_prefix, lab_prefix FROM company WHERE id = ? LIMIT 1",
          [user.company]
        );
        if (companies?.[0]) {
          user.company = companies[0].name || user.company;
          user.company_name = companies[0].name;
          user.invoice_prefix = companies[0].invoice_prefix || "INV-";
          user.memo_prefix = companies[0].memo_prefix || "MEMO-";
          user.purchase_prefix = companies[0].purchase_prefix || "PUR-";
          user.lab_prefix = companies[0].lab_prefix || "LAB-";
        }
      } catch (_) {
        // keep numeric company id if name lookup fails
      }
    }

    res.json({ Data: user || null });
  } catch (error) {
    console.error("getIncrement error:", error?.message || error);
    res.status(500).json({ error: "An error occurred" });
  }
});

module.exports = commonRouter;
