const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { buildUserContext } = require("../../tenantHelper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const rapnetLive = require("./rapnetLiveService.js");

const rapnetRouter = express.Router();
const TABLE = "dai_rapnetprice";
const RAPAPORT_URL = "https://technet.rapaport.com/HTTP/JSON/Prices/GetPriceSheet.aspx";

rapnetRouter.use(express.json());

/**
 * Mirrors PHP: foreach($data as $row) { foreach($row['body'] as $rapnetprices) { foreach($rapnetprices as $rapnetprice) { ... } } }
 */
function isPriceRow(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    (obj.shape != null || obj.caratprice != null || obj.color != null)
  );
}

function normalizeRapaportPayload(parsed) {
  if (parsed == null) return [];
  if (parsed.response != null) {
    return Array.isArray(parsed.response) ? parsed.response : [parsed.response];
  }
  return Array.isArray(parsed) ? parsed : [parsed];
}

function extractRapaportError(parsed) {
  if (parsed == null) return null;
  const headers = [];
  if (parsed.response?.header) headers.push(parsed.response.header);
  for (const row of normalizeRapaportPayload(parsed)) {
    if (row?.header) headers.push(row.header);
  }
  for (const header of headers) {
    const code = header.error_code ?? header.errorCode;
    const msg =
      header.error_message ||
      header.errorMessage ||
      header.message ||
      header.error;
    if (code != null && String(code) !== "0") {
      const text = msg ? String(msg).trim() : "Rapaport API error";
      return code ? `${text} (code ${code})` : text;
    }
    if (msg && String(msg).trim()) return String(msg).trim();
  }
  return null;
}

function collectRapnetPriceRows(parsed) {
  const out = [];
  const data = normalizeRapaportPayload(parsed);
  for (const row of data) {
    if (!row || row.body === undefined || row.body === null) continue;
    const body = row.body;
    const bodyList = Array.isArray(body) ? body : Object.values(body);
    for (const rapnetprices of bodyList) {
      if (rapnetprices == null) continue;
      if (isPriceRow(rapnetprices)) {
        out.push(rapnetprices);
        continue;
      }
      const rpList = Array.isArray(rapnetprices) ? rapnetprices : Object.values(rapnetprices);
      for (const rapnetprice of rpList) {
        if (rapnetprice == null) continue;
        if (Array.isArray(rapnetprice)) {
          for (const r of rapnetprice) {
            if (isPriceRow(r)) out.push(r);
          }
        } else if (isPriceRow(rapnetprice)) {
          out.push(rapnetprice);
        }
      }
    }
  }
  return out;
}

// GET /rapnet/prices — SELECT * FROM dai_rapnetprice (mounted at /rapnet in index.js)
rapnetRouter.get("/prices", authenticateToken, (req, res) => {
  const countQuery = `SELECT COUNT(*) as totalItems FROM ${TABLE}`;
  connection.query(countQuery, (countError, countResult) => {
    if (countError) {
      return res.status(500).json({ status: false, message: countError.message });
    }
    const totalItems = countResult[0] ? countResult[0].totalItems : 0;
    connection.query(`SELECT * FROM ${TABLE}`, (error, data) => {
      if (error) {
        return res.status(500).json({ status: false, message: error.message });
      }
      res.json({ TotalItems: totalItems, Data: data || [] });
    });
  });
});

// GET /rapnet/update-price — Rapaport API, TRUNCATE, INSERT rows, addUserTrack
rapnetRouter.get("/update-price", authenticateToken, async (req, res) => {
  const username = process.env.RAPAPORT_USERNAME || "SKSM105224";
  const password = process.env.RAPAPORT_PASSWORD || "56789@sksm";
  const payload = {
    request: {
      header: { username, password },
      body: { shape: "round,pear" },
    },
  };
  const requestBody = JSON.stringify(payload);

  try {
    // Rapaport legacy API expects JSON body with Content-Type application/x-www-form-urlencoded (PHP/cURL parity)
    const resp = await fetch(RAPAPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: requestBody,
    });
    const text = await resp.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return res.status(200).json({
        status: false,
        message: "Invalid JSON from Rapaport API",
      });
    }

    const apiError = extractRapaportError(parsed);
    if (apiError) {
      return res.status(200).json({ status: false, message: apiError });
    }

    const rows = collectRapnetPriceRows(parsed);
    if (!rows.length) {
      return res.status(200).json({
        status: false,
        message:
          "No price rows received from Rapaport API. Existing list was not changed. Check Rapaport credentials or try again later.",
      });
    }

    await new Promise((resolve, reject) => {
      connection.query(`TRUNCATE TABLE ${TABLE}`, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    let inserted = 0;
    for (const rapnetprice of rows) {
      const data = helper.getInsertString(rapnetprice);
      if (!data || !data[0]) continue;
      await new Promise((resolve, reject) => {
        const sql = `INSERT INTO ${TABLE} (${data[0]}) VALUES (${data[1]})`;
        connection.query(sql, (qerr) => {
          if (qerr) return reject(qerr);
          resolve();
        });
      });
      inserted += 1;
    }

    if (!inserted) {
      return res.status(200).json({
        status: false,
        message: "Rapaport rows could not be saved. Check dai_rapnetprice table columns.",
      });
    }

    const track = {
      action: "update_rapnetprice",
      date: new Date().toISOString().slice(0, 19).replace("T", " "),
      description: "Rapnet Price List Updated",
      company: buildUserContext(req).companyId,
      user: req.user && req.user.user_id != null ? req.user.user_id : helper.DEFAULT_USER_ID,
    };

    await helper.addUserTrack(track);

    try {
      await rapnetLive.insertSnapshot("sync");
    } catch (snapErr) {
      console.error("rapnet live snapshot after sync:", snapErr);
    }

    return res.json({
      status: true,
      message: `Rapnet Price List Updated Successfully (${inserted} rows)`,
      inserted,
    });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    return res.status(200).json({ status: false, message: msg });
  }
});

rapnetRouter.get("/live", authenticateToken, async (req, res) => {
  try {
    const Data = await rapnetLive.getLiveSummary();
    return res.json({ status: true, Data });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err?.message || "Failed to load live Rapaport data",
    });
  }
});

rapnetRouter.get("/history", authenticateToken, async (req, res) => {
  try {
    const interval = String(req.query.interval || "1D").toUpperCase();
    const allowed = ["1H", "4H", "1D", "1W", "1M"];
    const safeInterval = allowed.includes(interval) ? interval : "1D";
    const Data = await rapnetLive.getHistory(safeInterval);
    return res.json({ status: true, Data });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err?.message || "Failed to load Rapaport history",
    });
  }
});

rapnetRouter.post("/live/snapshot", authenticateToken, async (req, res) => {
  try {
    const snapshot = await rapnetLive.insertSnapshot("poll");
    if (!snapshot) {
      return res.json({
        status: false,
        message: "No Rapaport benchmark price available. Sync price list first.",
      });
    }
    const Data = await rapnetLive.getLiveSummary();
    return res.json({ status: true, Data, snapshot });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err?.message || "Failed to record snapshot",
    });
  }
});

module.exports = rapnetRouter;
