const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const productHelper = require("../../productHelper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { buildUserContext } = require("../../tenantHelper.js");
const { logAudit } = require("../../services/auditIntegration.js");
const stockMovement = require("../../services/stockMovementService.js");
const inwardRouter = express.Router();
const moment = require("moment");
inwardRouter.use(express.json());

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

inwardRouter.post("/inward/checkExist", authenticateToken, async (req, res) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ status: false, error: "Products are required" });
  }

  try {
    const { resolveOperatingCompanyId } = require("../../tenantHelper.js");
    let targetCompanyId = null;
    try {
      targetCompanyId = await resolveOperatingCompanyId(
        req,
        req.body.operating_company_id ?? req.body.operating_company ?? req.body.tenant_company_id
      );
    } catch {
      targetCompanyId = Number(buildUserContext(req).companyId) || 0;
    }

    let targetCompanyName = `Company #${targetCompanyId}`;
    if (targetCompanyId) {
      try {
        const compRows = await helper.query("SELECT name FROM company WHERE id = ? LIMIT 1", [targetCompanyId]);
        if (compRows?.[0]?.name) targetCompanyName = compRows[0].name;
      } catch (_) {}
    }

    let existData = [];
    let conflicts = [];
    let status = true;
    let checkedCount = 0;

    for (const r of products) {
      if (r.id || isBlank(r.sku) || isBlank(r.polish_carat) || isBlank(r.price) || isBlank(r.amount)) {
        continue;
      }

      checkedCount += 1;
      const skuKey = String(r.sku).trim();

      // Check in dai_product
      const prodRows = await helper.query(
        `SELECT p.id, p.sku, p.company, p.polish_pcs, p.polish_carat, p.price, p.amount,
                c.name AS company_name
         FROM dai_product p
         LEFT JOIN company c ON c.id = p.company
         WHERE UPPER(TRIM(p.sku)) = UPPER(?)
         ORDER BY p.id ASC
         LIMIT 1`,
        [skuKey]
      );
      let found = prodRows?.[0] || null;

      // If not in dai_product, check if previously inwarded in dai_inward_item
      if (!found) {
        const itemRows = await helper.query(
          `SELECT ii.id, ii.sku, ii.company, c.name AS company_name
           FROM dai_inward_item ii
           LEFT JOIN company c ON c.id = ii.company
           WHERE UPPER(TRIM(ii.sku)) = UPPER(?)
           ORDER BY ii.id DESC
           LIMIT 1`,
          [skuKey]
        );
        if (itemRows?.[0]) {
          found = itemRows[0];
        }
      }

      if (found) {
        const ownerCompanyId = Number(found.company) || 0;
        const isSameCompany = targetCompanyId && ownerCompanyId === Number(targetCompanyId);

        if (isSameCompany) {
          // Allowed: Same company inwarding or adding stock to same SKU
          existData.push({
            sku: found.sku || skuKey,
            polish_carat: found.polish_carat,
            polish_pcs: found.polish_pcs,
            price: found.price,
            amount: found.amount,
          });
          status = false;
        } else {
          // Blocked: SKU belongs to a different company!
          const ownerName = found.company_name || `Company #${ownerCompanyId}`;
          conflicts.push({
            sku: skuKey,
            ownerCompanyId,
            ownerCompanyName: ownerName,
          });
        }
      }
    }

    if (checkedCount === 0) {
      return res.status(400).json({
        status: false,
        error: "No valid products to check. SKU, carat, price and amount are required.",
      });
    }

    if (conflicts.length > 0) {
      const conflictMsgs = conflicts
        .map((c) => `SKU "${c.sku}" already belongs to "${c.ownerCompanyName}"`)
        .join("; ");
      return res.status(400).json({
        status: false,
        error: `Inward purchase not allowed: ${conflictMsgs}. A stone SKU is unique across companies; you cannot inward purchase or add stock to this SKU from "${targetCompanyName}".`,
        message: `Inward purchase not allowed: ${conflictMsgs}. A stone SKU is unique across companies; you cannot inward purchase or add stock to this SKU from "${targetCompanyName}".`,
        conflicts,
      });
    }

    const message = status ? "No existing products found" : "Some products already exist";
    res.status(201).json({ status, message, data: existData });
  } catch (err) {
    console.error("inward/checkExist error:", err);
    res.status(500).json({ status: false, error: err.message });
  }
});






const INWARD_TYPE_LABELS = {
  purchase: "Purchase",
  import: "Import",
  memo: "In Memo",
  in_memo: "In Memo",
  consign: "In Consignment",
  in_consign: "In Consignment",
};

