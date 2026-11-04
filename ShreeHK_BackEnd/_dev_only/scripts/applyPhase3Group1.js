const fs = require('fs');
const path = require('path');

function normalizeNewlines(str) {
  return str.replace(/\r\n/g, '\n');
}

function patchFile(filePath, transforms) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  let rawContent = fs.readFileSync(fullPath, 'utf8');
  const isCrlf = rawContent.includes('\r\n');
  let content = normalizeNewlines(rawContent);
  let modified = false;

  for (const { name, search, replace } of transforms) {
    const normSearch = typeof search === 'string' ? normalizeNewlines(search) : search;
    const normReplace = typeof replace === 'string' ? normalizeNewlines(replace) : replace;

    if (typeof normSearch === 'string') {
      if (!content.includes(normSearch)) {
        console.error(`[FAIL] ${filePath} - ${name}: search string not found`);
        continue;
      }
      content = content.replace(normSearch, normReplace);
      modified = true;
      console.log(`[OK] ${filePath} - ${name}`);
    } else if (normSearch instanceof RegExp) {
      if (!normSearch.test(content)) {
        console.error(`[FAIL] ${filePath} - ${name}: regex pattern not matched`);
        continue;
      }
      content = content.replace(normSearch, normReplace);
      modified = true;
      console.log(`[OK] ${filePath} - ${name}`);
    }
  }

  if (modified) {
    const finalContent = isCrlf ? content.replace(/\n/g, '\r\n') : content;
    fs.writeFileSync(fullPath, finalContent, 'utf8');
    console.log(`Saved: ${filePath}\n`);
  } else {
    console.log(`No changes made to: ${filePath}\n`);
  }
}

console.log('--- Applying Phase 3 Group 1 Patches ---\n');

// 1. categoryRoutes.js
patchFile('routes/master/categoryRoutes.js', [
  {
    name: 'category listing dataSql deleted filter',
    search: `          WHERE c.company = ?
        \`;
        let countSql = \`SELECT COUNT(*) as totalItems FROM category WHERE company = ?\`;`,
    replace: `          WHERE c.company = ? AND (c.deleted = 0 OR c.deleted IS NULL)
        \`;
        let countSql = \`SELECT COUNT(*) as totalItems FROM category WHERE company = ? AND (deleted = 0 OR deleted IS NULL)\`;`,
  },
]);

// 2. labRoutes.js
patchFile('routes/master/labRoutes.js', [
  {
    name: 'lab listing deleted filter',
    search: `        let dataSql = \`SELECT * FROM dai_lab WHERE company = ?\`;
        let countSql = \`SELECT COUNT(*) as totalItems FROM dai_lab WHERE company = ?\`;`,
    replace: `        let dataSql = \`SELECT * FROM dai_lab WHERE company = ? AND (deleted = 0 OR deleted IS NULL)\`;
        let countSql = \`SELECT COUNT(*) as totalItems FROM dai_lab WHERE company = ? AND (deleted = 0 OR deleted IS NULL)\`;`,
  },
]);

// 3. originRoutes.js
patchFile('routes/master/originRoutes.js', [
  {
    name: 'origin listing deleted filter',
    search: `        let dataSql = \`SELECT * FROM dai_origin WHERE company = ?\`;
        let countSql = \`SELECT COUNT(*) as totalItems FROM dai_origin WHERE company = ?\`;`,
    replace: `        let dataSql = \`SELECT * FROM dai_origin WHERE company = ? AND (deleted = 0 OR deleted IS NULL)\`;
        let countSql = \`SELECT COUNT(*) as totalItems FROM dai_origin WHERE company = ? AND (deleted = 0 OR deleted IS NULL)\`;`,
  },
]);

// 4. shippingRoutes.js
patchFile('routes/master/shippingRoutes.js', [
  {
    name: 'shipping listing deleted filter',
    search: `        let dataSql = \`SELECT * FROM dai_shipping WHERE company = ?\`;
        let countSql = \`SELECT COUNT(*) as totalItems FROM dai_shipping WHERE company = ?\`;`,
    replace: `        let dataSql = \`SELECT * FROM dai_shipping WHERE company = ? AND (deleted = 0 OR deleted IS NULL)\`;
        let countSql = \`SELECT COUNT(*) as totalItems FROM dai_shipping WHERE company = ? AND (deleted = 0 OR deleted IS NULL)\`;`,
  },
]);

