const express = require("express");
const connection = require("../../connection.js");
const { authenticateToken } = require("../../authMiddleware.js");
const reportService = require("./reportService.js");
const reportRouter = express.Router();
const moment = require("moment");
reportRouter.use(express.json());

reportRouter.get("/report/filter-options", authenticateToken, async (req, res) => {
  try {
    const companyId = Number(req.user?.companyId) || 1;
    const Data = await reportService.getFilterOptions(companyId);
    return res.json({ status: true, Data });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
});

reportRouter.post("/report/group", authenticateToken, async (req, res) => {
  try {
    const companyId = Number(req.user?.companyId) || 1;
    const userId = Number(req.user?.user_id) || 1;
    const Data = await reportService.getGroupReport(req.body, companyId, userId);
    return res.json({ status: true, Data, TotalItems: Data.length });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
});

reportRouter.post("/report/transaction", authenticateToken, async (req, res) => {
  try {
    const companyId = Number(req.user?.companyId) || 1;
    const userId = Number(req.user?.user_id) || 1;
    const Data = await reportService.getTransactionReport(req.body, companyId, userId);
    return res.json({ status: true, Data, TotalItems: Data.length });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
});

reportRouter.post("/report/sale-stock", authenticateToken, async (req, res) => {
  try {
    const companyId = Number(req.user?.companyId) || 1;
    const type = req.body?.type || "sale";
    let Data = [];
    if (type === "sale") {
      Data = await reportService.getStoneSaleReport(req.body, companyId);
    }
    return res.json({ status: true, Data, TotalItems: Data.length });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
});

reportRouter.get("/report/stone-detail", authenticateToken, async (req, res) => {
  try {
    const sku = req.query.sku;
    if (!sku) return res.status(400).json({ status: false, message: "sku is required" });
    const companyId = Number(req.user?.companyId) || 1;
    const userId = Number(req.user?.user_id) || 1;
    const result = await reportService.getStoneDetail(sku, companyId, userId);
    if (!result) return res.status(404).json({ status: false, message: "Product not found" });
    return res.json({ status: true, ...result });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
});

reportRouter.get("/report/stone-info", authenticateToken, async (req, res) => {
  try {
    const sku = req.query.sku;
    if (!sku) return res.status(400).json({ status: false, message: "sku is required" });
    const companyId = Number(req.user?.companyId) || 1;
    const userId = Number(req.user?.user_id) || 1;
    const result = await reportService.getStoneInfoByParty(sku, companyId, userId);
    if (!result) return res.status(404).json({ status: false, message: "Product not found" });
    return res.json({ status: true, Data: result });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
});

reportRouter.get("/report/transfer-history", authenticateToken, async (req, res) => {
  try {
    const sku = req.query.sku;
    const companyId = Number(req.user?.companyId) || 1;
    const userId = Number(req.user?.user_id) || 1;
    const rows = await reportService.getTransferHistory({
      sku,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
    });
    const partyMap = await reportService.getPartyMap();
    const Data = rows.map((r, i) => ({
      no: i + 1,
      sku: r.sku || "",
      date: r.date ? moment(r.date).format("YYYY/MM/DD") : "",
      toCompany: partyMap[r.party] || r.party || r.description || "",
      discription: r.description || "",
      userBy: r.user || "",
    }));
    return res.json({ status: true, Data, TotalItems: Data.length });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
});

reportRouter.post("/report/outstanding", authenticateToken, async (req, res) => {
  const post = req.body;

  if (!post || Object.keys(post).length === 0) {
    return res.status(400).json({ error: "Request body is empty" });
  }

  try {
    let responseData = {};

    // Build conditions
    let party = "";
    if (post.party && post.party !== "" && post.party !== "0") {
      party = ` AND party = ${post.party}`;
    }

    let invoice = "";
    if (post.invoice && post.invoice !== "") {
      invoice = ` AND invoiceno = ${post.invoice}`;
    }

    const moment = require("moment");

    const fromDate = post.from;
    const toDate = post.to;
    let dateFilter = "";
    // Process date filters
    if (fromDate && toDate) {
      const ffDate = moment(fromDate, "DD-MM-YYYY").format("YYYY/MM/DD");
      const ftDate = moment(toDate, "DD-MM-YYYY").format("YYYY/MM/DD");

      dateFilter = ` and o.date between '${ffDate}' and '${ftDate}'`;
    } else if (fromDate) {
      // Only from date provided
      const ffDate = moment(fromDate, "DD-MM-YYYY").format("YYYY/MM/DD");
      const maxDate = "2050/12/31";
      dateFilter = ` and o.date between '${ffDate}' and '${maxDate}'`;
    } else if (toDate) {
      // Only to date provided
      const minDate = "2010/01/01";
      const ftDate = moment(toDate, "DD-MM-YYYY").format("YYYY/MM/DD");
      dateFilter = ` and o.date between '${minDate}' and '${ftDate}'`;
    }

    const page = post.page;
    let query = "";
    let type = post.type;
    const companyId = 1;
    const userId = post.userid;

    let status = true;

    if (type === "sale") {
      if (userId === 16 || userId === 1) {
        query = `SELECT o.id, o.entryno, o.type, o.invoiceno, p.name, o.reference, 
                                 DATE_FORMAT(o.invoicedate, '%d-%m-%Y') AS invoicedate, 
                                 DATE_FORMAT(o.date, '%d-%m-%Y') AS date, 
                                  DATE_FORMAT(o.duedate, '%d-%m-%Y') AS due_date, 
                                      o.terms, 
                                     o.final_amount,
                                     o.paid_amount,
                                     o.due_amount                                 
                         FROM dai_outward o
                         LEFT JOIN dai_party p ON o.party = p.id
                         WHERE o.type IN ('sale', 'export') 
                         AND o.status IN ('on_sale', 'on_export') 
                         ${party} ${invoice} ${dateFilter}
                         ORDER BY o.date DESC, o.id DESC 
                         LIMIT ${page}, 10`;
      } else {
        query = `SELECT o.id, o.entryno, o.type, o.invoiceno, p.name, o.reference, 
                                 DATE_FORMAT(o.invoicedate, '%d-%m-%Y') AS invoicedate, 
                                 DATE_FORMAT(o.date, '%d-%m-%Y') AS date, 
                                  DATE_FORMAT(o.duedate, '%d-%m-%Y') AS due_date, 
                                      o.terms, 
                                     o.final_amount,
                                     o.paid_amount,
                                     o.due_amount                                
                         FROM dai_outward o
                         LEFT JOIN dai_party p ON o.party = p.id
                         WHERE o.type IN ('sale', 'export') 
                         AND o.user != 16 
                         AND o.status IN ('on_sale', 'on_export') 
                         ${party} ${invoice} ${dateFilter}
                         ORDER BY o.date DESC, o.id DESC 
                         LIMIT ${page}, 10`;
      }
    }
    else if (type === "purchase") {
      if (userId === 16 || userId === 1) {
        query = `SELECT o.id, o.entryno, o.inward_type as type, o.invoiceno, p.name, o.reference, 
                                 DATE_FORMAT(o.invoicedate, '%d-%m-%Y') AS invoicedate, 
                                 DATE_FORMAT(o.date, '%d-%m-%Y') AS date, 
                                  DATE_FORMAT(o.duedate, '%d-%m-%Y') AS due_date, 
                                      o.terms, 
                                     o.final_amount,
                                     o.paid_amount,
                                     o.due_amount                                 
                         FROM dai_inward o  
                         LEFT JOIN dai_party p ON o.party = p.id
                         WHERE o.inward_type IN ('purchase', 'import')   
                        AND (deleted = 0 || deleted IS NULL)                    
                         ${party} ${invoice} ${dateFilter}
                         ORDER BY o.date DESC, o.id DESC 
                         LIMIT ${page}, 10`;
      } else {
        query = `SELECT o.id, o.entryno, o.inward_type as type, o.invoiceno, p.name, o.reference, 
                                 DATE_FORMAT(o.invoicedate, '%d-%m-%Y') AS invoicedate, 
                                 DATE_FORMAT(o.date, '%d-%m-%Y') AS date, 
                                  DATE_FORMAT(o.duedate, '%d-%m-%Y') AS due_date, 
                                      o.terms, 
                                     o.final_amount,
                                     o.paid_amount,
                                     o.due_amount                                
                          FROM dai_inward o
                         LEFT JOIN dai_party p ON o.party = p.id
                         WHERE o.inward_type IN ('purchase', 'import')   
                         AND o.user != 16 
                         AND (deleted = 0 || deleted IS NULL)                         
                         ${party} ${invoice} ${dateFilter}
                         ORDER BY o.date DESC, o.id DESC 
                         LIMIT ${page}, 10`;
      }
    }

    connection.query(query, (error, data) => {
      if (error) {
        res.status(201).json({
          status: false,
          message: "Error in Fetching data ",
          data: error,
        });
      }

      if (data.length > 0) {
        res.status(201).json({ status: status, data: data });
      } else {
        res.status(201).json({ status: false, message: "Error in Fetching data " });
      }
    });
  } catch (error) {
    res.status(201).json({ status: false, message: error.message });
  }
});


reportRouter.post("/report/outstandingRecords", authenticateToken, async (req, res) => {
  const { id, type } = req.body;

  if (!id || !type) {
    return res.status(400).json({ error: "Missing required fields: id or type" });
  }

  try {
    let query = "";
    let idQuery = "";

    if (type === "sale") {
      idQuery = "AND sale_id = ?";
      query = `SELECT o.id, o.entryno, o.type, o.invoiceno, p.name, o.reference, 
                      DATE_FORMAT(o.invoicedate, '%d-%m-%Y') AS invoicedate, 
                      DATE_FORMAT(o.date, '%d-%m-%Y') AS date, 
                      DATE_FORMAT(o.duedate, '%d-%m-%Y') AS due_date, 
                      o.terms, 
                      o.final_amount,
                      o.paid_amount,
                      o.due_amount                                
               FROM dai_outward o
               LEFT JOIN dai_party p ON o.party = p.id
               WHERE o.id = ?`;
    } else if (type === "purchase") {
      idQuery = "AND purchase_id = ?";
      query = `SELECT o.id, o.entryno, o.inward_type as type, o.invoiceno, p.name, o.reference, 
                      DATE_FORMAT(o.invoicedate, '%d-%m-%Y') AS invoicedate, 
                      DATE_FORMAT(o.date, '%d-%m-%Y') AS date, 
                      DATE_FORMAT(o.duedate, '%d-%m-%Y') AS due_date, 
                      o.terms, 
                      o.final_amount,
                      o.paid_amount,
                      o.due_amount                                
               FROM dai_inward o
               LEFT JOIN dai_party p ON o.party = p.id
               WHERE o.id = ?`;
    } else {
      return res.status(400).json({ error: "Invalid type. Allowed values: sale, purchase" });
    }

    connection.query(query, [id], (error, data) => {
      if (error) {
        return res.status(500).json({ status: false, message: "Error fetching data", error });
      }

      if (data.length === 0) {
        return res.status(404).json({ status: false, message: "No records found" });
      }

      let pquery = `SELECT * FROM acc_transaction WHERE (deleted = 0 OR deleted IS NULL) ${idQuery} ORDER BY date`;

      connection.query(pquery, [id], (error, pdata) => {
        if (error) {
          return res.status(500).json({ status: false, message: "Error fetching transaction data", error });
        }

        data[0].records = pdata.length > 0 ? pdata : [];
        return res.status(200).json({ status: true, data: data[0] });
      });
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error", error: error.message });
  }
});

module.exports = reportRouter;
