const fs = require('fs');
const path = require('path');

function replaceInFile(relPath, replacements) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  let content = fs.readFileSync(fullPath, 'utf8');
  let count = 0;

  for (const { target, replacement, description } of replacements) {
    const normTargetCRLF = target.replace(/\r?\n/g, '\r\n');
    const normTargetLF = target.replace(/\r?\n/g, '\n');

    let matched = false;
    if (content.includes(normTargetCRLF)) {
      content = content.replace(normTargetCRLF, replacement.replace(/\r?\n/g, '\r\n'));
      matched = true;
    } else if (content.includes(normTargetLF)) {
      content = content.replace(normTargetLF, replacement.replace(/\r?\n/g, '\n'));
      matched = true;
    }

    if (matched) {
      count++;
      console.log(`  [OK] ${description}`);
    } else {
      console.error(`  [FAIL] Could not match target for: ${description}`);
    }
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${relPath} (${count}/${replacements.length} replaced)\n`);
}

console.log('=== Applying Sub-part 2(d) + Group 4 Filters ===\n');

// 1. reportRoutes.js
replaceInFile('routes/report/reportRoutes.js', [
  {
    description: 'POST /report/outstanding (sale branch)',
    target: `                         WHERE o.company = ?\n                         AND o.type IN ('sale', 'export')`,
    replacement: `                         WHERE o.company = ?\n                         AND (o.deleted = 0 OR o.deleted IS NULL)\n                         AND o.type IN ('sale', 'export')`,
  },
  {
    description: 'POST /report/outstandingRecords (sale branch)',
    target: `               WHERE o.id = ? AND o.company = ?\`;`,
    replacement: `               WHERE o.id = ? AND o.company = ? AND (o.deleted = 0 OR o.deleted IS NULL)\`;`,
  },
  {
    description: 'POST /report/outstandingRecords (purchase branch)',
    target: `               WHERE o.id = ? AND o.company = ?\`;\n    } else {`,
    replacement: `               WHERE o.id = ? AND o.company = ? AND (o.deleted = 0 OR o.deleted IS NULL)\`;\n    } else {`,
  },
  {
    description: 'POST /report/outstanding/charge (guard deleted)',
    target: `const rows = await reportQuery(\`SELECT * FROM \${target.table} WHERE id = ? AND company = ?\`, [id, companyId]);`,
    replacement: `const rows = await reportQuery(\`SELECT * FROM \${target.table} WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)\`, [id, companyId]);`,
  },
  {
    description: 'POST /report/outstanding/installment (guard deleted)',
    target: `const rows = await q(\`SELECT * FROM \${target.table} WHERE id = ? AND company = ? FOR UPDATE\`, [id, companyId]);`,
    replacement: `const rows = await q(\`SELECT * FROM \${target.table} WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL) FOR UPDATE\`, [id, companyId]);`,
  },
]);

