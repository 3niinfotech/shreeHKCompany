try { require("dotenv").config(); } catch (e) {}
const express = require("express");
const cors = require("cors");
let rateLimit;
try { rateLimit = require("express-rate-limit"); } catch (e) { rateLimit = null; }
const app = express();
app.set("etag", false); // avoid 304 on API GETs (e.g. /common/getIncrement)

const companyRouter = require("./routes/master/companyRoutes.js");
const shippingRouter = require("./routes/master/shippingRoutes.js");
const originRouter = require("./routes/master/originRoutes.js");
const labRouter = require("./routes/master/labRoutes.js");
const categoryRouter = require("./routes/master/categoryRoutes.js");
const productRouter = require("./routes/product/productRoutes.js");
const inwardRouter = require("./routes/inward/inwardRoutes.js");
const userRouter = require("./routes/user/userRoutes.js");
const commonRouter = require("./routes/common/commonRoutes.js");
const notificationRouter = require("./routes/common/notificationRoutes.js");
const outwardRouter = require("./routes/outward/outwardRoutes.js");
const reportRouter = require("./routes/report/reportRoutes.js");
const AdminUserRouter = require("./routes/adminUser/AddAdminUser.js");
const ExpansePayment = require("./routes/accounting/Expanse_Payment.js");
const AdvancePayment = require("./routes/accounting/Advance_payment.js");
const MyBalanceBook = require("./routes/my_Balance/Balance_Book.js");
const CurrencyRate = require("./routes/my_Balance/Currency_Rate.js");
const Roll = require("./routes/adminUser/Roll.js");
const Transaction = require("./routes/accounting/Transaction.js");
const PartyWiseTransaction = require("./routes/accounting/PartyWiseTransaction.js");
const MyProfile = require("./routes/my_Profile/myProfile.js");
const BulkRouter = require("./routes/bulk/bulkRoutes.js");
const RapnetRouter = require("./routes/rapnet/rapnetRoutes.js");
const aiRouter = require("./routes/ai/aiRoutes.js");
const transactionStockRouter = require("./routes/transaction/transactionStockRoutes.js");
const sessionRouter = require("./routes/session/sessionRoutes.js");
const dashboardRouter = require("./routes/dashboard/dashboardRoutes.js");
const quickNotesRouter = require("./routes/dashboard/quickNotesRoutes.js");
const attributeRouter = require("./routes/master/attributeRoutes.js");
const accGroupRouter = require("./routes/accounting/accGroupRoutes.js");
const accSubgroupRouter = require("./routes/accounting/accSubgroupRoutes.js");
const portalRouter = require("./routes/portal/portalRoutes.js");
const integrationRouter = require("./routes/integration/integrationRoutes.js");
const tenantCompanyRouter = require("./routes/admin/tenantCompanyRoutes.js");
const legacyApps = require("./config/legacyApps.js");
const { authenticateToken, isSuperAdmin, enforceApiPermission } = require("./authMiddleware.js");
const { proxyStoneMedia, MEDIA_PREFIX } = require("./routes/media/stoneMediaProxy.js");
const { attachAuditContext } = require("./middleware/auditContext.js");
const { auditPreSnapshot } = require("./middleware/auditPreSnapshot.js");
const { auditHttpLogger } = require("./middleware/auditHttpLogger.js");
const activityLogRouter = require("./routes/admin/activityLogRoutes.js");
const PORT = process.env.PORT || 3500;

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGIN || "http://localhost:5173";
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

const isProduction = process.env.NODE_ENV === "production";

const corsBase = {
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Audit-Page-Path", "X-Audit-Page-Label", "X-Audit-Page-Search"],
};

// Dev: reflect any Origin (5173, 5174, LAN IP, etc.). Prod: whitelist from CORS_ORIGIN.
const corsOptions = isProduction
  ? {
      ...corsBase,
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        const allowed = parseCorsOrigins();
        if (allowed.includes(origin)) return callback(null, true);
        callback(null, false);
      },
    }
  : {
      ...corsBase,
      origin: true,
    };

const loginLimiter = rateLimit ? rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { status: false, message: "Too many login attempts. Please try again later." },
}) : null;
const apiLimiter = rateLimit ? rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: { status: false, message: "Too many requests. Please slow down." },
}) : null;

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.get("/health", (req, res) => res.json({ ok: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(attachAuditContext);
app.use(auditPreSnapshot);
app.use(auditHttpLogger);
app.use('/uploads', express.static('uploads'));
app.use(MEDIA_PREFIX, proxyStoneMedia);
if (apiLimiter) app.use(apiLimiter);
if (loginLimiter) app.use("/user/login", loginLimiter);

app.use(enforceApiPermission);

// API Routes
app.use("/", labRouter);
app.use("/", categoryRouter);
app.use("/", companyRouter);
app.use("/", shippingRouter);
app.use("/", originRouter);
app.use("/", attributeRouter);
app.use("/", accGroupRouter);
app.use("/", accSubgroupRouter);
app.use("/", portalRouter);
app.use("/", tenantCompanyRouter);
app.use("/", activityLogRouter);
app.use("/", integrationRouter);
app.use("/", productRouter);
app.use("/", inwardRouter);
app.use("/", userRouter);
app.use("/", sessionRouter);
app.use("/", dashboardRouter);
app.use("/", quickNotesRouter);
app.use("/", outwardRouter);
app.use("/", transactionStockRouter);
app.use("/", commonRouter);
app.use("/", notificationRouter);
app.use("/", reportRouter);
app.use("/", AdminUserRouter);
app.use("/", ExpansePayment);
app.use("/", AdvancePayment);
app.use("/", MyBalanceBook);
app.use("/", CurrencyRate);
app.use("/", Roll);
app.use("/", Transaction);
app.use("/", PartyWiseTransaction);
app.use("/", MyProfile);
app.use("/", BulkRouter);
app.use("/rapnet", RapnetRouter);
app.use("/ai", aiRouter);

app.get(
  "/config/legacy-apps",
  authenticateToken,
  isSuperAdmin,
  (req, res) => res.json({ status: true, Data: legacyApps.outOfScopeApps }),
);

const { ensureActivityLogTableOnMeta } = require("./scripts/ensureActivityLogTable.js");
const { ensureUserActiveColumn } = require("./services/userActiveColumnService.js");

if (process.env.ENABLE_HOLD_CRON === "true") {
  const { runHoldCron } = require("./jobs/holdCron.js");
  const MS_DAY = 24 * 60 * 60 * 1000;
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(0, 5, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();
    setTimeout(async () => {
      try {
        await runHoldCron();
      } catch (e) {
        console.error("[holdCron]", e);
      }
      setInterval(() => {
        runHoldCron().catch((e) => console.error("[holdCron]", e));
      }, MS_DAY);
    }, delay);
  };
  scheduleNext();
  console.log("Hold cron scheduler enabled (ENABLE_HOLD_CRON=true)");
}

app.listen(PORT, async () => {
  try {
    await ensureActivityLogTableOnMeta();
    console.log("dai_activity_log table ready (meta DB)");
  } catch (e) {
    console.error("dai_activity_log bootstrap failed — run: npm run migrate:activity-log", e.message);
  }
  try {
    await ensureUserActiveColumn();
    console.log("user.is_active column ready");
  } catch (e) {
    console.error("user.is_active bootstrap failed", e.message);
  }
  console.log(`Server is running on port ${PORT}`);
});
