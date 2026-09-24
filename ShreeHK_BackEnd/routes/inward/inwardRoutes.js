const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const productHelper = require("../../productHelper.js");
const { authenticateToken } = require("../../authMiddleware.js");
const { buildUserContext } = require("../../tenantHelper.js");
const { logAudit } = require("../../services/auditIntegration.js");
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
    let existData = [];
    let status = true;
    let checkedCount = 0;

    for (const r of products) {
      if (r.id || isBlank(r.sku) || isBlank(r.polish_carat) || isBlank(r.price) || isBlank(r.amount)) {
        continue;
      }

      checkedCount += 1;
      const skuData = await productHelper.getDetail(String(r.sku).trim(), "p.sku");

      if (skuData) {
        existData.push({
          sku: skuData.sku,
          polish_carat: skuData.polish_carat,
          polish_pcs: skuData.polish_pcs,
          price: skuData.price,
          amount: skuData.amount,
        });
        status = false;
      }
    }

    if (checkedCount === 0) {
      return res.status(400).json({
        status: false,
        error: "No valid products to check. SKU, carat, price and amount are required.",
      });
    }

    const message = status ? "No existing products found" : "Some products already exist";
    res.status(201).json({ status, message, data: existData });
  } catch (err) {
    console.error(err);
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

inwardRouter.post("/inward/save", authenticateToken, async (req, res) => {
  const { products, ...body } = req.body;
  const ctx = buildUserContext(req);
  const userid = ctx.userId || 1;
  const companyId = ctx.companyId;
  const post = body;

  try {
    let incre_id = await helper.getIncrementEntry("inward", companyId);
    if (incre_id && String(incre_id).includes("NaN")) {
      incre_id = String(incre_id).replace(/-?NaN/gi, "") || "1";
    }
    const reference = await helper.getIncrementEntry("reference", companyId);

    const invoicedate = moment(post.invoicedate, "DD-MM-YYYY").format("YYYY-MM-DD");
    post.duedate = post.terms
      ? moment(post.duedate, "DD-MM-YYYY").format("YYYY-MM-DD")
      : invoicedate;
    post.date = invoicedate;
    post.invoicedate = invoicedate;
    post.company = companyId;
    post.entryno = incre_id;
    post.reference = reference;
    post.deleted = 0;
    post.user = userid;

    const result = await helper.runInTransaction(async (q) => {
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

      // 3. Import category entry if applicable
      if (post.inward_type === "import") {
        await q(
          "INSERT INTO category (name, parent) VALUES (?, ?)",
          [moment().format("DD-MM-YYYY"), 0]
        );
      }

      let iTotal = 0;
      let iCarat = 0;
      let iPcs = 0;
      const iProducts = [];
      const skuArray = [];
      const insertedItems = [];

      // 4. Sequential processing of product items to avoid race conditions
      for (const r of (Array.isArray(products) ? products : [])) {
        if (!r.sku || !r.polish_carat || !r.price || !r.amount) continue;

        const skuRows = await q(
          "SELECT * FROM dai_product WHERE sku = ? AND company = ? LIMIT 1",
          [String(r.sku).trim(), companyId]
        );
        let SkuData = skuRows[0] || null;

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

        if (SkuData && SkuData.group_type === "single") continue;

        r.group_type = group;
        r.inward = post.inward_type;
        r.site_upload = 1;
        r.rapnet_upload = 1;

        const attr = r.attr || {};
        delete r.attr;

        // Clean extra fields that do not exist in dai_product
        const extraFields = ["bgm", "package", "measurements", "certificate"];
        extraFields.forEach((field) => delete r[field]);

        if (!SkuData || Object.keys(SkuData).length === 0) {
          r.visibility = 1;
        } else {
          r.visibility = 0;
          r.parent_id = SkuData.id;
          SkuData.child_count = (Number(SkuData.child_count) || 0) + 1;
          r.sku = `${r.sku}-${SkuData.child_count}`;
        }

        skuArray.push(r.sku);

        const rData = helper.insertString(r);
        const pResult = await q(`INSERT INTO dai_product (${rData[0]}) VALUES (${rData[1]})`);
        const pid = pResult.insertId;
        iProducts.push(pid);
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

        const action =
          post.inward_type === "purchase" ? post.inward_type : `in_${post.inward_type}`;
        try {
          const histPayload = {
            product_id: pid,
            action,
            party: post.party || "",
            narretion: post.narretion || "",
            date: post.invoicedate,
            description: `New Stone ${post.inward_type} with reference no is ${post.reference}`,
            pcs: r.polish_pcs ?? "",
            carat: Number(r.polish_carat) || 0,
            balance_pcs: r.polish_pcs ?? "",
            balance_carat: Number(r.polish_carat) || 0,
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

        // Parameterized update for parent Box/Parcel
        if (SkuData && (SkuData.group_type === "box" || SkuData.group_type === "parcel")) {
          const addPcs = Number(r.purchase_pcs ?? r.polish_pcs) || 0;
          const addCarat = Number(r.purchase_carat ?? r.polish_carat) || 0;
          const childCount = Number(SkuData.child_count) || 0;

          await q(
            "UPDATE dai_product SET polish_pcs = polish_pcs + ?, polish_carat = polish_carat + ?, child_count = ? WHERE id = ?",
            [addPcs, addCarat, childCount, SkuData.id]
          );

          try {
            const parentHist = {
              product_id: SkuData.id,
              action: post.inward_type,
              party: post.party || "",
              narretion: post.narretion || "",
              date: post.invoicedate,
              description: `New Stone ${post.inward_type} with reference no is ${post.reference}`,
              pcs: r.polish_pcs ?? "",
              carat: Number(r.polish_carat) || 0,
              amount: Number(r.amount) || 0,
              price: Number(r.price) || 0,
              sku: r.sku,
              type: "cr",
              invoice: post.invoiceno || "",
              entry_from: "inward",
              entryno: lid,
              user: userid,
            };
            const phData = helper.insertString(parentHist);
            await q(`INSERT INTO dai_history (${phData[0]}) VALUES (${phData[1]})`);
          } catch (histErr) {
            console.error("inward/save parent addHistory error:", histErr);
          }
        }
      }

      // Parameterized update for final inward summary
      await q(
        "UPDATE dai_inward SET products = ?, due_amount = ?, final_amount = ?, carat = ?, pcs = ? WHERE id = ?",
        [iProducts.join(","), iTotal, iTotal, iCarat, iPcs, lid]
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

      return { lid, iProducts, skuArray, insertedItems };
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
        total_pcs: iPcs,
        total_carat: iCarat,
        total_amount: iTotal,
        skus: result.skuArray,
        items: result.insertedItems,
      },
      companyId,
    }).catch(console.error);

    const typeLabel = getInwardTypeLabel(post.inward_type);
    return res.status(200).json({ status: true, message: `${typeLabel} created successfully.` });
  } catch (error) {
    console.error("inward/save error:", error);
    return res.status(500).json({
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

module.exports = inwardRouter;
