/**
 * Fix outward entryno (memo-1 / sale-1) and invoiceno (INV-1 per type-group).
 * Invoice groups: memo|consign, sale|export, lab — each can start at 1.
 */
const connection = require("../connection.js");

function queryAsync(sql, values = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function extractSeq(value) {
  const n = parseInt(String(value ?? "").replace(/\D/g, ""), 10);
  return Number.isNaN(n) || n <= 0 ? 0 : n;
}

function entryPrefixForType(type) {
  const t = String(type || "memo").toLowerCase();
  if (t === "consign") return "consign";
  if (t === "lab") return "lab";
  if (t === "sale" || t === "export") return t;
  return "memo";
}

function invoicePrefixForType(type) {
  return String(type || "").toLowerCase() === "lab" ? "LAB" : "INV";
}

const INV_GROUPS = [
  ["memo", "consign"],
  ["sale", "export"],
  ["lab"],
];

async function companyNeedsOutwardRenumber(companyId) {
  const rows = await queryAsync(
    `SELECT id, entryno, invoiceno, type
     FROM dai_outward
     WHERE (company = ? OR company = ?)
       AND LOWER(TRIM(type)) IN ('memo', 'consign', 'sale', 'export', 'lab')`,
    [companyId, String(companyId)]
  );
  if (!rows.length) return false;

  for (const group of INV_GROUPS) {
    const groupRows = rows.filter((r) =>
      group.includes(String(r.type || "").toLowerCase())
    );
    const byInv = {};
    for (const r of groupRows) {
      const ik = String(r.invoiceno ?? "");
      byInv[ik] = (byInv[ik] || 0) + 1;
    }
    if (Object.values(byInv).some((c) => c > 1)) return true;

    const prefix = group[0] === "lab" ? "LAB" : "INV";
    for (const r of groupRows) {
      const inv = String(r.invoiceno ?? "").trim().toUpperCase();
      if (!new RegExp(`^${prefix}-\\d+$`).test(inv)) return true;
      const e = String(r.entryno ?? "").trim().toLowerCase();
      const ep = entryPrefixForType(r.type);
      if (!new RegExp(`^${ep}-\\d+$`).test(e)) return true;
    }
  }
  return false;
}

async function renumberOutwardForCompany(companyId) {
  let updated = 0;
  let total = 0;

  for (const group of INV_GROUPS) {
    const placeholders = group.map(() => "?").join(",");
    const rows = await queryAsync(
      `SELECT id, entryno, invoiceno, type
       FROM dai_outward
       WHERE (company = ? OR company = ?)
         AND LOWER(TRIM(type)) IN (${placeholders})
       ORDER BY COALESCE(date, invoicedate, '1970-01-01') ASC, id ASC`,
      [companyId, String(companyId), ...group]
    );
    total += rows.length;

    let invN = 0;
    const invPrefix = invoicePrefixForType(group[0]);
    for (const row of rows) {
      invN += 1;
      const nextInvoice = `${invPrefix}-${invN}`;
      if (String(row.invoiceno) !== nextInvoice) {
        await queryAsync("UPDATE dai_outward SET invoiceno = ? WHERE id = ?", [
          nextInvoice,
          row.id,
        ]);
        updated += 1;
        row.invoiceno = nextInvoice;
      }
    }

    for (const type of group) {
      const typed = rows.filter((r) => String(r.type || "").toLowerCase() === type);
      let n = 0;
      for (const row of typed) {
        n += 1;
        const nextEntry = `${entryPrefixForType(type)}-${n}`;
        if (String(row.entryno) === nextEntry) continue;
        await queryAsync("UPDATE dai_outward SET entryno = ? WHERE id = ?", [
          nextEntry,
          row.id,
        ]);
        updated += 1;
        row.entryno = nextEntry;
      }
    }
  }

  const all = await queryAsync(
    "SELECT entryno, invoiceno FROM dai_outward WHERE company = ? OR company = ?",
    [companyId, String(companyId)]
  );
  let maxEntry = 0;
  let maxInvoice = 0;
  for (const r of all) {
    const e = extractSeq(r.entryno);
    const i = extractSeq(r.invoiceno);
    if (e > maxEntry) maxEntry = e;
    if (i > maxInvoice) maxInvoice = i;
  }
  const nextOutward = String(maxEntry + 1 || 1);
  const nextInvoice = String(maxInvoice + 1 || 1);
  const inc = await queryAsync(
    "SELECT company FROM dai_incrementid WHERE company = ? LIMIT 1",
    [companyId]
  );
  if (inc.length) {
    await queryAsync(
      "UPDATE dai_incrementid SET outward = ?, invoice = ? WHERE company = ?",
      [nextOutward, nextInvoice, companyId]
    );
  }

  return { companyId, total, updated, nextOutward, nextInvoice };
}

async function renumberInwardMemoInvoicesForCompany(companyId) {
  const rows = await queryAsync(
    `SELECT id, invoiceno, products
     FROM dai_inward
     WHERE (company = ? OR company = ?)
       AND LOWER(TRIM(inward_type)) IN ('memo','consign','in_memo','in_consign')
       AND (deleted = 0 OR deleted IS NULL)
     ORDER BY COALESCE(date, invoicedate, '1970-01-01') ASC, id ASC`,
    [companyId, String(companyId)]
  );

  let updated = 0;
  let n = 0;
  for (const row of rows) {
    n += 1;
    const nextInvoice = `INV-${n}`;
    const oldInvoice = String(row.invoiceno ?? "");
    if (oldInvoice === nextInvoice) continue;

    await queryAsync("UPDATE dai_inward SET invoiceno = ? WHERE id = ?", [
      nextInvoice,
      row.id,
    ]);

    const pids = String(row.products || "")
      .split(",")
      .map((x) => String(x).trim())
      .filter(Boolean);
    if (pids.length) {
      const ph = pids.map(() => "?").join(",");
      await queryAsync(
        `UPDATE dai_history SET invoice = ?
         WHERE product_id IN (${ph})
           AND (
             CAST(invoice AS CHAR) = ?
             OR CAST(invoice AS CHAR) = ?
           )
           AND LOWER(TRIM(action)) IN ('in_memo','in_consign','memo','inward')`,
        [nextInvoice, ...pids, oldInvoice, String(extractSeq(oldInvoice) || oldInvoice)]
      );
    }

    updated += 1;
  }
  return { companyId, total: rows.length, updated, nextInvoice: String(n + 1 || 1) };
}

async function fixDuplicateMemoEntryNos() {
  const companies = await queryAsync(
    `SELECT DISTINCT company FROM dai_outward
     WHERE company IS NOT NULL AND company <> ''
       AND LOWER(TRIM(type)) IN ('memo', 'consign', 'sale', 'export', 'lab')`
  );

  const results = [];
  for (const c of companies) {
    const companyId = c.company;
    // Always run (idempotent) so sale INV-n / memo-n stay in sync after format changes
    const result = await renumberOutwardForCompany(companyId);
    if (result.updated > 0) {
      results.push(result);
      console.log(
        `[renumberOutwardEntry] company=${result.companyId} updated ${result.updated}/${result.total} → entry ${result.nextOutward}, invoice ${result.nextInvoice}`
      );
    }
  }

  const inwardCompanies = await queryAsync(
    `SELECT DISTINCT company FROM dai_inward
     WHERE company IS NOT NULL AND company <> ''
       AND LOWER(TRIM(inward_type)) IN ('memo','consign','in_memo','in_consign')
       AND (deleted = 0 OR deleted IS NULL)`
  );
  for (const c of inwardCompanies) {
    const result = await renumberInwardMemoInvoicesForCompany(c.company);
    if (result.updated > 0) {
      results.push(result);
      console.log(
        `[renumberInwardMemoInvoice] company=${result.companyId} updated ${result.updated}/${result.total} → next ${result.nextInvoice}`
      );
    }
  }

  return results;
}

module.exports = {
  fixDuplicateMemoEntryNos,
  renumberOutwardForCompany,
  renumberInwardMemoInvoicesForCompany,
  renumberMemoEntryNosForCompany: renumberOutwardForCompany,
};