const getInwardTypeLabel = (type) => {
  if (!type) return "Inward";
  const lower = String(type).trim().toLowerCase();
  if (INWARD_TYPE_LABELS[lower]) return INWARD_TYPE_LABELS[lower];
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

function advanceIncrementId(val, fallback = 1) {
  const str = String(val ?? "").trim().replace(/-?NaN/gi, "");
  if (!str) return String(fallback);
  const parts = str.split("-");
  if (parts.length >= 2) {
    const last = parseInt(parts[parts.length - 1], 10);
    const next = Number.isNaN(last) ? fallback : last + 1;
    parts[parts.length - 1] = String(next);
    return parts.join("-");
  }
  const parsed = parseInt(str, 10);
  return String(Number.isNaN(parsed) ? fallback : parsed + 1);
}

function extractInvoiceSeq(value) {
  const n = parseInt(String(value ?? "").replace(/\D/g, ""), 10);
  return Number.isNaN(n) || n <= 0 ? 0 : n;
}

function isInwardMemoType(type) {
  const t = String(type || "").trim().toLowerCase();
  return t === "memo" || t === "consign" || t === "in_memo" || t === "in_consign";
}

/** In Memo / Consign invoice: INV-1, INV-2, … */
function formatInwardMemoInvoice(seq) {
  const n = extractInvoiceSeq(seq) || 1;
  return `INV-${n}`;
}

async function allocateInwardMemoInvoice(q, companyId) {
  const cid = Number(companyId) || helper.DEFAULT_COMPANY_ID;
  const rows = await q(
    `SELECT invoiceno FROM dai_inward
     WHERE (company = ? OR company = ?)
       AND LOWER(TRIM(inward_type)) IN ('memo','consign','in_memo','in_consign')
       AND (deleted = 0 OR deleted IS NULL)`,
    [cid, String(cid)]
  );
  let max = 0;
  for (const r of rows || []) {
    const n = extractInvoiceSeq(r.invoiceno);
    if (n > max) max = n;
  }
  return formatInwardMemoInvoice(max + 1);
}

inwardRouter.post("/inward/save", authenticateToken, async (req, res) => {
  const { products, ...body } = req.body;
  const ctx = buildUserContext(req);
  const userid = ctx.userId || 1;
  const post = body;

  try {
    const { resolveOperatingCompanyId } = require("../../tenantHelper.js");
    if (!post.operating_company_id && !post.operating_company && !post.tenant_company_id) {
      return res.status(400).json({
        status: false,
        Message: "Company is required",
      });
    }
    const companyId = await resolveOperatingCompanyId(
      req,
      post.operating_company_id ?? post.operating_company ?? post.tenant_company_id
    );

    let incre_id = await helper.getIncrementEntry("inward", companyId);
    if (incre_id && String(incre_id).includes("NaN")) {
      incre_id = String(incre_id).replace(/-?NaN/gi, "") || "Inward-1";
    }
    if (!incre_id || String(incre_id).trim() === "") {
      incre_id = "Inward-1";
    }
    let reference = await helper.getIncrementEntry("reference", companyId);
    if (!reference || String(reference).trim() === "") {
      reference = "1";
    }

    const invoicedate = moment(post.invoicedate, "DD-MM-YYYY").format("YYYY-MM-DD");
    post.duedate = post.terms
      ? moment(post.duedate, "DD-MM-YYYY").format("YYYY-MM-DD")
      : invoicedate;
    post.date = invoicedate;
    post.invoicedate = invoicedate;
    post.company = companyId;
    delete post.operating_company_id;
    delete post.operating_company;
    delete post.tenant_company_id;
    post.entryno = incre_id;
    post.reference = reference;
    post.deleted = 0;
    post.user = userid;

    await stockMovement.ensureStockItemSchema(helper.query);

    const result = await helper.runInTransaction(async (q) => {
      await stockMovement.ensureStockItemSchema(q);

      // In Memo / Consign → INV-1, INV-2… (ignore plain client "1")
      if (isInwardMemoType(post.inward_type)) {
        post.invoiceno = await allocateInwardMemoInvoice(q, companyId);
      }

      // 1. Insert inward header
      const data = helper.insertString(post);
      const insertResult = await q(`INSERT INTO dai_inward (${data[0]}) VALUES (${data[1]})`);
      const lid = insertResult.insertId;

      // 2. Increment IDs safely
      const setNewid = advanceIncrementId(incre_id, 1);
      const nextRef = advanceIncrementId(reference, 1);
      await q(
        "UPDATE dai_incrementid SET inward = ?, reference = ? WHERE company = ?",
        [setNewid, nextRef, companyId]
      );

      let iTotal = 0;
      let iCarat = 0;
      let iPcs = 0;
      const iProducts = [];
      const skuArray = [];
      const insertedItems = [];

      // 4. Sequential processing of product items to avoid race conditions
      for (const r of (Array.isArray(products) ? products : [])) {
        if (!r.sku || !r.polish_carat || !r.price || !r.amount) continue;

        // Same stock id (SKU) → only reuse within the SAME company
        const skuKey = String(r.sku || "").trim();
        r.sku = skuKey;
        let skuRows = await q(
          `SELECT * FROM dai_product
           WHERE company = ? AND UPPER(TRIM(sku)) = UPPER(?)
           ORDER BY id ASC
           LIMIT 1`,
          [companyId, skuKey]
        );
        let SkuData = skuRows[0] || null;

        // If not found in current company, ensure SKU does not belong to any other company
        if (!SkuData) {
          const otherProdRows = await q(
            `SELECT p.id, p.sku, p.company, c.name AS company_name
             FROM dai_product p
             LEFT JOIN company c ON c.id = p.company
             WHERE UPPER(TRIM(p.sku)) = UPPER(?)
             ORDER BY p.id ASC
             LIMIT 1`,
            [skuKey]
          );
          let otherOwner = otherProdRows[0] || null;
          if (!otherOwner) {
            const otherInwardRows = await q(
              `SELECT ii.id, ii.sku, ii.company, c.name AS company_name
               FROM dai_inward_item ii
               LEFT JOIN company c ON c.id = ii.company
               WHERE UPPER(TRIM(ii.sku)) = UPPER(?)
               ORDER BY ii.id DESC
               LIMIT 1`,
              [skuKey]
            );
            otherOwner = otherInwardRows[0] || null;
          }

          if (otherOwner && Number(otherOwner.company) !== Number(companyId)) {
            const ownerName = otherOwner.company_name || `Company #${otherOwner.company}`;
            throw new Error(
              `SKU "${skuKey}" already belongs to company "${ownerName}". Inward purchase on this SKU is only allowed from the owning company.`
            );
          }
        }

        // Normalize Pcs: If polish_pcs is empty/0, fallback to rought_pcs (and vice versa)
        if (!r.polish_pcs || Number(r.polish_pcs) === 0) {
          if (r.rought_pcs && Number(r.rought_pcs) > 0) {
            r.polish_pcs = r.rought_pcs;
          }
        }
        if (!r.rought_pcs || Number(r.rought_pcs) === 0) {
          if (r.polish_pcs && Number(r.polish_pcs) > 0) {
            r.rought_pcs = r.polish_pcs;
          }
        }

        const itemAmount = Number(r.amount) || 0;
        const itemCarat = Number(r.polish_carat) || 0;
        const itemPcs = Number(r.polish_pcs) || 0;

        iTotal += itemAmount;
        iCarat += itemCarat;
        if (itemPcs) iPcs += itemPcs;

        r.date = new Date().toISOString().slice(0, 19).replace("T", " ");
        r.inward_id = lid;
        r.company = companyId;
        r.purchase_pcs = r.polish_pcs ?? "";
        r.purchase_carat = r.polish_carat ?? "0";
        r.purchase_price = r.price ?? "0";
        r.purchase_amount = r.amount ?? "0";
        r.user = userid;

        // Logic for group_type
        let group = "";
        const gtype = r.group_type;
        const pc = Number(r.polish_pcs) || 0;
        if (pc === 1 && (gtype === "box" || gtype === "parcel")) group = gtype;
        else if (pc === 1 && (!gtype || gtype === "single")) group = "single";
        else if (pc > 1) group = "box";
        else group = "parcel";

        r.group_type = group;
        r.inward = post.inward_type;
        r.site_upload = 1;
        r.rapnet_upload = 1;

        const attr = r.attr || {};
        delete r.attr;

        // Clean extra fields that do not exist in dai_product
        const extraFields = ["bgm", "package", "measurements", "certificate"];
        extraFields.forEach((field) => delete r[field]);

        const action =
          post.inward_type === "purchase" ? post.inward_type : `in_${post.inward_type}`;
        const addPcs = Number(r.purchase_pcs ?? r.polish_pcs) || 0;
        const addCarat = Number(r.purchase_carat ?? r.polish_carat) || 0;

        // Same SKU already in inventory → PLUS qty on same stock id (memo/sale later use this row)
        if (SkuData) {
          const pid = SkuData.id;
          console.log(
            `[inward/save] stock-add SKU=${skuKey} productId=${pid} +${addPcs}pcs/+${addCarat}ct company=${companyId}`
          );
          const bal = await stockMovement.applyInwardQty(q, pid, addPcs, addCarat, r.price, {
            cost: r.cost,
            amount: itemAmount,
          });
          // Align company + group so next lookup / inventory stay on this row.
          // Safety: sold/exported SKUs are hidden from All Stock until outward is cleared.
          await q(
            `UPDATE dai_product
             SET company = ?,
                 visibility = 1,
                 group_type = COALESCE(NULLIF(group_type, ''), ?),
                 outward = CASE
                   WHEN COALESCE(polish_carat, 0) > 0
                     AND LOWER(TRIM(COALESCE(outward, ''))) IN ('sale', 'export')
                   THEN ''
                   ELSE outward
                 END
             WHERE id = ?`,
            [companyId, group || SkuData.group_type || "single", pid]
          );
          iProducts.push(pid);
          skuArray.push(SkuData.sku);

          try {
            const itemId = await stockMovement.insertInwardItem(q, {
              company: companyId,
              inward_id: lid,
              product_id: pid,
              sku: SkuData.sku,
              party: post.party || "",
              inward_type: post.inward_type,
              pcs: addPcs,
              carat: addCarat,
              price: Number(r.price) || 0,
              amount: itemAmount,
              balance_pcs: bal.onhand_pcs,
              balance_carat: bal.onhand_carat,
              entry_date: post.invoicedate,
              invoice_no: post.invoiceno || "",
              reference: post.reference || "",
              narretion: post.narretion || "",
              user: userid,
            });
            if (!itemId) {
              console.error(
                `[inward/save] dai_inward_item insert skipped/failed for SKU=${SkuData.sku} inward=${lid}`
              );
            }
          } catch (itemErr) {
            console.error("[inward/save] insertInwardItem error:", itemErr?.message || itemErr);
            throw itemErr;
          }

          insertedItems.push({
            id: pid,
            sku: SkuData.sku,
            mfg_code: r.mfg_code || r.mfg || null,
            d_no: r.d_no || r.dno || null,
            r_pcs: r.rought_pcs ?? r.r_pcs ?? null,
            p_pcs: addPcs,
            p_carat: addCarat,
            r_carat: Number(r.rought_carat ?? r.r_carat) || 0,
            cost: Number(r.cost) || 0,
            price: Number(r.price) || 0,
            amount: itemAmount,
            color: r.color || r.main_color || null,
            loc: r.loc || r.location || null,
            lab: r.lab || null,
            report_no: r.report_no || r.reportno || null,
            shape: r.shape || null,
            clarity: r.clarity || null,
            measurements: r.measurements || r.measurement || null,
            stock_add: true,
          });

          try {
            const histPayload = {
              product_id: pid,
              action,
              party: post.party || "",
              narretion: post.narretion || "",
              date: post.invoicedate,
              description: `Stock add ${post.inward_type} +${addPcs}pcs / +${addCarat}ct ref ${post.reference}`,
              pcs: addPcs,
              carat: addCarat,
              balance_pcs: bal.onhand_pcs,
              balance_carat: bal.onhand_carat,
              amount: itemAmount,
              price: Number(r.price) || 0,
              sku: SkuData.sku,
              type: "cr",
              invoice: post.invoiceno || "",
              entry_from: "inward",
              entryno: lid,
              user: userid,
            };
            const hData = helper.insertString(histPayload);
            await q(`INSERT INTO dai_history (${hData[0]}) VALUES (${hData[1]})`);
          } catch (histErr) {
            console.error("inward/save addHistory (stock add) error:", histErr);
          }
          continue;
        }

        // New main stock row (only when SKU does not exist at all)
        r.visibility = 1;
        r.company = companyId;
        skuArray.push(r.sku);

        const rData = helper.insertString(r);
        const pResult = await q(`INSERT INTO dai_product (${rData[0]}) VALUES (${rData[1]})`);
        const pid = pResult.insertId;
        // Guarantee company is set (needed for next same-SKU lookup)
        await q(`UPDATE dai_product SET company = ?, visibility = 1 WHERE id = ?`, [
          companyId,
          pid,
        ]);
        iProducts.push(pid);

        await stockMovement.setInitialBalances(q, pid, addPcs, addCarat);

        insertedItems.push({
          id: pid,
          sku: r.sku,
          mfg_code: r.mfg_code || r.mfg || null,
          d_no: r.d_no || r.dno || null,
          r_pcs: r.rought_pcs ?? r.r_pcs ?? null,
          p_pcs: r.polish_pcs ?? r.p_pcs ?? null,
          p_carat: Number(r.polish_carat) || 0,
          r_carat: Number(r.rought_carat ?? r.r_carat) || 0,
          cost: Number(r.cost) || 0,
          price: Number(r.price) || 0,
          amount: Number(r.amount) || 0,
          color: r.color || r.main_color || null,
          loc: r.loc || r.location || null,
          lab: r.lab || null,
          report_no: r.report_no || r.reportno || null,
          shape: r.shape || null,
          clarity: r.clarity || null,
          measurements: r.measurements || r.measurement || null,
        });

        attr.product_id = pid;
        const attrData = helper.insertString(attr);
        await q(`INSERT INTO dai_product_value (${attrData[0]}) VALUES (${attrData[1]})`);

        await stockMovement.insertInwardItem(q, {
          company: companyId,
          inward_id: lid,
          product_id: pid,
          sku: r.sku,
          party: post.party || "",
          inward_type: post.inward_type,
          pcs: addPcs,
          carat: addCarat,
          price: Number(r.price) || 0,
          amount: itemAmount,
          balance_pcs: addPcs,
          balance_carat: addCarat,
          entry_date: post.invoicedate,
          invoice_no: post.invoiceno || "",
          reference: post.reference || "",
          narretion: post.narretion || "",
          user: userid,
        });

        try {
          const histPayload = {
            product_id: pid,
            action,
            party: post.party || "",
            narretion: post.narretion || "",
            date: post.invoicedate,
            description: `New Stone ${post.inward_type} with reference no is ${post.reference}`,
            pcs: addPcs,
            carat: addCarat,
            balance_pcs: addPcs,
            balance_carat: addCarat,
            amount: Number(r.amount) || 0,
            price: Number(r.price) || 0,
            sku: r.sku,
            type: "cr",
            invoice: post.invoiceno || "",
            entry_from: "inward",
            entryno: lid,
            user: userid,
          };
          const hData = helper.insertString(histPayload);
          await q(`INSERT INTO dai_history (${hData[0]}) VALUES (${hData[1]})`);
        } catch (histErr) {
          console.error("inward/save addHistory error:", histErr);
        }
      }

      const uniqueProducts = [...new Set(iProducts.map(String))];
      await q(
        "UPDATE dai_inward SET products = ?, due_amount = ?, final_amount = ?, carat = ?, pcs = ? WHERE id = ?",
        [uniqueProducts.join(","), iTotal, iTotal, iCarat, iPcs, lid]
      );

      const track = {
        product_id: iProducts.join(","),
        action: post.inward_type,
        date: new Date().toISOString().slice(0, 19).replace("T", " "),
        description: `New Stone import with ${post.inward_type} sku: ${skuArray.join(",")}`,
        user: userid,
        company: companyId,
      };
      const trackData = helper.insertString(track);
      await q(`INSERT INTO user_track (${trackData[0]}) VALUES (${trackData[1]})`);

      return { lid, iProducts, skuArray, insertedItems, iTotal, iCarat, iPcs };
    });

    // Per-product CREATE audit log for each created diamond stock item (executed post-commit)
    if (result.insertedItems && result.insertedItems.length > 0) {
      for (const item of result.insertedItems) {
        logAudit({
          actionType: "CREATE",
          moduleName: "Diamond Stock",
          recordId: item.id,
          recordReference: item.sku ? String(item.sku) : undefined,
          newValue: {
            ...item,
            inward_id: result.lid,
            inward_type: post.inward_type,
            invoice_no: post.invoiceno,
            entry_no: incre_id,
          },
          companyId,
        }).catch(console.error);
      }
    }

    logAudit({
      actionType: "STOCK_IN",
      moduleName: "Inward",
      recordId: result.lid,
      recordReference: String(reference || incre_id),
      newValue: {
        inward_id: result.lid,
        entry_no: incre_id,
        reference: reference,
        invoice_no: post.invoiceno,
        inward_type: post.inward_type,
        party: post.party,
        date: post.invoicedate,
        terms: post.terms,
        due_date: post.duedate,
        total_pcs: result.iPcs || 0,
        total_carat: result.iCarat || 0,
        total_amount: result.iTotal || 0,
        skus: result.skuArray,
        items: result.insertedItems,
      },
      companyId,
    }).catch(console.error);

    const typeLabel = getInwardTypeLabel(post.inward_type);
    return res.status(200).json({ status: true, message: `${typeLabel} created successfully.` });
  } catch (error) {
    console.error("inward/save error:", error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      status: false,
      message: error.sqlMessage || error.message || "Failed to save inward transaction.",
    });
  }
});











