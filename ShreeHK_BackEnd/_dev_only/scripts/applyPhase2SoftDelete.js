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

// 2b. transactionStockService.js
patchFile('routes/transaction/transactionStockService.js', [
  {
    name: 'deleteInwardStock soft delete in transaction',
    search: `  // 3. Atomically delete unreferenced inward stock inside transaction
  return helper.runInTransaction(async (q) => {
    for (const pid of allProductIds) {
      await q("DELETE FROM dai_product_value WHERE product_id = ?", [pid]);
      await q("DELETE FROM dai_history WHERE product_id = ?", [pid]);
      await q("DELETE FROM dai_product WHERE id = ?", [pid]);
    }
    await q("UPDATE dai_inward SET deleted = 1 WHERE id = ?", [id]);`,
    replace: `  // 3. Atomically soft delete unreferenced inward stock inside transaction
  const deletedBy = options.userId || options.userContext?.userId || null;
  return helper.runInTransaction(async (q) => {
    for (const pid of allProductIds) {
      await q("UPDATE dai_product_value SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE product_id = ? AND (deleted = 0 OR deleted IS NULL)", [deletedBy, pid]);
      await q("UPDATE dai_history SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE product_id = ? AND (deleted = 0 OR deleted IS NULL)", [deletedBy, pid]);
      await q("UPDATE dai_product SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)", [deletedBy, pid]);
    }
    await q("UPDATE dai_inward SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)", [deletedBy, id]);`,
  },
  {
    name: 'deleteGia signature accepts options and soft deletes',
    search: `async function deleteGia(id, companyId = null) {
  const oData = await getOutwardData(id, companyId);
  if (!oData) return { ok: false, message: "Record not found or access denied" };
  const products = (oData.products || "").split(",").filter(Boolean);
  for (const pid of products) {
    await query("UPDATE dai_product SET outward='', visibility=1 WHERE id = ?", [pid]);
  }
  if (companyId) {
    await query("DELETE FROM dai_outward WHERE id = ? AND company = ?", [id, companyId]);
  } else {
    await query("DELETE FROM dai_outward WHERE id = ?", [id]);
  }`,
    replace: `async function deleteGia(id, companyId = null, options = {}) {
  const oData = await getOutwardData(id, companyId);
  if (!oData) return { ok: false, message: "Record not found or access denied" };
  const deletedBy = options.userId || options.userContext?.userId || null;
  const products = (oData.products || "").split(",").filter(Boolean);
  for (const pid of products) {
    await query("UPDATE dai_product SET outward='', visibility=1 WHERE id = ?", [pid]);
  }
  if (companyId) {
    await query("UPDATE dai_outward SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)", [deletedBy, id, companyId]);
  } else {
    await query("UPDATE dai_outward SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)", [deletedBy, id]);
  }`,
  },
  {
    name: 'deleteOutwardStock soft deletes dai_outward',
    search: `    if (companyId) {
      await q("DELETE FROM dai_outward WHERE id = ? AND company = ?", [id, companyId]);
    } else {
      await q("DELETE FROM dai_outward WHERE id = ?", [id]);
    }`,
    replace: `    const deletedBy = options.userId || options.userContext?.userId || null;
    if (companyId) {
      await q("UPDATE dai_outward SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND company = ? AND (deleted = 0 OR deleted IS NULL)", [deletedBy, id, companyId]);
    } else {
      await q("UPDATE dai_outward SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND (deleted = 0 OR deleted IS NULL)", [deletedBy, id]);
    }`,
  },
]);

// 10. quickNotes, conversationDbManager, holdRepository
patchFile('services/quickNotesService.js', [
  {
    name: 'quickNotes soft delete',
    search: `  const sql = \`
    DELETE FROM dai_quick_notes
    WHERE id = ?
  \`;
  const result = await helper.query(sql, [noteId]);`,
    replace: `  const sql = \`
    UPDATE dai_quick_notes
    SET deleted = 1, deleted_at = NOW(), deleted_by = ?
    WHERE id = ? AND (deleted = 0 OR deleted IS NULL)
  \`;
  const result = await helper.query(sql, [userId, noteId]);`,
  },
]);

patchFile('services/ai/memory/conversationDbManager.js', [
  {
    name: 'conversationDbManager thread soft delete',
    search: `const sql = \`DELETE FROM dai_ai_conversation WHERE user_id = ? AND company_id = ? AND thread_id = ?\`;
    await queryMeta(sql, [uid, cid, tid]);`,
    replace: `const sql = \`UPDATE dai_ai_conversation SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE user_id = ? AND company_id = ? AND thread_id = ? AND (deleted = 0 OR deleted IS NULL)\`;
    await queryMeta(sql, [uid, uid, cid, tid]);`,
  },
]);

patchFile('routes/outward/holdRepository.js', [
  {
    name: 'holdRepository deleteHoldByProductId soft delete',
    search: `async function deleteHoldByProductId(q, productId) {
  await q(\`DELETE FROM \${TABLE_HOLD} WHERE product_id = ?\`, [String(productId)]);
}`,
    replace: `async function deleteHoldByProductId(q, productId, userId = null) {
  await q(\`UPDATE \${TABLE_HOLD} SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE product_id = ? AND (deleted = 0 OR deleted IS NULL)\`, [userId, String(productId)]);
}`,
  },
]);

console.log('Follow-up patches finished!');
