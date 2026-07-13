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

    res.status(201).json({ status, data: existData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
});

// old working code complete
// inwardRouter.post("/inward/save", async (req, res) => {
//   const { products, ...body } = req.body;
//   const userid = 1;
//   const companyId = 1;
//   const post = body;

//   try {
//     const incre_id = await helper.getIncrementEntry("inward");
//     const reference = await helper.getIncrementEntry("reference");

//     const newReference = parseInt(reference, 10) + 1;

//     const invoicedate = moment(post.invoicedate, "DD-MM-YYYY").format(
//       "YYYY-MM-DD"
//     );
//     post.duedate = post.terms
//       ? moment(post.duedate, "DD-MM-YYYY").format("YYYY-MM-DD")
//       : invoicedate;
//     post.date = invoicedate;
//     post.invoicedate = invoicedate;
//     post.company = 1;
//     post.entryno = incre_id;
//     post.reference = reference;
//     post.deleted = 0;
//     post.user = userid;

//     const data = helper.insertString(post);
//     const sql = `INSERT INTO dai_inward (${data[0]}) VALUES (${data[1]})`;

//     connection.query(sql, async (err, result) => {
//       if (err) return res.status(201).json({ status: false, message: err });

//       const lid = result.insertId;
//       const temp = incre_id.split("-");
//       temp[1] = parseInt(temp[1]) + 1;
//       const setNewid = `${temp[0]}-${temp[1]}`;

//       const updateSql = `UPDATE dai_incrementid SET inward='${setNewid}', reference='${reference + 1
//         }'`;

//       connection.query(updateSql, async (err) => {
//         if (err) return res.status(201).json({ status: false, message: err });

//         let iTotal = 0,
//           iCarat = 0,
//           iPcs = 0;
//         const iProducts = [];
//         const sku = [];
//         if (post.inward_type === "import") {
//           const category = {
//             name: new Date().toLocaleDateString("en-GB"),
//             parent: 0,
//             is_auto: 1,
//           };

//           const categoryData = helper.insertString(category);
//           const categorySql = `INSERT INTO category (${categoryData[0]}) VALUES (${categoryData[1]})`;

//           connection.query(categorySql, (err, result) => {
//             if (err) {
//               res.status(201).json({ status: false, message: err });
//               return reject(err);
//             }

//             const cid = result.insertId;
//             //session.last_inward = lid;
//             //session.last_cid = cid;
//             resolve(true);
//           });
//         } else {
//           const promises = products.map(async (r) => {
//             if (!r.sku || !r.polish_carat || !r.price || !r.amount) return;

//             const SkuData = await productHelper.getDetail(r.sku, "p.sku");
//             iTotal += parseFloat(r.amount);
//             iCarat += parseFloat(r.polish_carat);
//             if (r.polish_pcs) iPcs += parseFloat(r.polish_pcs);

//             r.date = new Date().toISOString().slice(0, 19).replace("T", " ");
//             r.inward_id = lid;
//             r.company = 1;
//             r.purchase_pcs = r.polish_pcs;
//             r.purchase_carat = r.polish_carat;
//             r.purchase_price = r.price;
//             r.purchase_amount = r.amount;
//             r.user = userid;

//             let group = "";
//             const gtype = r.group_type;
//             const pc = parseFloat(r.polish_pcs);

//             if (
//               (pc === 1 || pc === 1.0) &&
//               (gtype === "box" || gtype === "parcel")
//             ) {
//               group = gtype;
//             } else if (
//               (pc === 1 || pc === 1.0) &&
//               (!gtype || gtype === "single")
//             ) {
//               group = "single";
//             } else if (pc > 1) {
//               group = "box";
//             } else {
//               group = "parcel";
//             }

//             if (SkuData && SkuData.group_type === "single") return;

//             r.group_type = group;
//             r.inward = post.inward_type;
//             r.site_upload = 1;
//             r.rapnet_upload = 1;

//             const attr = r.attr;
//             delete r.attr;

//             if (!SkuData || Object.keys(SkuData).length === 0) {
//               r.visibility = 1;
//             } else {
//               r.visibility = 0;
//               r.parent_id = SkuData.id;
//               SkuData.child_count = (SkuData.child_count || 0) + 1;
//               r.sku = `${r.sku}-${SkuData.child_count}`;
//             }

//             const rData = helper.insertString(r);
//             const productSql = `INSERT INTO dai_product (${rData[0]}) VALUES (${rData[1]})`;

//             await new Promise((resolve, reject) => {
//               connection.query(productSql, (err, result) => {
//                 if (err) return reject(err);

//                 const pid = result.insertId;
//                 iProducts.push(pid);
//                 attr.product_id = pid;

//                 const attrData = helper.insertString(attr);
//                 const attrSql = `INSERT INTO dai_product_value (${attrData[0]}) VALUES (${attrData[1]})`;

