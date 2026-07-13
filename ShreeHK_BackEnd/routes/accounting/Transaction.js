const express = require("express");
const connection = require("../../connection.js");
const { authenticateToken } = require("../../authMiddleware.js");
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
    party: row.party || "",
    otherParty: row.other_party || "",
    cheque: row.cheque || "",
    description: row.description || "",
    credit: credit.toFixed(2),
    debit: debit.toFixed(2),
    balance: balance.toFixed(2),
  };
}

Transaction.post("/transaction", authenticateToken, async (req, res) => {
  try {
    const post = req.body || {};
    let sql = `SELECT id, date, cheque, description, party, type, amount, book, other_party
      FROM acc_transaction WHERE (deleted = 0 OR deleted IS NULL)`;
    const values = [];

    if (post.book) {
      sql += " AND book = ?";
      values.push(post.book);
    }
    if (post.party) {
      sql += " AND party = ?";
      values.push(post.party);
    }
    if (post.other_party || post.otherParty) {
      sql += " AND other_party = ?";
      values.push(post.other_party || post.otherParty);
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
      return mapTxnRow(row, idx + 1, balance);
    });

    return res.status(200).json({ status: true, message: "Transaction Data Fetched Successfully", data });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

Transaction.post("/transaction/advance-report", authenticateToken, async (req, res) => {
  try {
    const post = req.body || {};
    let sql = `SELECT id, party, date, type, book, cheque, amount, description FROM acc_advance WHERE 1=1`;
    const values = [];

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
    const rows = await queryAsync(
      "SELECT DISTINCT book AS name FROM acc_transaction WHERE book IS NOT NULL AND book <> '' ORDER BY book"
    );
    return res.json({ status: true, Data: rows.map((r) => ({ value: r.name, label: r.name })) });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

module.exports = Transaction;
