/**
 * Phase 4 Table-wise Proof of Soft-Delete
 * Creates rows across all child tables and verifies deleted = 1 and matching deleted_at timestamp.
 */

const helper = require("../helper.js");
const connection = require("../connection.js");
const { executePermanentDeleteCompany } = require("../services/permanentDeleteService.js");

async function run() {
  console.log("=== STEP 2: PHASE 4 TABLE-WISE PROOF ===");

  // 1. Create test branch and company
  const bRes = await helper.query(
    "INSERT INTO branch (name, shortcutName, status) VALUES ('PROOF-BRANCH', 'PB', 1)"
  );
  const branchId = bRes.insertId;

  const cRes = await helper.query(
    "INSERT INTO company (name, shortcutName, branch_id, number, address) VALUES ('PROOF-COMPANY', 'PC', ?, '1234567890', 'Proof Address')",
    [branchId]
  );
  const compId = cRes.insertId;

  // 2. Insert fixtures in all target tables
  // Product
  const pRes = await helper.query(
    "INSERT INTO dai_product (company, sku, polish_carat, polish_pcs, onhand_carat, onhand_pcs, amount, visibility) VALUES (?, 'PROOF-SKU-001', 1.0, 1, 1.0, 1, 1000, 1)",
    [compId]
  );
  const prodId = pRes.insertId;

  // Product Value (joins to dai_product via product_id)
  const pvRes = await helper.query(
    "INSERT INTO dai_product_value (product_id, shape, color, clarity) VALUES (?, 'ROUND', 'D', 'VVS1')",
    [prodId]
  );
  const pvPid = pvRes.insertId;

  // History (joins to dai_product via product_id)
  const hRes = await helper.query(
    "INSERT INTO dai_history (product_id, sku, date, action, party, description, user) VALUES (?, 'PROOF-SKU-001', '2026-10-31', 'inward', 1, 'Proof test', 1)",
    [prodId]
  );
  const histId = hRes.insertId;

  // GIA (matches exclusive SKU)
  const giaRes = await helper.query(
    "INSERT INTO dai_gia (sku, report, value) VALUES ('PROOF-SKU-001', 'GIA-PROOF-001', '{}')"
  );
  const giaId = giaRes.insertId;

  // Inward & Inward Item
  const inwRes = await helper.query(
    "INSERT INTO dai_inward (company, invoiceno, party, date, inward_type) VALUES (?, 'INW-PROOF-001', 1, '2026-10-31', 'purchase')",
    [compId]
  );
  const inwId = inwRes.insertId;

  const inwItemRes = await helper.query(
    "INSERT INTO dai_inward_item (inward_id, company, sku, carat, pcs) VALUES (?, ?, 'PROOF-SKU-001', 1.0, 1)",
    [inwId, compId]
  );
  const inwItemId = inwItemRes.insertId;

  // Outward & Outward Item
  const outRes = await helper.query(
    "INSERT INTO dai_outward (company, invoiceno, party, date, status) VALUES (?, 'OUT-PROOF-001', 1, '2026-10-31', 'sale')",
    [compId]
  );
  const outId = outRes.insertId;

  const outItemRes = await helper.query(
    "INSERT INTO dai_outward_item (outward_id, company, sku, carat, pcs) VALUES (?, ?, 'PROOF-SKU-001', 1.0, 1)",
    [outId, compId]
  );
  const outItemId = outItemRes.insertId;

  // Company Transfer & Transfer Item
  const trRes = await helper.query(
    "INSERT INTO dai_company_transfer (transfer_no, from_company_id, to_company_id, status) VALUES ('TR-PROOF-001', ?, 1, 'completed')",
    [compId]
  );
  const trId = trRes.insertId;

  const trItemRes = await helper.query(
    "INSERT INTO dai_company_transfer_item (transfer_id, source_product_id, sku) VALUES (?, ?, 'PROOF-SKU-001')",
    [trId, prodId]
  );
  const trItemId = trItemRes.insertId;

  // AI Conversation
  const aiRes = await helper.query(
    "INSERT INTO dai_ai_conversation (company_id, user_id, thread_id, title, messages) VALUES (?, 1, 'proof-session', 'Proof AI Conversation', '[]')",
    [compId]
  );
  const aiId = aiRes.insertId;

  // Quick Notes
  const qnRes = await helper.query(
    "INSERT INTO dai_quick_notes (company_id, user_id, text) VALUES (?, 1, 'Proof Note')",
    [compId]
  );
  const qnId = qnRes.insertId;

  // User Track (matched by company name)
  const utRes = await helper.query(
    "INSERT INTO user_track (company, user, description) VALUES ('PROOF-COMPANY', '1', 'Proof track')"
  );
  const utId = utRes.insertId;

  // Notification
  const notifRes = await helper.query(
    "INSERT INTO notification (company, user, title, message) VALUES (?, 1, 'Proof Title', 'Proof Notification')",
    [compId]
  );
  const notifId = notifRes.insertId;

  console.log("Fixtures created. Executing soft-delete on PROOF-COMPANY (ID:", compId, ")...");

  // Execute soft delete
  const delResult = await executePermanentDeleteCompany({
    companyId: compId,
    sessionCompanyId: 1, // different session company
    reqInfo: { userId: 1, userName: "proof_tester", userRole: "Super Admin" },
  });

  console.log("Delete result total affected:", delResult.total);

  // 3. Table-wise Proof Queries
  const [compCheck] = await helper.query("SELECT id, name, deleted, deleted_at, deleted_by FROM company WHERE id = ?", [compId]);
  const [pCheck] = await helper.query("SELECT id, deleted, deleted_at, deleted_by FROM dai_product WHERE id = ?", [prodId]);
  const [pvCheck] = await helper.query("SELECT pid, deleted, deleted_at, deleted_by FROM dai_product_value WHERE pid = ?", [pvPid]);
  const [hCheck] = await helper.query("SELECT id, deleted, deleted_at, deleted_by FROM dai_history WHERE id = ?", [histId]);
  const [giaCheck] = await helper.query("SELECT id, deleted, deleted_at, deleted_by FROM dai_gia WHERE id = ?", [giaId]);
  const [inwCheck] = await helper.query("SELECT id, deleted, deleted_at, deleted_by FROM dai_inward WHERE id = ?", [inwId]);
  const [inwItemCheck] = await helper.query("SELECT id, deleted, deleted_at, deleted_by FROM dai_inward_item WHERE id = ?", [inwItemId]);
  const [outCheck] = await helper.query("SELECT id, deleted, deleted_at, deleted_by FROM dai_outward WHERE id = ?", [outId]);
  const [outItemCheck] = await helper.query("SELECT id, deleted, deleted_at, deleted_by FROM dai_outward_item WHERE id = ?", [outItemId]);
  const [trCheck] = await helper.query("SELECT id, deleted, deleted_at, deleted_by FROM dai_company_transfer WHERE id = ?", [trId]);
  const [trItemCheck] = await helper.query("SELECT id, deleted, deleted_at, deleted_by FROM dai_company_transfer_item WHERE id = ?", [trItemId]);
  const [aiCheck] = await helper.query("SELECT id, deleted, deleted_at, deleted_by FROM dai_ai_conversation WHERE id = ?", [aiId]);
  const [qnCheck] = await helper.query("SELECT id, deleted, deleted_at, deleted_by FROM dai_quick_notes WHERE id = ?", [qnId]);
  const [utCheck] = await helper.query("SELECT id, deleted, deleted_at, deleted_by FROM user_track WHERE id = ?", [utId]);
  const [notifCheck] = await helper.query("SELECT id, deleted, deleted_at, deleted_by FROM notification WHERE id = ?", [notifId]);

  const proofTable = [
    { table: "company", id: compCheck.id, deleted: compCheck.deleted, deleted_at: compCheck.deleted_at?.toISOString(), deleted_by: compCheck.deleted_by },
    { table: "dai_product", id: pCheck.id, deleted: pCheck.deleted, deleted_at: pCheck.deleted_at?.toISOString(), deleted_by: pCheck.deleted_by },
    { table: "dai_product_value", id: pvCheck.pid, deleted: pvCheck.deleted, deleted_at: pvCheck.deleted_at?.toISOString(), deleted_by: pvCheck.deleted_by },
    { table: "dai_history", id: hCheck.id, deleted: hCheck.deleted, deleted_at: hCheck.deleted_at?.toISOString(), deleted_by: hCheck.deleted_by },
    { table: "dai_gia", id: giaCheck.id, deleted: giaCheck.deleted, deleted_at: giaCheck.deleted_at?.toISOString(), deleted_by: giaCheck.deleted_by },
    { table: "dai_inward", id: inwCheck.id, deleted: inwCheck.deleted, deleted_at: inwCheck.deleted_at?.toISOString(), deleted_by: inwCheck.deleted_by },
    { table: "dai_inward_item", id: inwItemCheck.id, deleted: inwItemCheck.deleted, deleted_at: inwItemCheck.deleted_at?.toISOString(), deleted_by: inwItemCheck.deleted_by },
    { table: "dai_outward", id: outCheck.id, deleted: outCheck.deleted, deleted_at: outCheck.deleted_at?.toISOString(), deleted_by: outCheck.deleted_by },
    { table: "dai_outward_item", id: outItemCheck.id, deleted: outItemCheck.deleted, deleted_at: outItemCheck.deleted_at?.toISOString(), deleted_by: outItemCheck.deleted_by },
    { table: "dai_company_transfer", id: trCheck.id, deleted: trCheck.deleted, deleted_at: trCheck.deleted_at?.toISOString(), deleted_by: trCheck.deleted_by },
    { table: "dai_company_transfer_item", id: trItemCheck.id, deleted: trItemCheck.deleted, deleted_at: trItemCheck.deleted_at?.toISOString(), deleted_by: trItemCheck.deleted_by },
    { table: "dai_ai_conversation", id: aiCheck.id, deleted: aiCheck.deleted, deleted_at: aiCheck.deleted_at?.toISOString(), deleted_by: aiCheck.deleted_by },
    { table: "dai_quick_notes", id: qnCheck.id, deleted: qnCheck.deleted, deleted_at: qnCheck.deleted_at?.toISOString(), deleted_by: qnCheck.deleted_by },
    { table: "user_track", id: utCheck.id, deleted: utCheck.deleted, deleted_at: utCheck.deleted_at?.toISOString(), deleted_by: utCheck.deleted_by },
    { table: "notification", id: notifCheck.id, deleted: notifCheck.deleted, deleted_at: notifCheck.deleted_at?.toISOString(), deleted_by: notifCheck.deleted_by },
  ];

  console.log("\nTABLE-WISE SOFT DELETE PROOF:");
  console.table(proofTable);

  const baseTimestamp = compCheck.deleted_at?.toISOString();
  let allMatched = true;
  for (const row of proofTable) {
    if (row.deleted !== 1) {
      console.error(`FAIL: ${row.table} deleted !== 1`);
      allMatched = false;
    }
    if (row.deleted_at !== baseTimestamp) {
      console.error(`FAIL: ${row.table} timestamp mismatch (${row.deleted_at} !== ${baseTimestamp})`);
      allMatched = false;
    }
  }

  if (allMatched) {
    console.log("  [PASS] All 15 tables marked deleted = 1 with IDENTICAL deleted_at timestamp!");
  } else {
    throw new Error("One or more tables failed soft-delete assertion!");
  }

  // 4. Strict primary-key fixture purge
  await helper.query("DELETE FROM dai_product_value WHERE pid = ?", [pvPid]);
  await helper.query("DELETE FROM dai_history WHERE id = ?", [histId]);
  await helper.query("DELETE FROM dai_gia WHERE id = ?", [giaId]);
  await helper.query("DELETE FROM dai_company_transfer_item WHERE id = ?", [trItemId]);
  await helper.query("DELETE FROM dai_company_transfer WHERE id = ?", [trId]);
  await helper.query("DELETE FROM dai_outward_item WHERE id = ?", [outItemId]);
  await helper.query("DELETE FROM dai_outward WHERE id = ?", [outId]);
  await helper.query("DELETE FROM dai_inward_item WHERE id = ?", [inwItemId]);
  await helper.query("DELETE FROM dai_inward WHERE id = ?", [inwId]);
  await helper.query("DELETE FROM dai_product WHERE id = ?", [prodId]);
  await helper.query("DELETE FROM dai_ai_conversation WHERE id = ?", [aiId]);
  await helper.query("DELETE FROM dai_quick_notes WHERE id = ?", [qnId]);
  await helper.query("DELETE FROM user_track WHERE id = ?", [utId]);
  await helper.query("DELETE FROM notification WHERE id = ?", [notifId]);
  await helper.query("DELETE FROM dai_incrementid WHERE company = ?", [compId]);
  await helper.query("DELETE FROM company WHERE id = ?", [compId]);
  await helper.query("DELETE FROM branch WHERE id = ?", [branchId]);
  console.log("All proof fixtures purged cleanly.");

  process.exit(0);
}

run().catch((e) => {
  console.error("Proof script failed:", e);
  process.exit(1);
});
