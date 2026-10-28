const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const productHelper = require("../../productHelper.js");
const moment = require("moment");
const { authenticateToken } = require("../../authMiddleware.js");
const outwardService = require("./outwardService.js");
const { validateHoldBodyMiddleware } = require("./holdValidation.js");
const outwardRouter = express.Router();
const {
  buildUserContext,
  resolveOperatingCompanyId,
  resolveListCompanyIds,
} = require("../../tenantHelper.js");
const { deleteOutwardStock } = require("../transaction/transactionStockService.js");
outwardRouter.use(express.json());

outwardRouter.post(
  "/outward/hold",
  authenticateToken,
  validateHoldBodyMiddleware,
  async (req, res) => {
    try {
      const { ids, status, date, description } = req.validatedHold;
      const userContext = buildUserContext(req);
      const result = await outwardService.holdProducts(
        { ids, status, date, description },
        userContext
      );
      return res.status(200).json({
        status: result.ok,
        message: result.message,
      });
    } catch (error) {
      console.error("hold error:", error);
      return res.status(500).json({
        status: false,
        message: error.message || "Server error",
      });
    }
  }
);

outwardRouter.post("/outward/sendTo", authenticateToken, async (req, res) => {
  try {
    const mapped = outwardService.mapRequestBody(req.body);
    const requestedCompany =
      req.body?.operating_company_id ??
      req.body?.operating_company ??
      req.body?.tenant_company_id ??
      mapped.operating_company_id;
    if (!requestedCompany) {
      return res.status(400).json({
        status: false,
        message: "Company is required",
      });
    }
    const operatingCompanyId = await resolveOperatingCompanyId(req, requestedCompany);
    const userContext = {
      ...buildUserContext(req),
      companyId: operatingCompanyId,
    };
    delete mapped.operating_company_id;
    delete mapped.operating_company;
    delete mapped.tenant_company_id;
    const result = await outwardService.sendTo(mapped, userContext);
    if (result.ok) {
      return res.status(200).json({
        status: true,
        message: result.message,
        id: result.id,
        transfer_id: result.transfer_id,
        transfer_no: result.transfer_no,
        is_inter_transfer: result.is_inter_transfer,
      });
    }
    return res.status(200).json({
      status: false,
      message: result.message,
    });
  } catch (error) {
    console.error("sendTo error:", error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      status: false,
      message: error.message || "Server error",
    });
  }
});