// 5. attributeRoutes.js
patchFile('routes/master/attributeRoutes.js', [
  {
    name: 'attribute listing deleted filter',
    search: 'let query = `SELECT * FROM dai_attribute WHERE company = ?`;',
    replace: 'let query = `SELECT * FROM dai_attribute WHERE company = ? AND (deleted = 0 OR deleted IS NULL)`;',
  },
  {
    name: 'attribute getOption dropdown deleted filter',
    search: 'SELECT code, name, value FROM dai_attribute WHERE company = ? ORDER BY short_order',
    replace: 'SELECT code, name, value FROM dai_attribute WHERE company = ? AND (deleted = 0 OR deleted IS NULL) ORDER BY short_order',
  },
]);

// 6. companyRoutes.js (Party Master)
patchFile('routes/master/companyRoutes.js', [
  {
    name: 'party listing deleted filter',
    search: `  let query = \`SELECT * FROM dai_party WHERE company = ? \`;
  let countQuery = \`SELECT COUNT(*) as totalItems FROM dai_party WHERE company = ? \`;`,
    replace: `  let query = \`SELECT * FROM dai_party WHERE company = ? AND (deleted = 0 OR deleted IS NULL) \`;
  let countQuery = \`SELECT COUNT(*) as totalItems FROM dai_party WHERE company = ? AND (deleted = 0 OR deleted IS NULL) \`;`,
  },
  {
    name: 'party getOption dropdown deleted filter',
    search: `  const query = allCompanies
    ? \`SELECT id, name, address, country, pincode, email, contact_number, fax, contact_person, company
       FROM dai_party
       ORDER BY name\`
    : \`SELECT id, name, address, country, pincode, email, contact_number, fax, contact_person
       FROM dai_party
       WHERE company = ?
       ORDER BY name\`;`,
    replace: `  const query = allCompanies
    ? \`SELECT id, name, address, country, pincode, email, contact_number, fax, contact_person, company
       FROM dai_party
       WHERE (deleted = 0 OR deleted IS NULL)
       ORDER BY name\`
    : \`SELECT id, name, address, country, pincode, email, contact_number, fax, contact_person
       FROM dai_party
       WHERE company = ? AND (deleted = 0 OR deleted IS NULL)
       ORDER BY name\`;`,
  },
]);

// 7. PartyWiseTransaction.js
patchFile('routes/accounting/PartyWiseTransaction.js', [
  {
    name: 'party wise transaction listing deleted filter',
    search: `    const countQuery = \`SELECT COUNT(*) AS total FROM dai_party WHERE company = ?\`;
    const query = \`SELECT id, under_group, under_subgroup, address, contact_number, name FROM dai_party WHERE company = ? ORDER BY id DESC LIMIT ? OFFSET ?\`;`,
    replace: `    const countQuery = \`SELECT COUNT(*) AS total FROM dai_party WHERE company = ? AND (deleted = 0 OR deleted IS NULL)\`;
    const query = \`SELECT id, under_group, under_subgroup, address, contact_number, name FROM dai_party WHERE company = ? AND (deleted = 0 OR deleted IS NULL) ORDER BY id DESC LIMIT ? OFFSET ?\`;`,
  },
]);

// 8. accGroupRoutes.js
patchFile('routes/accounting/accGroupRoutes.js', [
  {
    name: 'acc_group listing deleted filter',
    search: 'const query = "SELECT * FROM acc_group WHERE (company = ? OR company = 1 OR company IS NULL) ORDER BY name";',
    replace: 'const query = "SELECT * FROM acc_group WHERE (company = ? OR company = 1 OR company IS NULL) AND (deleted = 0 OR deleted IS NULL) ORDER BY name";',
  },
]);

// 9. accSubgroupRoutes.js
patchFile('routes/accounting/accSubgroupRoutes.js', [
  {
    name: 'acc_subgroup listing deleted filter',
    search: 'WHERE (s.company = ? OR s.company = 1 OR s.company IS NULL)',
    replace: 'WHERE (s.company = ? OR s.company = 1 OR s.company IS NULL) AND (s.deleted = 0 OR s.deleted IS NULL)',
  },
]);

