const express = require("express");
const connection = require("../../connection.js");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../../authMiddleware.js");
const helper = require("../../helper.js");
const { buildUserContext, metaQuery } = require("../../tenantHelper.js");
const commonRouter = express.Router();

const SECRET_KEY = "NitechDigitalServices";

commonRouter.use(bodyParser.json());

// Get common increment
commonRouter.get("/common/getIncrement", authenticateToken, async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  try {
    const companyId = buildUserContext(req).companyId;
    const user = await new Promise((resolve, reject) => {
      const query = `SELECT * FROM dai_incrementid WHERE company=?`;
      connection.query(query, [companyId], (error, data) => {
        if (error) {
          return reject({ error: "Error occurred while fetching data" });
        }
        resolve(data[0]);
      });
    });

    if (user && user.company != null) {
      try {
        const companies = await metaQuery(
          "SELECT name FROM company WHERE id = ? LIMIT 1",
          [user.company]
        );
        if (companies?.[0]?.name) {
          user.company = companies[0].name;
        }
      } catch (_) {
        // keep numeric company id if name lookup fails
      }
    }

    res.json({ Data: user });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});

module.exports = commonRouter;