outwardRouter.post("/outward/list", authenticateToken, async (req, res) => {
  const userContext = buildUserContext(req);
  const post = req.body;

  if (!post || Object.keys(post).length === 0) {
    return res.status(400).json({ error: "Request body is empty" });
  }

  try {
    const companyIds = await resolveListCompanyIds(userContext, 1);
    if (!companyIds.length) {
      return res.status(201).json({ status: true, Data: [], total: 0, message: "No records found" });
    }
    const companyPlaceholders = companyIds.map(() => "?").join(",");

    const filterParams = [];

    // 1. Dynamic Conditions
    let party = "";
    if (post.party && post.party !== "0" && post.party !== 0) {
      party = " AND o.party = ?";
      filterParams.push(post.party);
    }

    // Exact / prefix match — avoid LIKE '%1%' matching every invoice that contains "1"
    let invoiceNo = "";
    if (post.invoiceno && post.invoiceno !== "") {
      const inv = String(post.invoiceno).trim();
      invoiceNo = " AND (CAST(o.invoiceno AS CHAR) = ? OR CAST(o.invoiceno AS CHAR) LIKE ?)";
      filterParams.push(inv, `${inv}%`);
    }

    let dateFilter = "";
    if (post.from || post.to) {
      const from = post.from && moment(post.from, "YYYY-MM-DD").isValid()
        ? moment(post.from, "YYYY-MM-DD").format("YYYY-MM-DD")
        : "2010-01-01";
      const to = post.to && moment(post.to, "YYYY-MM-DD").isValid()
        ? moment(post.to, "YYYY-MM-DD").format("YYYY-MM-DD")
        : "2050-12-31";
      dateFilter = " AND o.date BETWEEN ? AND ?";
      filterParams.push(from, to);
    }

    // 2. Base Query Logic
    let typeFilter = "";
    if (post.type === "memo" || post.type === "consign") {
      typeFilter = " AND o.type IN ('memo', 'consign')";
    } else if (post.type === "sale" || post.type === "export") {
      typeFilter = " AND o.type IN ('sale', 'export') AND o.status IN ('on_sale', 'on_export')";
    } else {
      // Agar type khali hai toh crash na ho, default filter laga dein
      typeFilter = " AND o.type IN ('memo', 'consign', 'sale', 'export')";
    }

    // 3. User Logic
    let userFilter = (post.userid === 16 || post.userid === 1) ? "" : " AND o.user != 16";

    // 4. Pagination Fix (Offset calculation)
    const limit = parseInt(post.limit, 10) || 100;
    const page = parseInt(post.page, 10) || 1;
    const offset = (page - 1) * limit;

    // Branch-wide: sale/memo saved under operating company must still appear
    const baseFromWhere = `FROM dai_outward o
                   LEFT JOIN dai_party p ON (o.party = CAST(p.id AS CHAR) OR o.party = p.id OR o.party = p.name)
                   LEFT JOIN company comp ON (o.party = CAST(comp.id AS CHAR) OR o.party = comp.id OR o.party = comp.name OR o.party = comp.shortcutName)
                   WHERE o.company IN (${companyPlaceholders})
                   ${typeFilter} ${userFilter} ${party} ${invoiceNo} ${dateFilter}`;

    const countParams = [...companyIds, ...filterParams];

    // totalPcs/Carat from outward line items (sold qty), NOT product remaining polish_pcs
    const query = `SELECT o.id, o.entryno, o.type, o.invoiceno, COALESCE(p.name, comp.name, o.party) as party, o.reference,
                          DATE_FORMAT(o.invoicedate, '%d-%m-%Y') AS invoicedate,
                          DATE_FORMAT(o.date, '%d-%m-%Y') AS date,
                          COALESCE(NULLIF(o.final_amount, 0), (
                            SELECT SUM(oi.amount) FROM dai_outward_item oi WHERE oi.outward_id = o.id
                          ), 0) as finalAmount,
                          COALESCE((
                            SELECT SUM(oi.pcs) FROM dai_outward_item oi
                            WHERE oi.outward_id = o.id
                          ), 0) as totalPcs,
                          COALESCE((
                            SELECT SUM(oi.carat) FROM dai_outward_item oi
                            WHERE oi.outward_id = o.id
                          ), 0) as totalCarat
                   ${baseFromWhere}
                   GROUP BY o.id, o.entryno, o.type, o.invoiceno, p.name, o.reference, o.invoicedate, o.date, o.final_amount
                   ORDER BY o.date DESC, o.id DESC
                   LIMIT ?, ?`;

    const queryParams = [...companyIds, ...filterParams, offset, limit];

    const countQuery = `SELECT COUNT(DISTINCT o.id) as total ${baseFromWhere}`;

    connection.query(countQuery, countParams, (countError, countData) => {
      if (countError) {
        console.error("Outward count SQL Error:", countError);
        return res.status(201).json({ status: false, message: "Database Error", error: countError.sqlMessage });
      }

      connection.query(query, queryParams, (error, data) => {
        if (error) {
          console.error("SQL Error:", error);
          return res.status(201).json({ status: false, message: "Database Error", error: error.sqlMessage });
        }

        const total = Number(countData?.[0]?.total || 0);
        if (data && data.length > 0) {
          res.status(201).json({ status: true, Data: data, total });
        } else {
          res.status(201).json({ status: true, Data: [], total, message: "No records found" });
        }
      });
    });

  } catch (error) {
    console.error("Catch Error:", error);
    res.status(201).json({ status: false, message: error.message });
  }
});