// 10. transactionRepository.js (Distinct books dropdown)
patchFile('repositories/accounting/transactionRepository.js', [
  {
    name: 'getDistinctBooksFromDb deleted filter',
    search: `  const sql = \`SELECT DISTINCT TRIM(book) AS name
               FROM dai_book
               WHERE (company = ? OR company IS NULL) AND book IS NOT NULL AND TRIM(book) <> ''
               ORDER BY name\`;`,
    replace: `  const sql = \`SELECT DISTINCT TRIM(book) AS name
               FROM dai_book
               WHERE (company = ? OR company IS NULL) AND book IS NOT NULL AND TRIM(book) <> '' AND (deleted = 0 OR deleted IS NULL)
               ORDER BY name\`;`,
  },
]);

// 11. balanceBookRoutes.js
patchFile('routes/my_Balance/balanceBookRoutes.js', [
  {
    name: 'dai_book listing deleted filter (all and company)',
    search: `        FROM dai_book
        ORDER BY book ASC, currency ASC, id ASC
        \`
        : \`
        SELECT id,
               book AS bank,
               currency,
               balance AS cash,
               company,
               0 AS credit
        FROM dai_book
        WHERE company = ?
        ORDER BY book ASC, currency ASC, id ASC`,
    replace: `        FROM dai_book
        WHERE (deleted = 0 OR deleted IS NULL)
        ORDER BY book ASC, currency ASC, id ASC
        \`
        : \`
        SELECT id,
               book AS bank,
               currency,
               balance AS cash,
               company,
               0 AS credit
        FROM dai_book
        WHERE company = ? AND (deleted = 0 OR deleted IS NULL)
        ORDER BY book ASC, currency ASC, id ASC`,
  },
]);

// 12. Currency_Rate.js
patchFile('routes/my_Balance/Currency_Rate.js', [
  {
    name: 'currency rate listing deleted filter',
    search: 'const query = `SELECT id, currency, USD, HKD FROM dai_currencyrate WHERE company = ?`;',
    replace: 'const query = `SELECT id, currency, USD, HKD FROM dai_currencyrate WHERE company = ? AND (deleted = 0 OR deleted IS NULL)`;',
  },
]);

// 13. addAdminUserRoutes.js
patchFile('routes/adminUser/addAdminUserRoutes.js', [
  {
    name: 'getAdminManageUser listing deleted filter',
    search: `        FROM user u
        LEFT JOIN user cb ON u.created_by = cb.user_id
    \`);`,
    replace: `        FROM user u
        LEFT JOIN user cb ON u.created_by = cb.user_id
        WHERE (u.deleted = 0 OR u.deleted IS NULL)
    \`);`,
  },
  {
    name: 'getLoginAllUsers listing deleted filter',
    search: `        FROM user
    \`;`,
    replace: `        FROM user
        WHERE (deleted = 0 OR deleted IS NULL)
    \`;`,
  },
]);

// 14. myProfile.js
patchFile('routes/my_Profile/myProfile.js', [
  {
    name: 'admin users listing deleted filter',
    search: `        FROM user
        ORDER BY roll ASC, first_name ASC`,
    replace: `        FROM user
        WHERE (deleted = 0 OR deleted IS NULL)
        ORDER BY roll ASC, first_name ASC`,
  },
]);

// 15. rollRoutes.js
patchFile('routes/adminUser/rollRoutes.js', [
  {
    name: 'role listing deleted filter',
    search: "helper.query(`SELECT id, name, resource, date, company FROM roll ORDER BY id ASC`),",
    replace: "helper.query(`SELECT id, name, resource, date, company FROM roll WHERE (deleted = 0 OR deleted IS NULL) ORDER BY id ASC`),",
  },
]);

