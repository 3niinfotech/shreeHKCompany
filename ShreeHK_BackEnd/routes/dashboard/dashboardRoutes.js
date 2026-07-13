const express = require("express");
const { authenticateToken } = require("../../authMiddleware.js");
const { getDashboardSummary } = require("../../services/inventorySummaryService.js");

const dashboardRouter = express.Router();

dashboardRouter.get("/dashboard/summary", authenticateToken, async (req, res) => {
  try {
    const Data = await getDashboardSummary(req);
    res.status(200).json({
      status: true,
      Message: "Dashboard summary loaded",
      Data,
    });
  } catch (error) {
    console.error("dashboard/summary error:", error);
    res.status(500).json({
      status: false,
      Message: error.message || "Failed to load dashboard summary",
      Data: {},
    });
  }
});

module.exports = dashboardRouter;