// 2. reportService.js
replaceInFile('routes/report/reportService.js', [
  {
    description: 'getGroupReport (outward branch)',
    target: `    let sql = \`SELECT * FROM dai_outward WHERE company = ?\${userFilter}\${statusSql}\${typeSql}\${partyFilter.sql}\${dateCol.sql}\${productsClause} ORDER BY date DESC, id DESC\`;\n    const values = [companyId];\n    if (typeVal) values.push(typeVal);\n    values.push(...partyFilter.values, ...dateCol.values);\n\n    if (!typeVal) {\n      sql = \`SELECT * FROM dai_outward WHERE company = ?\${userFilter}\${statusSql}\${typeSql}\${partyFilter.sql}\${dateCol.sql}\${productsClause} ORDER BY date DESC, id DESC\`;\n    }`,
    replacement: `    let sql = \`SELECT * FROM dai_outward WHERE company = ? AND (deleted = 0 OR deleted IS NULL)\${userFilter}\${statusSql}\${typeSql}\${partyFilter.sql}\${dateCol.sql}\${productsClause} ORDER BY date DESC, id DESC\`;\n    const values = [companyId];\n    if (typeVal) values.push(typeVal);\n    values.push(...partyFilter.values, ...dateCol.values);\n\n    if (!typeVal) {\n      sql = \`SELECT * FROM dai_outward WHERE company = ? AND (deleted = 0 OR deleted IS NULL)\${userFilter}\${statusSql}\${typeSql}\${partyFilter.sql}\${dateCol.sql}\${productsClause} ORDER BY date DESC, id DESC\`;\n    }`,
  },
  {
    description: 'getGroupReport (purchase branch allow NULL)',
    target: `const sql = \`SELECT * FROM dai_inward WHERE deleted = 0 AND company = ?\${userFilter}`,
    replacement: `const sql = \`SELECT * FROM dai_inward WHERE (deleted = 0 OR deleted IS NULL) AND company = ?\${userFilter}`,
  },
  {
    description: 'getStoneSaleReport (outward branch)',
    target: `const outwardSql = \`SELECT * FROM dai_outward WHERE products <> ''\${companySql}`,
    replacement: `const outwardSql = \`SELECT * FROM dai_outward WHERE products <> '' AND (deleted = 0 OR deleted IS NULL)\${companySql}`,
  },
  {
    description: 'getFilterOptions (main_group and sub_group)',
    target: `    queryAsync(\n      "SELECT DISTINCT main_group AS value FROM dai_product WHERE company = ? AND main_group <> ''",\n      [companyId]\n    ),\n    queryAsync(\n      "SELECT DISTINCT sub_group AS value FROM dai_product WHERE company = ? AND sub_group <> ''",\n      [companyId]\n    ),`,
    replacement: `    queryAsync(\n      "SELECT DISTINCT main_group AS value FROM dai_product WHERE company = ? AND (deleted = 0 OR deleted IS NULL) AND main_group <> ''",\n      [companyId]\n    ),\n    queryAsync(\n      "SELECT DISTINCT sub_group AS value FROM dai_product WHERE company = ? AND (deleted = 0 OR deleted IS NULL) AND sub_group <> ''",\n      [companyId]\n    ),`,
  },
  {
    description: 'getOutwardTransactionRows',
    target: `const outwardSql = \`SELECT * FROM dai_outward WHERE company = ?\${userFilter}\${statusSql}\${typeSql}\${partyFilter.sql}\${dateFilter.sql}\${invoiceFilter.sql}\${productsClause} ORDER BY date DESC, id DESC LIMIT ?\`;`,
    replacement: `const outwardSql = \`SELECT * FROM dai_outward WHERE company = ? AND (deleted = 0 OR deleted IS NULL)\${userFilter}\${statusSql}\${typeSql}\${partyFilter.sql}\${dateFilter.sql}\${invoiceFilter.sql}\${productsClause} ORDER BY date DESC, id DESC LIMIT ?\`;`,
  },
]);

// 3. inventoryTools.js
replaceInFile('services/ai/tools/inventoryTools.js', [
  {
    description: 'searchInventory (active products)',
    target: `    FROM dai_product p\n    LEFT JOIN dai_product_value pv ON p.id = pv.product_id\n    WHERE p.company = ?`,
    replacement: `    FROM dai_product p\n    LEFT JOIN dai_product_value pv ON p.id = pv.product_id\n    WHERE p.company = ? AND (p.deleted = 0 OR p.deleted IS NULL)`,
  },
  {
    description: 'queryStonesByStatus (active products)',
    target: `    FROM dai_product p\n    LEFT JOIN dai_product_value pv ON p.id = pv.product_id\n    WHERE p.company = ? \${extraWhere}`,
    replacement: `    FROM dai_product p\n    LEFT JOIN dai_product_value pv ON p.id = pv.product_id\n    WHERE p.company = ? AND (p.deleted = 0 OR p.deleted IS NULL) \${extraWhere}`,
  },
]);

// 4. partyTransactionTools.js
replaceInFile('services/ai/tools/partyTransactionTools.js', [
  {
    description: 'getPartiesList (active parties)',
    target: `    SELECT id, name, type, country, contact_person, contact_number, email, address\n    FROM dai_party\n    WHERE company = ?`,
    replacement: `    SELECT id, name, type, country, contact_person, contact_number, email, address\n    FROM dai_party\n    WHERE company = ? AND (deleted = 0 OR deleted IS NULL)`,
  },
  {
    description: 'getPartyOutstanding (outward receivables)',
    target: `    SELECT id, entryno, invoiceno, date, duedate, type, status, final_amount, paid_amount, due_amount\n    FROM dai_outward\n    WHERE company = ? AND party = ? AND due_amount <> 0 AND (type = 'sale' OR type = 'export')`,
    replacement: `    SELECT id, entryno, invoiceno, date, duedate, type, status, final_amount, paid_amount, due_amount\n    FROM dai_outward\n    WHERE company = ? AND party = ? AND due_amount <> 0 AND (type = 'sale' OR type = 'export') AND (deleted = 0 OR deleted IS NULL)`,
  },
  {
    description: 'getPartyTransactions (outward dir)',
    target: `      SELECT 'OUTWARD' AS dir, id, entryno AS ref, type AS txn_type, status, date AS txn_date, final_amount AS amount\n      FROM dai_outward\n      WHERE company = ? AND party = ?`,
    replacement: `      SELECT 'OUTWARD' AS dir, id, entryno AS ref, type AS txn_type, status, date AS txn_date, final_amount AS amount\n      FROM dai_outward\n      WHERE company = ? AND party = ? AND (deleted = 0 OR deleted IS NULL)`,
  },
  {
    description: 'getOutwardStock (active outwards)',
    target: `    FROM dai_outward o\n    LEFT JOIN dai_party p ON o.party = p.id\n    WHERE o.company = ?`,
    replacement: `    FROM dai_outward o\n    LEFT JOIN dai_party p ON o.party = p.id\n    WHERE o.company = ? AND (o.deleted = 0 OR o.deleted IS NULL)`,
  },
  {
    description: 'getOutstandingSummary (outward receivables)',
    target: `    SELECT COALESCE(SUM(due_amount), 0) AS total_receivable, COUNT(id) AS open_sales_count\n    FROM dai_outward\n    WHERE company = ? AND due_amount <> 0 AND (type = 'sale' OR type = 'export')`,
    replacement: `    SELECT COALESCE(SUM(due_amount), 0) AS total_receivable, COUNT(id) AS open_sales_count\n    FROM dai_outward\n    WHERE company = ? AND due_amount <> 0 AND (type = 'sale' OR type = 'export') AND (deleted = 0 OR deleted IS NULL)`,
  },
]);