outwardRouter.get("/outward/", authenticateToken, async (req, res) => {
  const id = parseInt(req?.query?.id) || 0;

  if (!id) {
    return res.status(400).json({ error: "Invalid Id" });
  }

  try {
    const companyIds = await resolveListCompanyIds(buildUserContext(req), 1);
    const companyPlaceholders = companyIds.map(() => "?").join(",") || "?";
    const companyParams = companyIds.length ? companyIds : [1];
    const query = `SELECT o.*,
      COALESCE(p.name, comp.name, o.party) AS party_name,
      COALESCE(p.address, comp.address) AS party_address,
      COALESCE(p.pincode, comp.pincode) AS party_pincode,
      COALESCE(p.country, comp.country) AS party_country,
      COALESCE(p.contact_number, comp.number) AS party_contact,
      p.fax AS party_fax,
      COALESCE(p.contact_person, comp.partner) AS contact_person,
      c.name AS company_name,
      c.address AS company_address,
      c.city AS company_city,
      c.state AS company_state,
      c.pincode AS company_pincode,
      c.country AS company_country,
      c.number AS company_number,
      c.email AS company_email,
      c.website AS company_website,
      c.logo AS company_logo
    FROM dai_outward o
    LEFT JOIN dai_party p ON (o.party = CAST(p.id AS CHAR) OR o.party = p.id OR o.party = p.name)
    LEFT JOIN company comp ON (o.party = CAST(comp.id AS CHAR) OR o.party = comp.id OR o.party = comp.name OR o.party = comp.shortcutName)
    LEFT JOIN company c ON (o.company = c.id)
    WHERE o.id = ? AND o.company IN (${companyPlaceholders})`;

    connection.query(query, [id, ...companyParams], (error, data) => {
      if (error) {
        return res.status(201).json({
          status: false,
          message: "Error in Fetching data ",
          Data: error,
        });
      }

      const finishWithRow = (row) => {
        const productIds = String(row.products || "")
          .split(",")
          .map((p) => parseInt(p.trim(), 10))
          .filter((p) => Number.isInteger(p) && p > 0);

        const respondWithProducts = (pdata) => {
          connection.query(
            `SELECT * FROM dai_outward_item
             WHERE outward_id = ?
               AND 1=1`,
            [id],
            (itemErr, items) => {
              let productsOut = dedupeProductsById(pdata || []);
              if (!itemErr && Array.isArray(items) && items.length) {
                if (productsOut.length) {
                  const byPid = {};
                  for (const it of items) {
                    const key = String(it.product_id);
                    if (!byPid[key]) {
                      byPid[key] = { ...it, pcs: 0, carat: 0, amount: 0 };
                    }
                    byPid[key].pcs += Number(it.pcs) || 0;
                    byPid[key].carat += Number(it.carat) || 0;
                    byPid[key].amount += Number(it.amount) || 0;
                    if (it.price != null && it.price !== "") byPid[key].price = it.price;
                  }
                  productsOut = productsOut.map((p) => {
                    const it = byPid[String(p.id)];
                    if (!it) return p;
                    return {
                      ...p,
                      polish_pcs: it.pcs,
                      polish_carat: it.carat,
                      sell_price: it.price || p.sell_price || p.price,
                      sell_amount: it.amount || p.sell_amount || p.amount,
                      memo_line_pcs: it.pcs,
                      memo_line_carat: it.carat,
                    };
                  });
                } else {
                  productsOut = dedupeProductsById(items.map((it) => ({
                    id: it.product_id,
                    sku: it.sku || "",
                    polish_pcs: Number(it.pcs) || 0,
                    polish_carat: Number(it.carat) || 0,
                    sell_price: Number(it.price) || 0,
                    sell_amount: Number(it.amount) || 0,
                    memo_line_pcs: it.pcs,
                    memo_line_carat: it.carat,
                  })));
                }
              }
              res.status(201).json({ status: true, Data: row, products: productsOut });
            }
          );
        };

        if (!productIds.length) {
          return respondWithProducts([]);
        }

        const placeholders = productIds.map(() => "?").join(",");
        const pquery = `SELECT p.*, pv.* FROM dai_product p
          LEFT JOIN dai_product_value pv ON p.id = pv.product_id
          WHERE p.id IN (${placeholders})`;

        connection.query(pquery, productIds, (error, pdata) => {
          if (error) {
            return res.status(201).json({
              status: false,
              message: "Product -  Error in Fetching data ",
              Data: error,
            });
          }
          respondWithProducts(pdata || []);
        });
      };

      if (data && data.length > 0) {
        return finishWithRow(data[0]);
      }

      connection.query("SELECT * FROM dai_outward WHERE id = ?", [id], (err2, data2) => {
        if (err2 || !data2?.length) {
          return res.status(201).json({ status: false, message: "Error in Fetching data " });
        }
        return finishWithRow(data2[0]);
      });
    });
  } catch (error) {
    res.status(201).json({ status: false, message: error.message });
  }
});
outwardRouter.post("/outward/update", authenticateToken, async (req, res) => {
  try {
    const result = await outwardService.updateOutward(req.body);
    if (result.ok) {
      return res.status(200).json({ status: true, message: result.message });
    }
    return res.status(200).json({ status: false, message: result.message });
  } catch (error) {
    console.error("outward update error:", error);
    return res.status(500).json({ status: false, message: error.message || "Server error" });
  }
});