// inwardRouter.post("/inward/save", async (req, res) => {
//     const { products, ...body } = req.body;
//     let userid = 1;
//     let companyId = 1;
//     let post = body;
//     const incre_id = await helper.getIncrementEntry('inward');
//     let reference = await helper.getIncrementEntry('reference');
//     return await new Promise((resolve, reject) => {
//         let iTotal = 0;
//         let iCarat = 0;
//         let iPcs = 0;
//         const cid = 1;
//         post.user = 1;

//         const invoicedate = moment(post.invoicedate, "DD-MM-YYYY").format("YYYY-MM-DD");

//         if (post.terms === '' || post.terms === 0) {
//             post.duedate = invoicedate;
//         }
//         else
//         {
//             post.duedate = moment(post.duedate, "DD-MM-YYYY").format("YYYY-MM-DD");
//         }

//         post.date = invoicedate;
//         post.invoicedate = invoicedate;
//         post.company = cid;
//         post.entryno = incre_id;
//         post.reference = reference;
//         post.deleted = 0;

//         const data = helper.insertString(post);
//         const sql = `INSERT INTO dai_inward (${data[0]}) VALUES (${data[1]})`;

//         connection.query(sql, (err, result) => {
//             if (err) {
//                 res.status(201).json({ status: false, message: err });
//                 return reject(err);
//             }

