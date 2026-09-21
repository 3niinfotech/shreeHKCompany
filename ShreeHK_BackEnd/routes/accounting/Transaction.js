const express = require("express");
const connection = require("../../connection.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { buildUserContext } = require("../../tenantHelper.js");
const moment = require("moment");

const Transaction = express.Router();
Transaction.use(express.json());

const queryAsync = (sql, values = []) =>
  new Promise((resolve, reject) => {
    connection.query(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

function mapTxnRow(row, no, balance) {
  const amount = parseFloat(row.amount) || 0;
  const isCredit = String(row.type).toLowerCase() === "cr" || String(row.type).toLowerCase() === "credit";
  const credit = isCredit ? amount : 0;
  const debit = !isCredit ? amount : 0;
  return {
    no,
    date: row.date ? moment(row.date).format("DD-MM-YYYY") : "",
    account: row.book || "",
    party: row.party_name || row.party || "",
    otherParty: row.other_party_name || row.other_party || "",
    cheque: row.cheque || "",
    description: row.description || "",
    credit: credit.toFixed(2),
    debit: debit.toFixed(2),
    balance: balance.toFixed(2),
  };
}

Transaction.post("/transaction", authenticateToken, async (req, res) => {
  try {
    const companyId = buildUserContext(req).companyId;
    if (!companyId || companyId <= 0) {
      return res.status(200).json({ status: true, message: "Transaction Data Fetched Successfully", data: [] });
    }

    const post = req.body || {};
    let sql = `SELECT t.id, t.date, t.cheque, t.description, t.party, t.type, t.amount, t.book, t.other_party,
      p1.name AS party_name,
      p2.name AS other_party_name
      FROM acc_transaction t
      LEFT JOIN dai_party p1 ON (t.party = CAST(p1.id AS CHAR) OR t.party = p1.name) AND p1.company = ?
      LEFT JOIN dai_party p2 ON (t.other_party = CAST(p2.id AS CHAR) OR t.other_party = p2.name) AND p2.company = ?
      WHERE (t.deleted = 0 OR t.deleted IS NULL) AND t.company = ?`;
    const values = [companyId, companyId, companyId];

    if (post.book) {
      sql += " AND t.book = ?";
      values.push(post.book);
    }
    if (post.party || post.partyId) {
      const partyVal = post.party || post.partyId;
      const partyIdVal = post.partyId || post.party;
      sql += " AND (t.party = ? OR t.party = ? OR p1.name = ? OR t.party = (SELECT CAST(id AS CHAR) FROM dai_party WHERE name = ? AND company = ? LIMIT 1))";
      values.push(partyVal, partyIdVal, partyVal, partyVal, companyId);
    }
    if (post.other_party || post.otherParty) {
      const otherP = post.other_party || post.otherParty;
      sql += " AND (t.other_party = ? OR p2.name = ? OR t.other_party = (SELECT CAST(id AS CHAR) FROM dai_party WHERE name = ? AND company = ? LIMIT 1))";
      values.push(otherP, otherP, otherP, companyId);
    }
    if (post.fromDate) {
      sql += " AND t.date >= ?";
      values.push(moment(post.fromDate, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD"));
    }
    if (post.toDate) {
      sql += " AND t.date <= ?";
      values.push(moment(post.toDate, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD"));
    }

    sql += " ORDER BY t.date ASC, t.id ASC";

    const rows = await queryAsync(sql, values);
    let balance = 0;
    const data = rows.map((row, idx) => {
      const amount = parseFloat(row.amount) || 0;
      const isCredit = String(row.type).toLowerCase() === "cr" || String(row.type).toLowerCase() === "credit";
      balance += isCredit ? amount : -amount;
      return mapTxnRow(row, idx + 1, balance);
    });

    return res.status(200).json({ status: true, message: "Transaction Data Fetched Successfully", data });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

Transaction.post("/transaction/advance-report", authenticateToken, async (req, res) => {
  try {
    const companyId = buildUserContext(req).companyId;
    if (!companyId || companyId <= 0) {
      return res.status(200).json({ status: true, data: [] });
    }

    const post = req.body || {};
    let sql = `SELECT id, party, date, type, book, cheque, amount, description FROM acc_advance WHERE company = ?`;
    const values = [companyId];

    if (post.party && post.party !== "0") {
      sql += " AND party = ?";
      values.push(post.party);
    }
    if (post.book) {
      sql += " AND book = ?";
      values.push(post.book);
    }
    if (post.fromDate) {
      sql += " AND date >= ?";
      values.push(moment(post.fromDate, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD"));
    }
    if (post.toDate) {
      sql += " AND date <= ?";
      values.push(moment(post.toDate, ["DD-MM-YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD"));
    }

    sql += " ORDER BY date ASC, id ASC";

    const rows = await queryAsync(sql, values);
    let balance = 0;
    const data = rows.map((row, idx) => {
      const amount = parseFloat(row.amount) || 0;
      const isCredit = String(row.type).toLowerCase() === "cr" || String(row.type).toLowerCase() === "credit";
      balance += isCredit ? amount : -amount;
      return {
        no: idx + 1,
        date: row.date ? moment(row.date).format("DD-MM-YYYY") : "",
        account: row.book || "",
        party: row.party || "",
        otherParty: "",
        cheque: row.cheque || "",
        description: row.description || "",
        credit: isCredit ? amount.toFixed(2) : "0.00",
        debit: !isCredit ? amount.toFixed(2) : "0.00",
        balance: balance.toFixed(2),
      };
    });

    return res.status(200).json({ status: true, data });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

Transaction.get("/transaction/books", authenticateToken, async (req, res) => {
  try {
    const companyId = buildUserContext(req).companyId;
    if (!companyId || companyId <= 0) {
      return res.json({ status: true, Data: [] });
    }
    const rows = await queryAsync(
      `SELECT DISTINCT TRIM(bank) AS name 
       FROM dai_balance 
       WHERE (company = ? OR company IS NULL) AND bank IS NOT NULL AND TRIM(bank) <> ''
       ORDER BY name`,
      [companyId]
    );
    return res.json({ status: true, Data: rows.map((r) => ({ value: r.name, label: r.name })) });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

module.exports = Transaction;


