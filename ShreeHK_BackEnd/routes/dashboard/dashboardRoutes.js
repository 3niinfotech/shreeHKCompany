const express = require("express");
const { authenticateToken } = require("../../authMiddleware.js");
const { getDashboardSummary } = require("../../services/inventorySummaryService.js");
const { getDashboardTrends } = require("../../services/dashboardTrendsService.js");

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

dashboardRouter.get("/dashboard/trends", authenticateToken, async (req, res) => {
  try {
    const Data = await getDashboardTrends(req);
    res.status(200).json({
      status: true,
      Message: "Dashboard trends loaded",
      Data,
    });
  } catch (error) {
    console.error("dashboard/trends error:", error);
    res.status(500).json({
      status: false,
      Message: error.message || "Failed to load dashboard trends",
      Data: {},
    });
  }
});

module.exports = dashboardRouter;