//             const lid = result.insertId;

//             const temp = incre_id.split('-');
//             temp[1] = parseInt(temp[1]) + 1;
//             const setNewid = `${temp[0]}-${temp[1]}`;
//             reference++;
//             const updateSql = `UPDATE dai_incrementid SET inward='${setNewid}', reference='${reference}'`;

//             connection.query(updateSql, (err) => {
//                 if (err) {

//                     res.status(201).json({ status: false, message: err });
//                     return reject(err);
//                 }

//                 let i = 1;
//                 let iProducts = [];
//                 let sku = [];

//                 if (post.inward_type === 'import') {
//                     const category = {
//                         name: new Date().toLocaleDateString('en-GB'),
//                         parent: 0,
//                         is_auto: 1
//                     };

//                     const categoryData = helper.insertString(category);
//                     const categorySql = `INSERT INTO category (${categoryData[0]}) VALUES (${categoryData[1]})`;

//                     connection.query(categorySql, (err, result) => {
//                         if (err) {
//                             res.status(201).json({ status: false, message: err });
//                             return reject(err);
//                         }

//                         const cid = result.insertId;
//                         //session.last_inward = lid;
//                         //session.last_cid = cid;
//                         resolve(true);
//                     });
//                 } else {
//                     let iTotal = 0;
//                     //products.forEach((r, index) => {
//                     const promises = products.map(async (r) => {