//                 connection.query(attrSql, (err) => {
//                   if (err) return reject(err);

//                   if (
//                     SkuData &&
//                     (SkuData.group_type === "box" ||
//                       SkuData.group_type === "parcel")
//                   ) {
//                     SkuData.polish_pcs += parseFloat(r.polish_pcs);
//                     SkuData.polish_carat += parseFloat(r.polish_carat);
//                     const updateSkuSql = `UPDATE dai_product SET polish_pcs=${SkuData.polish_pcs}, polish_carat=${SkuData.polish_carat}, child_count=${SkuData.child_count} WHERE id=${SkuData.id}`;
//                     connection.query(updateSkuSql, (err) => {
//                       if (err) return reject(err);
//                       resolve();
//                     });
//                   } else {
//                     resolve();
//                   }
//                 });
//               });
//             });
//           });

//           await Promise.all(promises);
//         }

//         const finalUpdateSql1 = `UPDATE dai_inward SET products='${iProducts.join(",")}', due_amount=${iTotal}, final_amount=${iTotal}, carat=${iCarat}, pcs=${iPcs} WHERE id=${lid}`;

//         connection.query(finalUpdateSql1, (err) => {
//           if (err) return res.status(201).json({ status: false, message: err });

//           const track = {
//             product_id: iProducts.join(","),
//             action: post.inward_type,
//             date: new Date().toISOString().slice(0, 19).replace("T", " "),
//             description: `New Stone import with ${post.inward_type
//               } sku: ${sku.join(",")}`,
//             user: userid,
//             company: companyId,
//           };

//           const trackData = helper.insertString(track);
//           const trackSql = `INSERT INTO user_track (${trackData[0]}) VALUES (${trackData[1]})`;

//           connection.query(trackSql, (err) => {
//             if (err)
//               return res.status(201).json({ status: false, message: err });

//             res.status(201).json({
//               status: true,
//               message: "Purchase created successfully.",
//             });
//           });

//         });
//         await Promise.all(promises);

//         var finalUpdateSql3 = `UPDATE dai_inward SET products='${iProducts.join(",")}', due_amount=${iTotal}, final_amount=${iTotal}, carat=${iCarat}, pcs=${iPcs} WHERE id=${lid}`;

//         connection.query(finalUpdateSql3, (err) => {
//           if (err) return res.status(201).json({ status: false, message: err });

//           const track = {
//             product_id: iProducts.join(","),
//             action: post.inward_type,
//             date: new Date().toISOString().slice(0, 19).replace("T", " "),
//             description: `New Stone import with ${post.inward_type
//               } sku: ${sku.join(",")}`,
//             user: userid,
//             company: companyId,
//           };

//           const trackData = helper.insertString(track);
//           const trackSql = `INSERT INTO user_track (${trackData[0]}) VALUES (${trackData[1]})`;

//           connection.query(trackSql, (err) => {
//             if (err)
//               return res.status(201).json({ status: false, message: err });

//             res.status(201)
//               .json({
//                 status: true,
//                 message: "Purchase created successfully.",
//               });
//           });
//         });
//       });
//     });
//   } catch (error) {
//     res.status(500).json({ status: false, message: error.message });
//   }
// });