// 16. branchRoutes.js
patchFile('routes/admin/branchRoutes.js', [
  {
    name: 'branch options dropdown deleted filter',
    search: '"SELECT id, name, shortcutName, color_code FROM branch WHERE status = 1 ORDER BY name ASC"',
    replace: '"SELECT id, name, shortcutName, color_code FROM branch WHERE status = 1 AND (deleted = 0 OR deleted IS NULL) ORDER BY name ASC"',
  },
  {
    name: 'branch listing company subquery and branch deleted filter',
    search: `        (SELECT COUNT(*) FROM company c WHERE c.branch_id = b.id) AS company_count,
        (SELECT GROUP_CONCAT(c.name ORDER BY c.id SEPARATOR '||')
           FROM company c WHERE c.branch_id = b.id) AS company_names
      FROM branch b`,
    replace: `        (SELECT COUNT(*) FROM company c WHERE c.branch_id = b.id AND (c.deleted = 0 OR c.deleted IS NULL)) AS company_count,
        (SELECT GROUP_CONCAT(c.name ORDER BY c.id SEPARATOR '||')
           FROM company c WHERE c.branch_id = b.id AND (c.deleted = 0 OR c.deleted IS NULL)) AS company_names
      FROM branch b`,
  },
]);

// 17. tenantCompanyRoutes.js
patchFile('routes/admin/tenantCompanyRoutes.js', [
  {
    name: 'tenant-company options dropdown deleted filter',
    search: `       FROM company c
       LEFT JOIN branch b ON b.id = c.branch_id
       ORDER BY c.name ASC`,
    replace: `       FROM company c
       LEFT JOIN branch b ON b.id = c.branch_id
       WHERE (c.deleted = 0 OR c.deleted IS NULL)
       ORDER BY c.name ASC`,
  },
  {
    name: 'tenant-company listing deleted filter',
    search: '    const where = [];',
    replace: '    const where = ["(c.deleted = 0 OR c.deleted IS NULL)"];',
  },
]);

// 18. portalRoutes.js
patchFile('routes/portal/portalRoutes.js', [
  {
    name: 'portal options company_year deleted filter',
    search: '`SELECT id, year, fromDate, toDate, db_name FROM company_year ORDER BY id DESC`',
    replace: '`SELECT id, year, fromDate, toDate, db_name FROM company_year WHERE (deleted = 0 OR deleted IS NULL) ORDER BY id DESC`',
  },
  {
    name: 'portal options companies deleted filter',
    search: `       FROM company c
       LEFT JOIN branch b ON b.id = c.branch_id
       ORDER BY COALESCE(b.name, 'zzz'), c.name ASC\``,
    replace: `       FROM company c
       LEFT JOIN branch b ON b.id = c.branch_id
       WHERE (c.deleted = 0 OR c.deleted IS NULL)
       ORDER BY COALESCE(b.name, 'zzz'), c.name ASC\``,
  },
  {
    name: 'portal branch-companies dropdown deleted filter',
    search: `         FROM company c
         LEFT JOIN branch b ON b.id = c.branch_id
         WHERE c.branch_id = ?
         ORDER BY c.name ASC\``,
    replace: `         FROM company c
         LEFT JOIN branch b ON b.id = c.branch_id
         WHERE c.branch_id = ? AND (c.deleted = 0 OR c.deleted IS NULL)
         ORDER BY c.name ASC\``,
  },
  {
    name: 'portal years list deleted filter',
    search: '`SELECT id, year, fromDate, toDate, db_name FROM company_year ORDER BY id DESC`',
    replace: '`SELECT id, year, fromDate, toDate, db_name FROM company_year WHERE (deleted = 0 OR deleted IS NULL) ORDER BY id DESC`',
  },
]);

// 19. boxParcelService.js (category tree)
patchFile('routes/product/boxParcelService.js', [
  {
    name: 'category tree deleted filter',
    search: '`SELECT id, name, parent FROM category ORDER BY name`',
    replace: '`SELECT id, name, parent FROM category WHERE (deleted = 0 OR deleted IS NULL) ORDER BY name`',
  },
]);

// 20. inventorySuggestService.js (autocomplete)
patchFile('routes/product/inventorySuggestService.js', [
  {
    name: 'inventory suggestions autocomplete deleted filter',
    search: 'WHERE p.company IN (${companyPlaceholders}) AND p.visibility = 1',
    replace: 'WHERE p.company IN (${companyPlaceholders}) AND p.visibility = 1 AND (p.deleted = 0 OR p.deleted IS NULL) AND (pv.deleted = 0 OR pv.deleted IS NULL)',
  },
]);

console.log('--- Phase 3 Group 1 Patches Completed ---\n');