// 5. analyticsAiTools.js
replaceInFile('services/ai/tools/analyticsAiTools.js', [
  {
    description: 'detectAnomalies Check 1 (low price)',
    target: `WHERE p.company = ? AND p.cost > 0 AND p.price < p.cost`,
    replacement: `WHERE p.company = ? AND (p.deleted = 0 OR p.deleted IS NULL) AND p.cost > 0 AND p.price < p.cost`,
  },
  {
    description: 'detectAnomalies Check 2 (dup certificate)',
    target: `WHERE p.company = ? AND pv.report_no IS NOT NULL AND pv.report_no <> ''`,
    replacement: `WHERE p.company = ? AND (p.deleted = 0 OR p.deleted IS NULL) AND pv.report_no IS NOT NULL AND pv.report_no <> ''`,
  },
  {
    description: 'detectAnomalies Check 3 (low rate outward)',
    target: `WHERE o.company = ? AND o.type = 'sale' AND o.final_amount > 0`,
    replacement: `WHERE o.company = ? AND (o.deleted = 0 OR o.deleted IS NULL) AND o.type = 'sale' AND o.final_amount > 0`,
  },
  {
    description: 'forecastDemand salesHistory',
    target: `WHERE p.company = ? AND p.outward IN ('sale', 'export')`,
    replacement: `WHERE p.company = ? AND (p.deleted = 0 OR p.deleted IS NULL) AND p.outward IN ('sale', 'export')`,
  },
  {
    description: 'forecastDemand availableStock',
    target: `WHERE p.company = ? AND p.visibility = 1 AND (p.outward = '' OR p.outward IS NULL)`,
    replacement: `WHERE p.company = ? AND (p.deleted = 0 OR p.deleted IS NULL) AND p.visibility = 1 AND (p.outward = '' OR p.outward IS NULL)`,
  },
  {
    description: 'suggestPrice recentSales',
    target: `WHERE p.company = ? AND p.outward IN ('sale', 'export')`,
    replacement: `WHERE p.company = ? AND (p.deleted = 0 OR p.deleted IS NULL) AND p.outward IN ('sale', 'export')`,
  },
]);

// 6. aiDataService.js
replaceInFile('services/ai/aiDataService.js', [
  {
    description: 'aiDataService ON_HAND_BASE',
    target: `  WHERE p.company = ?\n    AND p.visibility = 1`,
    replacement: `  WHERE p.company = ?\n    AND (p.deleted = 0 OR p.deleted IS NULL)\n    AND p.visibility = 1`,
  },
  {
    description: 'aiDataService getSalesLast30Days',
    target: `    WHERE o.company = ?\n      AND o.type IN ('sale', 'export')`,
    replacement: `    WHERE o.company = ?\n      AND (o.deleted = 0 OR o.deleted IS NULL)\n      AND o.type IN ('sale', 'export')`,
  },
  {
    description: 'aiDataService getPartyPurchaseHistory',
    target: `    WHERE o.company = ?\n      AND o.party = ?\n      AND o.type IN ('sale', 'export', 'memo')`,
    replacement: `    WHERE o.company = ?\n      AND (o.deleted = 0 OR o.deleted IS NULL)\n      AND o.party = ?\n      AND o.type IN ('sale', 'export', 'memo')`,
  },
  {
    description: 'aiDataService lookupProductByBarcode',
    target: `    WHERE p.company = ?\n      AND p.visibility = 1`,
    replacement: `    WHERE p.company = ?\n      AND (p.deleted = 0 OR p.deleted IS NULL)\n      AND p.visibility = 1`,
  },
]);
