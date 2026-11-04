const fs = require('fs');
const path = require('path');

function replaceInFile(relPath, replacements) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  let content = fs.readFileSync(fullPath, 'utf8');
  let count = 0;

  for (const { target, replacement, description } of replacements) {
    // Normalize newlines for matching
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
      console.log(`[OK] ${relPath}: ${description}`);
      count++;
    } else {
      console.warn(`[WARN] Target not found in ${relPath}: ${description}`);
    }
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${relPath} with ${count} replacement(s).\n`);
}

// 1. boxParcelService.js
replaceInFile('routes/product/boxParcelService.js', [
  {
    description: 'attachStonesToContainer stone update',
    target: '`UPDATE dai_product SET visibility = 0, parent_id = ?, ${containerField} = ? WHERE id = ? AND company = ?`,',
    replacement: '`UPDATE dai_product SET visibility = 0, parent_id = ?, ${containerField} = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`,',
  },
  {
    description: 'attachStonesToContainer container update',
    target: '`UPDATE dai_product SET polish_pcs = ?, polish_carat = ?, onhand_pcs = ?, onhand_carat = ?, amount = ?, price = ?, child_count = ?, ${productsField} = ? WHERE id = ? AND company = ?`,',
    replacement: '`UPDATE dai_product SET polish_pcs = ?, polish_carat = ?, onhand_pcs = ?, onhand_carat = ?, amount = ?, price = ?, child_count = ?, ${productsField} = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`,',
  },
  {
    description: 'createContainerWithStones stone update',
    target: '`UPDATE dai_product SET visibility = 0, parent_id = ?, ${containerField} = ? WHERE id = ?`,',
    replacement: '`UPDATE dai_product SET visibility = 0, parent_id = ?, ${containerField} = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`,',
  },
  {
    description: 'getCategorizeTree active product count',
    target: '`SELECT category, COUNT(*) AS cnt FROM dai_product WHERE visibility = 1 AND category IS NOT NULL AND category <> \'\' GROUP BY category`,',
    replacement: '`SELECT category, COUNT(*) AS cnt FROM dai_product WHERE visibility = 1 AND category IS NOT NULL AND category <> \'\' AND (deleted = 0 OR deleted IS NULL) GROUP BY category`,',
  },
  {
    description: 'assignCategory category lookup',
    target: '"SELECT id, name FROM category WHERE id = ? LIMIT 1",',
    replacement: '"SELECT id, name FROM category WHERE id = ? AND (deleted = 0 OR deleted IS NULL) LIMIT 1",',
  },
  {
    description: 'assignCategory stone lookup',
    target: 'WHERE p.id IN (${placeholders})`,',
    replacement: 'WHERE p.id IN (${placeholders}) AND (p.deleted = 0 OR p.deleted IS NULL)`,',
  },
  {
    description: 'assignCategory stone update',
    target: '`UPDATE dai_product SET category = ? WHERE id IN (${placeholders})`,',
    replacement: '`UPDATE dai_product SET category = ? WHERE id IN (${placeholders}) AND (deleted = 0 OR deleted IS NULL)`,',
  },
  {
    description: 'getCategoryStats category lookup',
    target: '`SELECT DISTINCT name FROM category WHERE id IN (${idPlaceholders})`,',
    replacement: '`SELECT DISTINCT name FROM category WHERE id IN (${idPlaceholders}) AND (deleted = 0 OR deleted IS NULL)`,',
  },
  {
    description: 'getCategoryStats product metrics',
    target: 'FROM dai_product WHERE visibility = 1 AND category IN (${placeholders})`,',
    replacement: 'FROM dai_product WHERE visibility = 1 AND category IN (${placeholders}) AND (deleted = 0 OR deleted IS NULL)`,',
  },
  {
    description: 'assignPair update stone 1',
    target: '"UPDATE dai_product SET pair = ?, site_upload = 0, rapnet_upload = 0 WHERE id = ?",\n    [stone2.sku, stone1.id],',
    replacement: '"UPDATE dai_product SET pair = ?, site_upload = 0, rapnet_upload = 0 WHERE id = ? AND (deleted = 0 OR deleted IS NULL)",\n    [stone2.sku, stone1.id],',
  },
  {
    description: 'assignPair update stone 2',
    target: '"UPDATE dai_product SET pair = ?, site_upload = 0, rapnet_upload = 0 WHERE id = ?",\n    [stone1.sku, stone2.id],',
    replacement: '"UPDATE dai_product SET pair = ?, site_upload = 0, rapnet_upload = 0 WHERE id = ? AND (deleted = 0 OR deleted IS NULL)",\n    [stone1.sku, stone2.id],',
  },
  {
    description: 'unpairProducts stone unpair',
    target: '"UPDATE dai_product SET pair = \'\', site_upload = 0, rapnet_upload = 0 WHERE id = ?",',
    replacement: '"UPDATE dai_product SET pair = \'\', site_upload = 0, rapnet_upload = 0 WHERE id = ? AND (deleted = 0 OR deleted IS NULL)",',
  },
  {
    description: 'unpairProducts partner unpair',
    target: '"UPDATE dai_product SET pair = \'\', site_upload = 0, rapnet_upload = 0 WHERE sku = ? AND id <> ?",',
    replacement: '"UPDATE dai_product SET pair = \'\', site_upload = 0, rapnet_upload = 0 WHERE sku = ? AND id <> ? AND (deleted = 0 OR deleted IS NULL)",',
  },
  {
    description: 'findPairCandidates deleted filter',
    target: 'WHERE p.company = ? AND p.visibility = 1 AND p.id <> ?',
    replacement: 'WHERE p.company = ? AND p.visibility = 1 AND p.id <> ? AND (p.deleted = 0 OR p.deleted IS NULL)',
  },
  {
    description: 'unboxStonesFromContainer stone restore',
    target: '`UPDATE dai_product SET visibility = 1, parent_id = 0, ${containerField} = NULL, rapnet_upload = 0 WHERE id = ? AND company = ?`,',
    replacement: '`UPDATE dai_product SET visibility = 1, parent_id = 0, ${containerField} = NULL, rapnet_upload = 0 WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`,',
  },
  {
    description: 'unboxStonesFromContainer container update',
    target: '`UPDATE dai_product SET polish_pcs = ?, polish_carat = ?, onhand_pcs = ?, onhand_carat = ?, amount = ?, price = ?, child_count = ?, ${productsField} = ? WHERE id = ? AND company = ?`,',
    replacement: '`UPDATE dai_product SET polish_pcs = ?, polish_carat = ?, onhand_pcs = ?, onhand_carat = ?, amount = ?, price = ?, child_count = ?, ${productsField} = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`,',
  },
  {
    description: 'separateContainerStones container deduct',
    target: '`UPDATE dai_product SET polish_pcs = ?, polish_carat = ?, onhand_pcs = ?, onhand_carat = ?, amount = ?, price = ? WHERE id = ? AND company = ?`,',
    replacement: '`UPDATE dai_product SET polish_pcs = ?, polish_carat = ?, onhand_pcs = ?, onhand_carat = ?, amount = ?, price = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)`,',
  },
]);

// 2. productRoutes.js (package assign)
replaceInFile('routes/product/productRoutes.js', [
  {
    description: 'package assign update',
    target: '"UPDATE dai_product_value SET package = ? WHERE product_id = ?",',
    replacement: '"UPDATE dai_product_value SET package = ? WHERE product_id = ? AND (deleted = 0 OR deleted IS NULL)",',
  },
]);

// 3. transactionStockService.js (outwardToExport)
replaceInFile('routes/transaction/transactionStockService.js', [
  {
    description: 'outwardToExport update',
    target: 'WHERE id = ?`,\n    [\n      newType,\n      newStatus,\n      post.shipping_name != null ? String(post.shipping_name) : (oData.shipping_name || ""),',
    replacement: 'WHERE id = ? AND (deleted = 0 OR deleted IS NULL)`,\n    [\n      newType,\n      newStatus,\n      post.shipping_name != null ? String(post.shipping_name) : (oData.shipping_name || ""),',
  },
]);

console.log('Phase 3 Subpart 2(c) script completed.');

