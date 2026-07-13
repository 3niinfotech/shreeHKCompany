const express = require("express");
const connection = require("../../connection.js");
const { authenticateToken } = require("../../authMiddleware.js");
const productHelper = require("../../productHelper.js");

const integrationRouter = express.Router();
integrationRouter.use(express.json());

integrationRouter.post("/integration/refresh-rapnet-stock", authenticateToken, (req, res) => {
  const sql = `UPDATE dai_product p SET rapnet_upload = 0, site_upload = 0 WHERE
    visibility = 1 AND polish_carat <> 0 AND (p.outward = '' OR p.outward IS NULL)
    AND (p.box_id = '' OR p.box_id IS NULL) AND (p.parcel_id = '' OR p.parcel_id IS NULL)
    AND (p.lab <> '') AND hold = 0 AND is_uploadrapnet = 1 AND (hide = 0 OR hide IS NULL)`;
  connection.query(sql, (err) => {
    if (err) return res.status(500).json({ status: false, message: err.message });
    connection.query(
      `SELECT COUNT(*) AS cnt FROM dai_product p WHERE visibility = 1 AND polish_carat <> 0
       AND (p.outward = '' OR p.outward IS NULL) AND (p.box_id = '' OR p.box_id IS NULL)
       AND (p.parcel_id = '' OR p.parcel_id IS NULL) AND (p.lab <> '') AND hold = 0
       AND is_uploadrapnet = 1 AND (hide = 0 OR hide IS NULL)`,
      (cErr, rows) => {
        if (cErr) return res.status(500).json({ status: false, message: cErr.message });
        res.json({
          status: true,
          message: "RapNet stock refresh flags reset",
          affectedCount: rows[0]?.cnt || 0,
        });
      }
    );
  });
});

integrationRouter.get("/integration/gia-lookup", authenticateToken, async (req, res) => {
  try {
    const reportNo = req.query.reportNo || req.query.rn;
    if (!reportNo) return res.status(400).json({ status: false, message: "reportNo required" });
    const stones = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT p.sku, p.lab, pv.report_no, pv.shape, pv.color, pv.clarity, pv.cut, pv.polish
         FROM dai_product p JOIN dai_product_value pv ON p.id = pv.product_id
         WHERE pv.report_no = ? LIMIT 5`,
        [reportNo],
        (err, data) => (err ? reject(err) : resolve(data))
      );
    });
    if (stones.length) {
      return res.json({ status: true, source: "inventory", Data: stones });
    }
    return res.json({
      status: true,
      source: "external",
      message: "No local match. Configure GIA API credentials for live lookup.",
      reportNo,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
});

integrationRouter.post("/integration/website-sync", authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.body?.limit, 10) || 50, 200);
    const rows = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT p.id, p.sku FROM dai_product p
         WHERE p.visibility = 1 AND p.site_upload = 0 AND p.polish_carat > 0
         AND (p.outward = '' OR p.outward IS NULL) LIMIT ?`,
        [limit],
        (err, data) => (err ? reject(err) : resolve(data))
      );
    });
    const ids = rows.map((r) => r.id);
    if (ids.length) {
      await new Promise((resolve, reject) => {
        connection.query(
          `UPDATE dai_product SET site_upload = 1 WHERE id IN (${ids.map(() => "?").join(",")})`,
          ids,
          (err) => (err ? reject(err) : resolve())
        );
      });
    }
    res.json({
      status: true,
      message: "Website sync batch queued (site_upload flags updated)",
      processed: ids.length,
      skus: rows.map((r) => r.sku),
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

module.exports = integrationRouter;