//                         if (r.sku === "" || r.polish_carat === "" || r.price === "" || r.amount === "") {
//                             return;
//                         }

//                         const SkuData = await productHelper.getDetail(r.sku, "p.sku");

//                         iTotal += parseFloat(r.amount);
//                         iCarat += parseFloat(r.polish_carat);
//                         if (r.polish_pcs !== '') {
//                             iPcs += parseFloat(r.polish_pcs);
//                         }

//                         r.date = new Date().toISOString().slice(0, 19).replace('T', ' ');
//                         r.inward_id = lid;
//                         r.company = cid;
//                         r.purchase_pcs = r.polish_pcs;
//                         r.purchase_carat = r.polish_carat;
//                         r.purchase_price = r.price;
//                         r.purchase_amount = r.amount;
//                         r.user = userid;
//                         let group = "";
//                         const gtype = r.group_type;
//                         const pc = parseFloat(r.polish_pcs);

//                         if ((pc === 1 || pc === 1.00) && (gtype === "box" || gtype === "parcel")) {
//                             group = gtype;
//                         } else if ((pc === 1 || pc === 1.00) && (gtype === "" || gtype === "single")) {
//                             group = "single";
//                         } else if (pc > 1) {
//                             group = "box";
//                         } else if (pc === "" || pc === 0) {
//                             group = "parcel";
//                         }