outwardRouter.post("/outward/getProducts", authenticateToken, async (req, res) => {
  const userContext = buildUserContext(req);
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Invalid Id" });
  }

  try {
    const companyIds = await resolveListCompanyIds(userContext, 1);
    const companyPlaceholders = companyIds.map(() => "?").join(",") || "?";
    const companyParams = companyIds.length ? companyIds : [1];

    let query = `SELECT * FROM dai_outward WHERE id = ? AND company IN (${companyPlaceholders})`;

    connection.query(query, [id, ...companyParams], async (error, data) => {
      if (error) {
        return res.status(201).json({
          status: false,
          message: "Error in Fetching data ",
          data: error,
        });
      }

      if (!data || !data.length) {
        // Fallback: id only (memo/sale under sibling company)
        connection.query("SELECT * FROM dai_outward WHERE id = ?", [id], (err2, data2) => {
          if (err2 || !data2?.length) {
            return res.status(201).json({ status: false, message: "Error in Fetching data " });
          }
          return loadOutwardProductsResponse(res, data2[0], companyParams, companyPlaceholders);
        });
        return;
      }

      return loadOutwardProductsResponse(res, data[0], companyParams, companyPlaceholders);
    });
  } catch (error) {
    res.status(201).json({ status: false, message: error.message });
  }
});

/** LEFT JOIN dai_product_value can multiply one product into many rows (5+5+5=15 totals). */
function dedupeProductsById(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const seen = new Map();
  for (const row of rows) {
    const key = String(row?.id ?? "");
    if (!key || key === "undefined" || key === "null") continue;
    if (!seen.has(key)) seen.set(key, row);
  }
  return [...seen.values()];
}

/** Overlay THIS voucher's line pcs/carat onto product rows (not remaining stock). */
function overlayOutwardItemQtys(res, outwardId, products, fallbackFn) {
  connection.query(
    `SELECT * FROM dai_outward_item
     WHERE outward_id = ?
       AND (status IS NULL OR status NOT IN ('returned','cancelled'))
     ORDER BY id ASC`,
    [outwardId],
    (itemErr, items) => {
      if (itemErr || !items?.length) {
        if (typeof fallbackFn === "function" && (!products || !products.length)) {
          return fallbackFn();
        }
        return res.status(201).json({ status: true, products: products || [] });
      }
      const byPid = {};
      for (const it of items) {
        const key = String(it.product_id);
        if (!byPid[key]) {
          byPid[key] = { ...it, pcs: 0, carat: 0, amount: 0, price: Number(it.price) || 0 };
        }
        byPid[key].pcs += Number(it.pcs) || 0;
        byPid[key].carat += Number(it.carat) || 0;
        byPid[key].amount += Number(it.amount) || 0;
        if (it.price != null && it.price !== "") {
          byPid[key].price = Number(it.price) || byPid[key].price;
        }
      }
      const productsOut = (products || []).map((p) => {
        const it = byPid[String(p.id)];
        if (!it) return p;
        const pcs = Number(it.pcs) || 0;
        const carat = Number(it.carat) || 0;
        const price = Number(it.price) || Number(p.sell_price) || Number(p.price) || 0;
        const amount = Number(it.amount) || Number((carat * price).toFixed(2));
        return {
          ...p,
          polish_pcs: pcs,
          polish_carat: carat,
          sell_price: price,
          sell_amount: amount,
          price,
          amount,
          memo_line_pcs: pcs,
          memo_line_carat: carat,
        };
      });
      return res.status(201).json({ status: true, products: productsOut });
    }
  );
}

