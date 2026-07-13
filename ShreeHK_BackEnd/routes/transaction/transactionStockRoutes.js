const express = require("express");
const { authenticateToken } = require("../../authMiddleware.js");
const stockService = require("./transactionStockService.js");

const { buildUserContext } = require("../../tenantHelper.js");

const transactionStockRouter = express.Router();
transactionStockRouter.use(express.json());

transactionStockRouter.post("/transaction/gia/list", authenticateToken, async (req, res) => {
  try {
    const result = await stockService.listGia(req.body, buildUserContext(req));
    return res.status(200).json({ status: true, Data: result.Data, TotalItems: result.TotalItems });
  } catch (error) {
    console.error("gia list error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.post("/transaction/inward-stock/list", authenticateToken, async (req, res) => {
  try {
    const result = await stockService.listInwardStock(req.body, buildUserContext(req));
    return res.status(200).json({ status: true, Data: result.Data, TotalItems: result.TotalItems });
  } catch (error) {
    console.error("inward stock list error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.post("/transaction/purchase-stock/list", authenticateToken, async (req, res) => {
  try {
    const result = await stockService.listPurchaseStock(req.body, buildUserContext(req));
    return res.status(200).json({ status: true, Data: result.Data, TotalItems: result.TotalItems });
  } catch (error) {
    console.error("purchase stock list error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.post("/transaction/outward-stock/list", authenticateToken, async (req, res) => {
  try {
    const allowed = ["sale", "memo", "export", "consign"];
    const stockType = allowed.includes(req.body.stockType) ? req.body.stockType : "memo";
    const result = await stockService.listOutwardStock(req.body, stockType, buildUserContext(req));
    return res.status(200).json({ status: true, Data: result.Data, TotalItems: result.TotalItems });
  } catch (error) {
    console.error("outward stock list error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.post("/transaction/gia/return", authenticateToken, async (req, res) => {
  try {
    const result = await stockService.returnGia(req.body, buildUserContext(req));
    return res.status(200).json({ status: result.ok, message: result.message });
  } catch (error) {
    console.error("gia return error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.post("/transaction/inward-stock/return", authenticateToken, async (req, res) => {
  try {
    const result = await stockService.returnInwardMemo(req.body);
    return res.status(200).json({ status: result.ok, message: result.message });
  } catch (error) {
    console.error("inward return error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.post("/transaction/inward-stock/memo-to-purchase", authenticateToken, async (req, res) => {
  try {
    const result = await stockService.inwardMemoToPurchase(req.body, buildUserContext(req));
    return res.status(200).json({ status: result.ok, message: result.message, id: result.id });
  } catch (error) {
    console.error("memo to purchase error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.post("/transaction/outward-stock/return", authenticateToken, async (req, res) => {
  try {
    const result = await stockService.returnOutwardMemo(req.body);
    return res.status(200).json({ status: result.ok, message: result.message });
  } catch (error) {
    console.error("outward return error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.post("/transaction/outward-stock/memo-to-sale", authenticateToken, async (req, res) => {
  try {
    const result = await stockService.outwardMemoToSale(req.body, buildUserContext(req));
    return res.status(200).json({ status: result.ok, message: result.message, id: result.id });
  } catch (error) {
    console.error("memo to sale error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.post("/transaction/outward-stock/to-export", authenticateToken, async (req, res) => {
  try {
    const result = await stockService.outwardToExport(req.body);
    return res.status(200).json({ status: result.ok, message: result.message });
  } catch (error) {
    console.error("to export error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.post("/transaction/purchase-stock/toggle-type", authenticateToken, async (req, res) => {
  try {
    const result = await stockService.toggleInwardType(req.body);
    return res.status(200).json({ status: result.ok, message: result.message });
  } catch (error) {
    console.error("toggle type error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.delete("/transaction/inward-stock", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId, 10);
  if (!id) return res.status(400).json({ status: false, message: "Invalid deleteId" });
  try {
    const result = await stockService.deleteInwardStock(id);
    return res.status(200).json({ status: result.ok, message: result.message });
  } catch (error) {
    console.error("delete inward error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.delete("/transaction/gia", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId, 10);
  if (!id) return res.status(400).json({ status: false, message: "Invalid deleteId" });
  try {
    const result = await stockService.deleteGia(id);
    return res.status(200).json({ status: result.ok, message: result.message });
  } catch (error) {
    console.error("delete gia error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.delete("/transaction/outward-stock", authenticateToken, async (req, res) => {
  const id = parseInt(req.query.deleteId, 10);
  if (!id) return res.status(400).json({ status: false, message: "Invalid deleteId" });
  try {
    const result = await stockService.deleteOutwardStock(id);
    return res.status(200).json({ status: result.ok, message: result.message });
  } catch (error) {
    console.error("delete outward stock error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

transactionStockRouter.get("/transaction/print/:type/:id", authenticateToken, async (req, res) => {
  try {
    const { generateTransactionPdf } = require("./transactionPrintService.js");
    const pdfBuffer = await generateTransactionPdf(req.params.type, req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${req.params.type}-${req.params.id}.pdf"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    const code = error.statusCode || 500;
    if (code === 500 && !error.statusCode) {
      const stub = stockService.getPrintStub(req.params.type, req.params.id);
      return res.status(200).json(stub);
    }
    return res.status(code).json({ status: false, message: error.message });
  }
});

module.exports = transactionStockRouter;