//                         if (SkuData !== undefined && SkuData && SkuData.group_type === "single") {
//                             return;
//                         }

//                         r.group_type = group;
//                         r.inward = post.inward_type;
//                         r.site_upload = 1;
//                         r.rapnet_upload = 1;

//                         const attr = r.attr;
//                         delete r.attr;

//                         if (SkuData === undefined || SkuData === null || Object.keys(SkuData).length === 0) {
//                             r.visibility = 1;
//                         } else {
//                             r.visibility = 0;
//                             r.parent_id = SkuData.id;
//                             if (SkuData.child_count === null) {
//                                 SkuData.child_count = 0;
//                             }
//                             const child = SkuData.child_count + 1;
//                             SkuData.child_count = child;
//                             r.sku = `${r.sku}-${child}`;
//                         }

//                         const rData = helper.insertString(r);
//                         const productSql = `INSERT INTO dai_product (${rData[0]}) VALUES (${rData[1]})`;

//                         connection.query(productSql, (err, result) => {
//                             if (err) {
//                                 res.status(201).json({ status: false, message: err });
//                                 return reject(err);
//                             }

//                             const pid = result.insertId;
//                             iProducts.push(pid);
//                             attr.product_id = pid;
//                             console.log("pid:" + pid);

//                             const attrData = helper.insertString(attr);
//                             const attrSql = `INSERT INTO dai_product_value (${attrData[0]}) VALUES (${attrData[1]})`;

//                             connection.query(attrSql, (err) => {
//                                 if (err) {
//                                     res.status(201).json({ status: false, message: err });
//                                     return reject(err);
//                                 }

//                                 let action = '';
//                                 if (post.inward_type === 'purchase') {
//                                     action = post.inward_type;
//                                 } else {
//                                     action = `in_${post.inward_type}`;
//                                 }