function loadOutwardProductsResponse(res, outwardRow, companyParams, companyPlaceholders) {
  const productIds = String(outwardRow.products || "")
    .split(",")
    .map((p) => parseInt(p.trim(), 10))
    .filter((p) => Number.isInteger(p) && p > 0);

  const sendFromItems = () => {
    connection.query(
      `SELECT * FROM dai_outward_item
       WHERE outward_id = ?
         AND (status IS NULL OR status NOT IN ('returned','cancelled'))
       ORDER BY id ASC`,
      [outwardRow.id],
      (itemErr, items) => {
        if (itemErr || !items?.length) {
          return res.status(201).json({ status: false, message: "There is no product found." });
        }
        const products = items.map((it) => ({
          id: it.product_id,
          sku: it.sku || "",
          polish_pcs: Number(it.pcs) || 0,
          polish_carat: Number(it.carat) || 0,
          sell_price: Number(it.price) || 0,
          sell_amount: Number(it.amount) || 0,
          price: Number(it.price) || 0,
          amount: Number(it.amount) || 0,
          memo_line_pcs: Number(it.pcs) || 0,
          memo_line_carat: Number(it.carat) || 0,
        }));
        return res.status(201).json({ status: true, products: dedupeProductsById(products) });
      }
    );
  };

  if (!productIds.length) {
    return sendFromItems();
  }

  const placeholders = productIds.map(() => "?").join(",");
  const pquery = `SELECT p.*, pv.* FROM dai_product p
    LEFT JOIN dai_product_value pv ON p.id = pv.product_id
    WHERE p.id IN (${placeholders})
      AND p.company IN (${companyPlaceholders})`;

  connection.query(pquery, [...productIds, ...companyParams], (error, pdata) => {
    if (error) {
      return res.status(201).json({
        status: false,
        message: "Product -  Error in Fetching data ",
        data: error,
      });
    }

    if (pdata && pdata.length > 0) {
      return overlayOutwardItemQtys(res, outwardRow.id, dedupeProductsById(pdata), sendFromItems);
    }

    // Product company mismatch — try without company filter, then outward_item
    connection.query(
      `SELECT p.*, pv.* FROM dai_product p
       LEFT JOIN dai_product_value pv ON p.id = pv.product_id
       WHERE p.id IN (${placeholders})`,
      productIds,
      (err2, pdata2) => {
        if (!err2 && pdata2?.length) {
          return overlayOutwardItemQtys(res, outwardRow.id, dedupeProductsById(pdata2), sendFromItems);
        }
        return sendFromItems();
      }
    );
  });
}


// Express route
// 1. URL se "/:id" hata diya taaki ye "?deleteId=" ko accept kare
outwardRouter.delete("/outward", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId, 10);

  if (!id) {
    return res.status(400).json({ status: false, message: "Invalid ID: deleteId missing in URL" });
  }

  try {
    const result = await deleteOutwardStock(id, { moduleName: "Outward" });
    if (!result.ok) {
      return res.status(404).json({ status: false, message: result.message || "Record not found" });
    }
    return res.status(200).json({ status: true, message: result.message || "Record deleted successfully" });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.sqlMessage || err.message });
  }
});

module.exports = outwardRouter;

