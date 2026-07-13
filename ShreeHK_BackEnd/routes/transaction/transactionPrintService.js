const connection = require("../../connection.js");
const { renderPdf } = require("../product/labelStickerPdf.js");
const moment = require("moment");

const queryAsync = (sql, values = []) =>
  new Promise((resolve, reject) => {
    connection.query(sql, values, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

async function fetchOutwardDoc(id) {
  const rows = await queryAsync(
    `SELECT o.*, p.name AS party_name, p.address, p.contact_number
     FROM dai_outward o LEFT JOIN dai_party p ON o.party = p.id WHERE o.id = ?`,
    [id]
  );
  if (!rows.length) return null;
  const doc = rows[0];
  const ids = (doc.products || "").split(",").filter(Boolean);
  let products = [];
  if (ids.length) {
    products = await queryAsync(
      `SELECT p.sku, p.polish_pcs, p.polish_carat, p.price, p.amount, p.sell_price, p.sell_amount,
        pv.shape, pv.color, pv.clarity, pv.report_no, pv.size
       FROM dai_product p JOIN dai_product_value pv ON p.id = pv.product_id
       WHERE p.id IN (${ids.map(() => "?").join(",")})`,
      ids
    );
  }
  return { doc, products };
}

async function fetchInwardDoc(id) {
  const rows = await queryAsync(
    `SELECT o.*, p.name AS party_name FROM dai_inward o LEFT JOIN dai_party p ON o.party = p.id WHERE o.id = ?`,
    [id]
  );
  if (!rows.length) return null;
  const doc = rows[0];
  const products = await queryAsync(
    `SELECT p.sku, p.polish_pcs, p.polish_carat, p.price, p.amount, p.purchase_price, p.purchase_amount,
      pv.shape, pv.color, pv.clarity, pv.report_no
     FROM dai_product p JOIN dai_product_value pv ON p.id = pv.product_id WHERE p.inward_id = ?`,
    [id]
  );
  return { doc, products };
}

function fmtDate(d) {
  return d ? moment(d).format("DD-MM-YYYY") : "";
}

function buildDocHtml(title, doc, products, priceField = "sell_price", amountField = "sell_amount") {
  const rows = products
    .map(
      (p, i) => `<tr>
      <td>${i + 1}</td><td>${p.sku || ""}</td><td>${p.report_no || ""}</td>
      <td>${p.shape || ""}</td><td>${p.color || ""}</td><td>${p.clarity || ""}</td>
      <td align="right">${p.polish_pcs || ""}</td><td align="right">${p.polish_carat || ""}</td>
      <td align="right">${p[priceField] || p.price || ""}</td><td align="right">${p[amountField] || p.amount || ""}</td>
    </tr>`
    )
    .join("");

  const totalPcs = products.reduce((s, p) => s + (parseFloat(p.polish_pcs) || 0), 0);
  const totalCarat = products.reduce((s, p) => s + (parseFloat(p.polish_carat) || 0), 0);
  const totalAmount = products.reduce((s, p) => s + (parseFloat(p[amountField] || p.amount) || 0), 0);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:Arial,sans-serif;font-size:12px;padding:24px}table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ccc;padding:6px}th{background:#1d3557;color:#fff}</style></head><body>
  <h2>${title}</h2>
  <p><b>Entry:</b> ${doc.entryno || ""} &nbsp; <b>Invoice:</b> ${doc.invoiceno || ""} &nbsp; <b>Date:</b> ${fmtDate(doc.invoicedate || doc.date)}</p>
  <p><b>Party:</b> ${doc.party_name || ""} &nbsp; <b>Reference:</b> ${doc.reference || ""}</p>
  <table><thead><tr><th>#</th><th>SKU</th><th>Report</th><th>Shape</th><th>Color</th><th>Clarity</th><th>Pcs</th><th>Carat</th><th>Price</th><th>Amount</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td colspan="6" align="right"><b>Total</b></td><td align="right"><b>${totalPcs}</b></td>
  <td align="right"><b>${totalCarat.toFixed(3)}</b></td><td></td><td align="right"><b>${totalAmount.toFixed(2)}</b></td></tr></tfoot></table>
  <p style="margin-top:16px"><b>Final Amount:</b> ${doc.final_amount || totalAmount.toFixed(2)}</p>
  </body></html>`;
}

async function generateTransactionPdf(type, id) {
  const t = String(type || "memo").toLowerCase();
  if (t === "purchase" || t === "inward") {
    const data = await fetchInwardDoc(id);
    if (!data) {
      const err = new Error("Document not found");
      err.statusCode = 404;
      throw err;
    }
    const html = buildDocHtml("Purchase Invoice", data.doc, data.products, "purchase_price", "purchase_amount");
    return renderPdf(html);
  }

  const data = await fetchOutwardDoc(id);
  if (!data) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }

  const titleMap = { sale: "Sale Invoice", export: "Export Invoice", gia: "GIA Memo", memo: "Memo", lab: "Lab Memo" };
  const title = titleMap[t] || "Transaction Document";
  const html = buildDocHtml(title, data.doc, data.products);
  return renderPdf(html);
}

module.exports = { generateTransactionPdf, fetchOutwardDoc, fetchInwardDoc };