//                                 const history = {
//                                     product_id: pid,
//                                     action: action,
//                                     party: post.party,
//                                     narretion: post.narretion,
//                                     date: post.invoicedate,
//                                     description: `New Stone ${post.inward_type} with reference no is ${post.reference}`,
//                                     pcs: r.polish_pcs,
//                                     carat: r.polish_carat,
//                                     balance_pcs: r.polish_pcs,
//                                     balance_carat: r.polish_carat,
//                                     amount: r.amount,
//                                     price: r.price,
//                                     sku: r.sku,
//                                     type: 'cr',
//                                     invoice: post.invoiceno,
//                                     entry_from: 'inward',
//                                     entryno: lid
//                                 };

//                                 helper.addHistory(history);
//                                 if (SkuData && (SkuData.group_type === 'box' || SkuData.group_type === 'parcel')) {
//                                     SkuData.polish_pcs += parseFloat(r.polish_pcs);
//                                     SkuData.polish_carat += parseFloat(r.polish_carat);

//                                     const updateSkuSql = `UPDATE dai_product SET polish_pcs=${SkuData.polish_pcs}, polish_carat=${SkuData.polish_carat}, child_count=${SkuData.child_count} WHERE id=${SkuData.id}`;
//                                     connection.query(updateSkuSql, (err) => {
//                                         if (err) {
//                                             res.status(201).json({ status: false, message: err });
//                                             return reject(err);
//                                         }

//                                         const skuHistory = {
//                                             product_id: SkuData.id,
//                                             action: post.inward_type,
//                                             party: post.party,
//                                             narretion: post.narretion,
//                                             date: post.invoicedate,
//                                             description: `New Stone ${post.inward_type} with reference no is ${post.reference}`,
//                                             pcs: r.polish_pcs,
//                                             carat: r.polish_carat,
//                                             amount: r.amount,
//                                             price: r.price,
//                                             sku: r.sku,
//                                             type: 'cr',
//                                             invoice: post.invoiceno,
//                                             entry_from: 'inward',
//                                             entryno: lid
//                                         };

//                                         helper.addHistory(skuHistory);
//                                     });
//                                 }

//                             });
//                         });
//                     });

//                 }

//                 const finalUpdateSql = `UPDATE dai_inward SET products='${iProducts.join(',')}', due_amount=${iTotal}, final_amount=${iTotal}, carat=${iCarat}, pcs=${iPcs} WHERE id=${lid}`;
//                 console.log(finalUpdateSql);
//                 connection.query(finalUpdateSql, (err) => {
//                     if (err) {
//                         return reject(err);
//                     }

//                     const track = {
//                         product_id: iProducts.join(','),
//                         action: post.inward_type,
//                         date: new Date().toISOString().slice(0, 19).replace('T', ' '),
//                         description: `New Stone import with ${post.inward_type} sku: ${sku.join(',')}`,
//                         user: userid,
//                         company: companyId
//                     };

//                     const trackData = helper.insertString(track);
//                     const trackSql = `INSERT INTO user_track (${trackData[0]}) VALUES (${trackData[1]})`;

//                     connection.query(trackSql, (err, result) => {
//                         if (err) {
//                             res.status(201).json({ status: false, message: err });
//                             return reject(err);
//                         }

//                         const tid = result.insertId;
//                         if (post.inward_type === 'import') {
//                             // session.last_track = tid;
//                         }

//                     });
//                 });
//             });
//             res.status(201).json({ status: true, message: "Purchase created successfully." });
//         });
//     });

// });

// Get inward (purchase / in-memo) by id — same response shape as /outward/?id=
inwardRouter.get("/inward/", authenticateToken, (req, res) => {
  const id = parseInt(req?.query?.id, 10) || 0;

  if (!id) {
    return res.status(400).json({ status: false, message: "Invalid Id" });
  }

  try {
    const query = `SELECT i.*, p.name AS party_name, p.address AS party_address, p.pincode AS party_pincode, p.country AS party_country, p.contact_number AS party_contact, p.fax AS party_fax, p.contact_person
      FROM dai_inward i
      LEFT JOIN dai_party p ON (i.party = CAST(p.id AS CHAR) OR i.party = p.id OR i.party = p.name)
      WHERE i.id = ? AND (i.deleted = 0 OR i.deleted IS NULL)`;

    connection.query(query, [id], (error, data) => {
      if (error) {
        return res.status(201).json({
          status: false,
          message: "Error in Fetching data ",
          Data: error,
        });
      }

      if (!data || data.length === 0) {
        return res.status(201).json({ status: false, message: "Error in Fetching data " });
      }

      const row = data[0];
      const products = row.products || "";

      if (!products) {
        return res.status(201).json({
          status: true,
          Data: { ...row, type: row.inward_type },
          products: [],
        });
      }

      const pquery = `SELECT p.*, pv.* FROM dai_product p
        JOIN dai_product_value pv ON p.id = pv.product_id
        WHERE p.id IN (${products})`;

      connection.query(pquery, (perror, pdata) => {
        if (perror) {
          return res.status(201).json({
            status: false,
            message: "Product -  Error in Fetching data ",
            Data: perror,
          });
        }

        const productsList = (pdata || []).map((p) => ({
          ...p,
          sell_price: p.sell_price || p.purchase_price || p.price,
          sell_amount: p.sell_amount || p.purchase_amount || p.amount,
        }));

        return res.status(201).json({
          status: true,
          Data: { ...row, type: row.inward_type },
          products: productsList,
        });
      });
    });
  } catch (error) {
    return res.status(201).json({ status: false, message: error.message });
  }
});

