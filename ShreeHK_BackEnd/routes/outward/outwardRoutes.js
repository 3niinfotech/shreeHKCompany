const express = require("express");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const productHelper = require("../../productHelper.js");
const moment = require("moment");
const { authenticateToken } = require("../../authMiddleware.js");
const outwardService = require("./outwardService.js");
const { validateHoldBodyMiddleware } = require("./holdValidation.js");
const outwardRouter = express.Router();
const { buildUserContext } = require("../../tenantHelper.js");
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
    const userContext = buildUserContext(req);
    const result = await outwardService.sendTo(mapped, userContext);
    if (result.ok) {
      return res.status(200).json({
        status: true,
        message: result.message,
        id: result.id,
      });
    }
    return res.status(200).json({
      status: false,
      message: result.message,
    });
  } catch (error) {
    console.error("sendTo error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Server error",
    });
  }
});

outwardRouter.post("/outward/list", authenticateToken, async (req, res) => {
  const companyId = buildUserContext(req).companyId;
  if (!companyId || companyId <= 0) {
    return res.status(201).json({ status: true, Data: [], total: 0, message: "No records found" });
  }

  const post = req.body;

  if (!post || Object.keys(post).length === 0) {
    return res.status(400).json({ error: "Request body is empty" });
  }

  try {
    const filterParams = [];

    // 1. Dynamic Conditions
    let party = "";
    if (post.party && post.party !== "0" && post.party !== 0) {
      party = " AND o.party = ?";
      filterParams.push(post.party);
    }

    // Yahan fix: Frontend se 'invoiceno' aa raha hai, backend 'invoice' check kar raha tha
    let invoiceNo = "";
    if (post.invoiceno && post.invoiceno !== "") {
      invoiceNo = " AND o.invoiceno LIKE ?";
      filterParams.push(`%${post.invoiceno}%`);
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
      typeFilter = " AND o.type IN ('memo', 'consign') AND o.status IN ('on_memo', 'on_consign')";
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

    const baseFromWhere = `FROM dai_outward o
                   LEFT JOIN dai_party p ON o.party = p.id AND p.company = ?
                   LEFT JOIN dai_product dp ON FIND_IN_SET(dp.id, o.products) AND dp.company = ?
                   WHERE o.company = ? 
                   ${typeFilter} ${userFilter} ${party} ${invoiceNo} ${dateFilter}`;

    const countParams = [companyId, companyId, companyId, ...filterParams];

    const query = `SELECT o.id, o.entryno, o.type, o.invoiceno, p.name as party, o.reference,
                          DATE_FORMAT(o.invoicedate, '%d-%m-%Y') AS invoicedate,
                          DATE_FORMAT(o.date, '%d-%m-%Y') AS date,
                          o.final_amount as finalAmount,
                          COALESCE(SUM(dp.polish_pcs), 0) as totalPcs,
                          COALESCE(SUM(dp.polish_carat), 0) as totalCarat
                   ${baseFromWhere}
                   GROUP BY o.id, o.entryno, o.type, o.invoiceno, p.name, o.reference, o.invoicedate, o.date, o.final_amount
                   ORDER BY o.date DESC, o.id DESC
                   LIMIT ?, ?`;

    const queryParams = [companyId, companyId, companyId, ...filterParams, offset, limit];

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

outwardRouter.get("/outward/", authenticateToken, (req, res) => {
  const companyId = buildUserContext(req).companyId;
  if (!companyId || companyId <= 0) {
    return res.status(201).json({ status: false, message: "Error in Fetching data" });
  }

  const id = parseInt(req?.query?.id) || 0;

  if (!id) {
    return res.status(400).json({ error: "Invalid Id" });
  }

  try {
    let query = "SELECT * FROM dai_outward WHERE id = ? AND company = ?";

    connection.query(query, [id, companyId], (error, data) => {
      if (error) {
        return res.status(201).json({
          status: false,
          message: "Error in Fetching data ",
          Data: error,
        });
      }

      if (data && data.length > 0) {
        let products = data[0]["products"];
        const productIds = String(products || "")
          .split(",")
          .map((p) => parseInt(p.trim(), 10))
          .filter((p) => Number.isInteger(p) && p > 0);

        if (productIds.length > 0) {
          const placeholders = productIds.map(() => "?").join(",");
          let pquery = `SELECT * FROM dai_product p JOIN dai_product_value pv ON p.id = pv.product_id WHERE p.company = ? AND p.id IN (${placeholders})`;

          connection.query(pquery, [companyId, ...productIds], (error, pdata) => {
            if (error) {
              return res.status(201).json({
                status: false,
                message: "Product -  Error in Fetching data ",
                Data: error,
              });
            }

            if (pdata && pdata.length > 0) {
              res
                .status(201)
                .json({ status: true, Data: data[0], products: pdata });
            } else {
              res.status(201).json({
                status: false,
                message: "Product - Error in Fetching data ",
              });
            }
          });
        } else {
          res
            .status(201)
            .json({ status: false, message: "There is no product found." });
        }
      } else {
        res
          .status(201)
          .json({ status: false, message: "Error in Fetching data " });
      }
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
  const companyId = buildUserContext(req).companyId;
  if (!companyId || companyId <= 0) {
    return res.status(201).json({ status: false, message: "Error in Fetching data" });
  }

  const { id, ...body } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Invalid Id" });
  }

  try {
    let query = "SELECT * FROM dai_outward WHERE id = ? AND company = ?";

    connection.query(query, [id, companyId], (error, data) => {
      if (error) {
        return res.status(201).json({
          status: false,
          message: "Error in Fetching data ",
          data: error,
        });
      }

      if (data && data.length > 0) {
        let products = data[0]["products"];
        const productIds = String(products || "")
          .split(",")
          .map((p) => parseInt(p.trim(), 10))
          .filter((p) => Number.isInteger(p) && p > 0);

        if (productIds.length > 0) {
          const placeholders = productIds.map(() => "?").join(",");
          let pquery = `SELECT * FROM dai_product p JOIN dai_product_value pv ON p.id = pv.product_id WHERE p.company = ? AND p.id IN (${placeholders})`;

          connection.query(pquery, [companyId, ...productIds], (error, pdata) => {
            if (error) {
              return res.status(201).json({
                status: false,
                message: "Product -  Error in Fetching data ",
                data: error,
              });
            }

            if (pdata && pdata.length > 0) {
              res.status(201).json({ status: true, products: pdata });
            } else {
              res.status(201).json({
                status: false,
                message: "Product - Error in Fetching data ",
              });
            }
          });
        } else {
          res
            .status(201)
            .json({ status: false, message: "There is no product found." });
        }
      } else {
        res
          .status(201)
          .json({ status: false, message: "Error in Fetching data " });
      }
    });
  } catch (error) {
    res.status(201).json({ status: false, message: error.message });
  }
});


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