inwardRouter.post("/inward/save", authenticateToken, async (req, res) => {
  const { products, ...body } = req.body;
  const ctx = buildUserContext(req);
  const userid = ctx.userId || 1;
  const companyId = ctx.companyId;
  const post = body;

  try {
    const incre_id = await helper.getIncrementEntry("inward", companyId);
    const reference = await helper.getIncrementEntry("reference", companyId);

    const newReference = parseInt(reference, 10) + 1;

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

    const data = helper.insertString(post);
    const sql = `INSERT INTO dai_inward (${data[0]}) VALUES (${data[1]})`;

    connection.query(sql, async (err, result) => {
      if (err) return res.status(201).json({ status: false, message: err });

      const lid = result.insertId;
      const temp = incre_id.split("-");
      temp[1] = parseInt(temp[1]) + 1;
      const setNewid = `${temp[0]}-${temp[1]}`;

      const updateSql = `UPDATE dai_incrementid SET inward='${setNewid}', reference='${parseInt(reference) + 1}' WHERE company=${companyId}`;

      connection.query(updateSql, async (err) => {
        if (err) return res.status(201).json({ status: false, message: err });

        try {
        let iTotal = 0, iCarat = 0, iPcs = 0;
        const iProducts = [];
        const skuArray = [];

        if (post.inward_type === "import") {
          await new Promise((resolve, reject) => {
            connection.query(
              "INSERT INTO category (name, parent) VALUES (?, ?)",
              [moment().format("DD-MM-YYYY"), 0],
              (catErr) => (catErr ? reject(catErr) : resolve())
            );
          });
        }

        const promises = products.map(async (r) => {
            if (!r.sku || !r.polish_carat || !r.price || !r.amount) return;

            const SkuData = await productHelper.getDetail(r.sku, "p.sku");
            iTotal += parseFloat(r.amount);
            iCarat += parseFloat(r.polish_carat);
            if (r.polish_pcs) iPcs += parseFloat(r.polish_pcs);

            r.date = new Date().toISOString().slice(0, 19).replace("T", " ");
            r.inward_id = lid;
            r.company = companyId;
            r.purchase_pcs = r.polish_pcs;
            r.purchase_carat = r.polish_carat;
            r.purchase_price = r.price;
            r.purchase_amount = r.amount;
            r.user = userid;

            // Logic for group_type
            let group = "";
            const gtype = r.group_type;
            const pc = parseFloat(r.polish_pcs);
            if ((pc === 1) && (gtype === "box" || gtype === "parcel")) group = gtype;
            else if ((pc === 1) && (!gtype || gtype === "single")) group = "single";
            else if (pc > 1) group = "box";
            else group = "parcel";

            if (SkuData && SkuData.group_type === "single") return;

            r.group_type = group;
            r.inward = post.inward_type;
            r.site_upload = 1;
            r.rapnet_upload = 1;

            const attr = r.attr || {};
            delete r.attr;

            // --- START FIX: CLEAN EXTRA FIELDS ---
            // Remove fields that do not exist in dai_product table
            const extraFields = ['bgm', 'package', 'measurements', 'certificate'];
            extraFields.forEach(field => delete r[field]);
            // --- END FIX ---

            if (!SkuData || Object.keys(SkuData).length === 0) {
              r.visibility = 1;
            } else {
              r.visibility = 0;
              r.parent_id = SkuData.id;
              SkuData.child_count = (SkuData.child_count || 0) + 1;
              r.sku = `${r.sku}-${SkuData.child_count}`;
            }

            skuArray.push(r.sku);

            const rData = helper.insertString(r);
            const productSql = `INSERT INTO dai_product (${rData[0]}) VALUES (${rData[1]})`;

            return new Promise((resolve, reject) => {
              connection.query(productSql, (err, result) => {
                if (err) return reject(err);

                const pid = result.insertId;
                iProducts.push(pid);
                attr.product_id = pid;

                logAudit({
                  actionType: "CREATE",
                  moduleName: "Diamond Stock",
                  recordId: pid,
                  recordReference: r.sku,
                  newValue: { sku: r.sku, inward_id: lid },
                  companyId,
                }).catch(console.error);

                const attrData = helper.insertString(attr);
                const attrSql = `INSERT INTO dai_product_value (${attrData[0]}) VALUES (${attrData[1]})`;

                connection.query(attrSql, (err) => {
                  if (err) return reject(err);
                  if (SkuData && (SkuData.group_type === "box" || SkuData.group_type === "parcel")) {
                    const updateSkuSql = `UPDATE dai_product SET polish_pcs=polish_pcs+${parseFloat(r.purchase_pcs)}, polish_carat=polish_carat+${parseFloat(r.purchase_carat)}, child_count=${SkuData.child_count} WHERE id=${SkuData.id}`;
                    connection.query(updateSkuSql, (err) => {
                      if (err) return reject(err);
                      resolve();
                    });
                  } else {
                    resolve();
                  }
                });
              });
            });
          });

          await Promise.all(promises);

        const finalUpdateSql = `UPDATE dai_inward SET products='${iProducts.join(",")}', due_amount=${iTotal}, final_amount=${iTotal}, carat=${iCarat}, pcs=${iPcs} WHERE id=${lid}`;

        connection.query(finalUpdateSql, (finalErr) => {
          if (finalErr) return res.status(201).json({ status: false, message: finalErr });

          const track = {
            product_id: iProducts.join(","),
            action: post.inward_type,
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            description: `New Stone import with ${post.inward_type} sku: ${skuArray.join(",")}`,
            user: userid,
            company: companyId,
          };

          const trackData = helper.insertString(track);
          const trackSql = `INSERT INTO user_track (${trackData[0]}) VALUES (${trackData[1]})`;

          connection.query(trackSql, (trackErr) => {
            if (trackErr) return res.status(201).json({ status: false, message: trackErr });
            logAudit({
              actionType: "STOCK_IN",
              moduleName: "Inward",
              recordId: lid,
              recordReference: String(reference),
              newValue: { inward_id: lid, products: iProducts, skus: skuArray },
              companyId,
            }).catch(console.error);
            res.status(201).json({ status: true, message: "Purchase created successfully." });
          });
        });
        } catch (innerErr) {
          console.error("inward/save product loop:", innerErr);
          return res.status(500).json({
            status: false,
            message: innerErr.sqlMessage || innerErr.message || "Failed to save inward products.",
          });
        }
      });
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
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

module.exports = inwardRouter;