inwardRouter.post("/inward/update", authenticateToken, async (req, res) => {
  const post = req.body;
  const id = parseInt(post.id, 10);
  if (!id) return res.status(400).json({ status: false, message: "Invalid id" });

  try {
    const rows = await helper.query("SELECT * FROM dai_inward WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ status: false, message: "Inward record not found" });
    const existing = rows[0];

    const updateFields = {};
    if (post.party != null) updateFields.party = post.party;
    if (post.other_party != null) updateFields.other_party = post.other_party;
    if (post.date != null) updateFields.date = post.date;
    if (post.invoicedate != null) updateFields.invoicedate = post.invoicedate;
    if (post.duedate != null) updateFields.duedate = post.duedate;
    if (post.terms != null) updateFields.terms = post.terms;
    if (post.reference != null) updateFields.reference = post.reference;
    if (post.invoiceno != null) updateFields.invoiceno = post.invoiceno;
    if (post.paid_amount != null) updateFields.paid_amount = Number(post.paid_amount) || 0;
    if (post.due_amount != null) updateFields.due_amount = Number(post.due_amount) || 0;
    if (post.boc != null) updateFields.boc = post.boc ? 1 : 0;
    if (post.citi != null) updateFields.citi = post.citi ? 1 : 0;
    if (post.dbs != null) updateFields.dbs = post.dbs ? 1 : 0;
    if (post.sc != null) updateFields.sc = post.sc ? 1 : 0;
    if (post.boc_sksm != null) updateFields.boc_sksm = post.boc_sksm ? 1 : 0;
    if (post.citi_sksm != null) updateFields.citi_sksm = post.citi_sksm ? 1 : 0;
    if (post.shipping_name != null) updateFields.shipping_name = post.shipping_name;
    if (post.narretion != null) updateFields.narretion = post.narretion;

    if (Array.isArray(post.products) && post.products.length > 0) {
      let totalAmount = 0;
      let totalCarat = 0;
      let totalPcs = 0;
      for (const p of post.products) {
        if (!p.id) continue;
        const pcs = Number(p.polish_pcs ?? p.pcs) || 0;
        const carat = Number(p.polish_carat ?? p.carat) || 0;
        const price = Number(p.price ?? p.purchase_price ?? p.sell_price) || 0;
        const amount = Number(p.amount ?? p.purchase_amount ?? p.sell_amount) || Number((pcs ? price * carat : 0).toFixed(2));
        totalAmount += amount;
        totalCarat += carat;
        totalPcs += pcs;

        await helper.query(
          `UPDATE dai_product SET
             polish_pcs = ?, polish_carat = ?, onhand_pcs = ?, onhand_carat = ?,
             price = ?, amount = ?, purchase_price = ?, purchase_amount = ?,
             location = ?, remark = ?, lab = ?, mfg_code = ?, diamond_no = ?
           WHERE id = ?`,
          [
            pcs, carat, pcs, carat,
            price, amount, price, amount,
            p.location || "", p.remark || "", p.lab || "", p.mfg_code || "", p.diamond_no || "",
            p.id
          ]
        );
      }
      if (totalAmount > 0) {
        updateFields.final_amount = totalAmount;
        updateFields.carat = totalCarat;
        updateFields.pcs = totalPcs;
      }
    }

    if (Object.keys(updateFields).length > 0) {
      const setClauses = Object.keys(updateFields).map((k) => `${k} = ?`).join(", ");
      const setValues = Object.values(updateFields);
      await helper.query(`UPDATE dai_inward SET ${setClauses} WHERE id = ?`, [...setValues, id]);
    }

    logAudit({
      actionType: "UPDATE",
      moduleName: "Inward",
      recordId: id,
      recordReference: String(existing.invoiceno || existing.entryno || id),
      oldValue: existing,
      newValue: { ...existing, ...updateFields },
      companyId: existing.company,
    }).catch(console.error);

    return res.status(200).json({ status: true, message: "Inward transaction updated successfully" });
  } catch (error) {
    console.error("inward/update error:", error);
    return res.status(500).json({ status: false, message: error.message || "Failed to update inward transaction" });
  }
});

module.exports = inwardRouter;
