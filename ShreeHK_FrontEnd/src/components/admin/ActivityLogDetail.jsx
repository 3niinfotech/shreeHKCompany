import React from "react";
import { Tag, Typography, Tooltip } from "antd";
import {
  ArrowRightOutlined,
  PlusCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  LoginOutlined,
  LogoutOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  AppstoreOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  ApiOutlined,
  InfoCircleOutlined,
  GlobalOutlined,
  DesktopOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import {
  extractBusinessData,
  getDisplayChanges,
  getActionTone,
  formatActionTypeLabel,
  formatActivityDateTime,
  buildActivityNarrative,
} from "../../utils/activityLogFormatters";
import styles from "../../assets/scss/pages/admin/activityHistory.module.scss";

const { Text } = Typography;

const TONE_ICON = {
  add: PlusCircleOutlined,
  sale: ShoppingCartOutlined,
  edit: EditOutlined,
  delete: DeleteOutlined,
  memo: FileTextOutlined,
  login: LoginOutlined,
  logout: LogoutOutlined,
  failed: CloseCircleOutlined,
  default: EditOutlined,
};

const AUTH_ACTIONS = new Set(["LOGIN", "LOGOUT", "LOGIN_FAILED"]);

const getActionBadgeText = (actionType) => {
  const act = String(actionType || "").toUpperCase();
  if (act === "STOCK_OUT") return "Stone Sold / Sale";
  if (act === "STOCK_IN") return "Stock In / Purchase";
  if (act === "UPDATE" || act === "TRANSFER") return "Record Updated";
  if (act === "CREATE") return "Record Created";
  if (act === "DELETE") return "Record Deleted";
  if (act === "MEMO_CREATE") return "Memo Created";
  if (act === "MEMO_RETURN") return "Memo Returned";
  if (act === "EXPORT") return "Exported";
  if (act === "PRINT") return "Printed";
  if (act === "LOGIN") return "User Login";
  if (act === "LOGOUT") return "User Logout";
  if (act === "LOGIN_FAILED") return "Login Failed";
  return formatActionTypeLabel(actionType) || "Activity";
};

const renderRoleBadge = (roleName, roleId) => {
  const role = (roleName || "").trim();
  const lower = role.toLowerCase();
  const isSuper = Number(roleId) === 1 || lower.includes("super");
  const isAdmin = isSuper || lower.includes("admin");
  const isManager = lower.includes("manager");
  const isAuditor = lower.includes("audit") || lower.includes("account");

  if (isSuper || isAdmin) {
    return (
      <span className={`${styles.rolePill} ${styles.rolePillAdmin}`}>
        <CrownOutlined className={styles.rolePillIcon} />
        {role || "Super Admin"}
      </span>
    );
  }

  if (isManager) {
    return (
      <span className={`${styles.rolePill} ${styles.rolePillManager}`}>
        <SafetyCertificateOutlined className={styles.rolePillIcon} />
        {role || "Manager"}
      </span>
    );
  }

  if (isAuditor) {
    return (
      <span className={`${styles.rolePill} ${styles.rolePillAuditor}`}>
        <FileTextOutlined className={styles.rolePillIcon} />
        {role || "Auditor"}
      </span>
    );
  }

  return (
    <span className={`${styles.rolePill} ${styles.rolePillDefault}`}>
      <UserOutlined className={styles.rolePillIcon} />
      {role || "User"}
    </span>
  );
};

const formatUserAgentSummary = (ua) => {
  if (!ua) return "Browser";
  const str = String(ua);
  if (str.includes("Chrome")) {
    if (str.includes("Windows")) return "Chrome on Windows";
    if (str.includes("Mac")) return "Chrome on macOS";
    if (str.includes("Android")) return "Chrome on Android";
    return "Chrome";
  }
  if (str.includes("Firefox")) return "Firefox";
  if (str.includes("Safari") && !str.includes("Chrome")) return "Safari";
  if (str.includes("Edge")) return "Edge";
  return str.slice(0, 30) + "...";
};

const MODULE_DEFAULT_PATHS = {
  Expanse: "/accounting/expanse",
  Expense: "/accounting/expanse",
  Inward: "/transaction/inward/import",
  "Diamond Stock": "/inventory",
  Company: "/company/table-data",
  Party: "/party/table-data",
  User: "/manage-user",
  Roll: "/roll",
  Category: "/category/table-data",
  Origin: "/origin/table-data",
  Lab: "/lab/table-data",
  Attribute: "/attribute/table-data",
  Shipping: "/shipping/table-data",
  Outward: "/transaction/outward/stock",
  Sale: "/transaction/outward/stock",
  Memo: "/transaction/outward/stock",
  Consignment: "/transaction/outward/stock",
};

const POLLING_APIS = new Set([
  "/notification",
  "/session",
  "/session/keepalive",
  "/health",
  "/admin/activity-log",
  "/dashboard/summary",
]);

const ActivityLogDetail = ({ record, compact = false }) => {
  const [showTechnical, setShowTechnical] = React.useState(false);

  if (!record) return null;

  const { pageMeta, apiMeta, actionType } = extractBusinessData(record);
  const tone = getActionTone(actionType);
  const Icon = TONE_ICON[tone] || TONE_ICON.default;
  const { mode, items } = getDisplayChanges(record);
  const isAuthEvent = AUTH_ACTIONS.has(actionType);
  const showAccessMeta = !compact || isAuthEvent;

  const actionBadgeText = getActionBadgeText(actionType);
  const locationLabel = record.moduleName || pageMeta?.label || "General";
  const formattedTimestamp = formatActivityDateTime(record.createdAt);

  const rawReqPath = apiMeta?.path || record.newValue?.requestPath || record.oldValue?.requestPath;
  const isPollingApi = rawReqPath && POLLING_APIS.has(rawReqPath);
  const requestPath = isPollingApi ? null : rawReqPath;
  const requestMethod = apiMeta?.method || record.newValue?.requestMethod || record.oldValue?.requestMethod || (requestPath ? "POST" : null);

  const rawPagePath = pageMeta?.path || (record.newValue && typeof record.newValue === "object" ? record.newValue.path : null);
  const isPollingPage = rawPagePath && (POLLING_APIS.has(rawPagePath) || isPollingApi);
  const fallbackPagePath = MODULE_DEFAULT_PATHS[record.moduleName] || null;
  const pagePath = (!isPollingPage && rawPagePath && !rawPagePath.startsWith("/auth")) ? rawPagePath : fallbackPagePath;

  const recordId = record.recordId ?? record.newValue?.id ?? record.oldValue?.id;

  const lineItems = React.useMemo(() => {
    const raw =
      record?.newValue?.items ||
      record?.newValue?.record?.items ||
      record?.oldValue?.items ||
      (Array.isArray(record?.newValue?.products) && typeof record?.newValue?.products[0] === "object" ? record?.newValue?.products : null);
    return Array.isArray(raw) && raw.length > 0 ? raw : null;
  }, [record]);

  return (
    <div className={`${styles.detailWrap} ${styles[`detailWrap--${tone}`]}`}>
      {/* 1. Header section (top of expanded card) */}
      <div className={styles.detailHeader}>
        <div className={styles.actionIconCircle}>
          <Icon />
        </div>
        <div className={styles.headerInfo} style={{ width: "100%" }}>
          <div className={styles.headerTopRow}>
            <span className={`${styles.actionBadge} ${styles[`actionBadge--${tone}`]}`}>
              {actionBadgeText}
            </span>
            {record.recordReference ? (
              <span className={styles.refChip}>
                {record.recordReference}
              </span>
            ) : null}
            {recordId != null && recordId !== "" && recordId !== record.recordReference ? (
              <span className={styles.idChip} title={`Record ID: ${recordId}`}>
                ID: #{recordId}
              </span>
            ) : null}
            {record.id ? (
              <span className={styles.logIdBadge}>
                Log #{record.id}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Meta Information Section */}
      <div className={styles.metaSection}>
        {/* 2. Actor info */}
        <div className={styles.metaItem}>
          <UserOutlined className={styles.metaIcon} />
          <span className={styles.metaLabel}>User Name:</span>
          <span className={styles.metaUsername}>{record.userName || "Unknown"}</span>
          {record.userId != null ? (
            <span className={styles.metaUserId}>(ID: {record.userId})</span>
          ) : null}
          {renderRoleBadge(record.userRole, record.userRoleId)}
        </div>

        {/* 3. Location / Page */}
        <div className={styles.metaItem}>
          <AppstoreOutlined className={styles.metaIcon} />
          <span className={styles.metaLabel}>Page Name:</span>
          <span className={styles.metaValue}>{locationLabel}</span>
          {pagePath ? (
            <span className={styles.metaPathText}>{pagePath}</span>
          ) : null}
        </div>

        {/* API Endpoint & Method info */}
        {requestPath ? (
          <div className={styles.metaItem}>
            <ApiOutlined className={styles.metaIcon} />
            <span className={styles.metaLabel}>API:</span>
            <span className={`${styles.methodBadge} ${styles[`methodBadge--${requestMethod}`]}`}>
              {requestMethod}
            </span>
            <span className={styles.metaPathText}>{requestPath}</span>
          </div>
        ) : null}

        {/* 4. Timestamp line */}
        <div className={styles.metaItem}>
          <ClockCircleOutlined className={styles.metaIcon} />
          <span className={styles.metaLabel}>Time:</span>
          <span className={styles.metaValue}>{formattedTimestamp}</span>
        </div>
      </div>

      {/* Action Message Banner - Easily readable for project owners & admins */}
      {(record.description || buildActivityNarrative(record)) ? (
        <div className={`${styles.activityMessageBox} ${styles[`activityMessageBox--${tone}`]}`}>
          <InfoCircleOutlined className={styles.messageIcon} />
          <div className={styles.messageBody}>
            <span className={styles.messageLabel}>ACTIVITY SUMMARY</span>
            <div className={styles.messageText}>
              {record.description || buildActivityNarrative(record)}
            </div>
          </div>
        </div>
      ) : null}

      {/* 5. "What Changed" section */}
      {items.length > 0 && !isAuthEvent ? (
        <div className={styles.whatChangedSection}>
          <div className={styles.whatChangedHeader}>
            <span className={styles.whatChangedTitle}>WHAT IS CHANGED</span>
          </div>
          <div className={styles.changedFieldsList}>
            {items.map((item) => (
              <div key={item.key} className={styles.changedFieldBlock}>
                <div className={styles.fieldName}>
                  {item.label ? item.label.toUpperCase() : item.key.toUpperCase()}
                </div>
                <div className={styles.fieldValuesRow}>
                  {item.before != null && item.before !== "" && item.before !== "—" ? (
                    <span className={styles.valOld}>{item.before}</span>
                  ) : mode === "added" ? (
                    <span className={styles.valEmpty}>—</span>
                  ) : (
                    <span className={styles.valOld}>—</span>
                  )}
                  <ArrowRightOutlined className={styles.changeArrow} />
                  {item.after != null && item.after !== "" && item.after !== "—" ? (
                    <span className={styles.valNew}>{item.after}</span>
                  ) : mode === "removed" ? (
                    <span className={styles.valEmpty}>—</span>
                  ) : (
                    <span className={styles.valNew}>—</span>
                  )}  
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !isAuthEvent && !lineItems ? (
        <div className={styles.noDataHintBox}>
          <Text type="secondary" className={styles.noDataHint}>
            Detailed data for this action was not captured.
          </Text>
        </div>
      ) : null}

      {/* 6. Line Items Table (for Inward / Stock In / Diamond lists) */}
      {lineItems ? (
        <div className={styles.lineItemsSection}>
          <div className={styles.lineItemsHeader}>
            <span className={styles.lineItemsTitle}>
              LINE ITEMS ({lineItems.length} {lineItems.length === 1 ? "ITEM" : "ITEMS"})
            </span>
          </div>
          <div className={styles.lineItemsTableWrap}>
            <table className={styles.lineItemsTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>MFG CODE</th>
                  <th>D. NO</th>
                  <th>R.PCS</th>
                  <th>P.PCS</th>
                  <th>P.CARAT</th>
                  <th>R.CARAT</th>
                  <th>COST</th>
                  <th>PRICE</th>
                  <th>AMOUNT</th>
                  <th>COLOR</th>
                  <th>CLARITY</th>
                  <th>SHAPE</th>
                  <th>LAB</th>
                  <th>REPORT NO</th>
                  <th>MEASUREMENTS</th>
                  <th>LOC</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={item.id || item.sku || idx}>
                    <td>{idx + 1}</td>
                    <td><strong>{item.sku || "—"}</strong></td>
                    <td>{item.mfg_code || item.mfg || "—"}</td>
                    <td>{item.d_no || item.dno || "—"}</td>
                    <td>{item.r_pcs ?? item.rought_pcs ?? "—"}</td>
                    <td>{item.p_pcs ?? item.polish_pcs ?? "—"}</td>
                    <td><strong>{item.p_carat ?? item.polish_carat ?? "—"}</strong></td>
                    <td>{item.r_carat ?? item.rought_carat ?? "—"}</td>
                    <td>{item.cost != null && item.cost !== "" ? item.cost : "—"}</td>
                    <td>{item.price != null && item.price !== "" ? item.price : "—"}</td>
                    <td><strong>{item.amount != null && item.amount !== "" ? item.amount : "—"}</strong></td>
                    <td>{item.color || item.main_color || "—"}</td>
                    <td>{item.clarity || "—"}</td>
                    <td>{item.shape || "—"}</td>
                    <td>{item.lab || "—"}</td>
                    <td>{item.report_no || item.reportno || "—"}</td>
                    <td>{item.measurements || item.measurement || "—"}</td>
                    <td>{item.loc || item.location || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Footer Meta: IP / UserAgent / Company / Status */}
      <div className={styles.footerMeta}>
        {record.ipAddress ? (
          <span className={styles.metaTextSmall}>
            <GlobalOutlined /> IP: {record.ipAddress}
          </span>
        ) : null}
        {record.userAgent ? (
          <Tooltip title={record.userAgent} placement="topLeft">
            <span className={styles.metaTextSmall} style={{ cursor: "help" }}>
              <DesktopOutlined /> Device: {formatUserAgentSummary(record.userAgent)}
            </span>
          </Tooltip>
        ) : null}
        {record.companyId != null ? (
          <span className={styles.metaTextSmall}>
            Company ID: {record.companyId}
          </span>
        ) : null}
        {record.status ? (
          <Tag color={record.status === "SUCCESS" ? "green" : "orange"} className={styles.statusTag}>
            {record.status}
          </Tag>
        ) : null}
      </div>

      {/* Optional raw JSON diff toggle for non-compact mode */}
      {!compact ? (
        <>
          <button
            type="button"
            className={styles.technicalToggle}
            onClick={() => setShowTechnical((v) => !v)}
          >
            {showTechnical ? "Hide" : "Show"} technical JSON
          </button>

          {showTechnical ? (
            <div className={styles.diffColumns}>
              <div className={styles.diffPanel}>
                <Text strong>Before (raw)</Text>
                <pre className={styles.rawJson}>
                  {record.oldValue ? JSON.stringify(record.oldValue, null, 2) : "—"}
                </pre>
              </div>
              <div className={styles.diffPanel}>
                <Text strong>After (raw)</Text>
                <pre className={styles.rawJson}>
                  {record.newValue ? JSON.stringify(record.newValue, null, 2) : "—"}
                </pre>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export default ActivityLogDetail;
