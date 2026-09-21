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
  const locationLabel = pageMeta?.label || record.moduleName || "General";
  const pagePath = pageMeta?.path || (record.newValue && typeof record.newValue === "object" ? record.newValue.path : null);
  const formattedTimestamp = formatActivityDateTime(record.createdAt);

  const requestPath = apiMeta?.path || record.newValue?.requestPath || record.oldValue?.requestPath;
  const requestMethod = apiMeta?.method || record.newValue?.requestMethod || record.oldValue?.requestMethod || "POST";
  const recordId = record.recordId ?? record.newValue?.id ?? record.oldValue?.id;

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
        {/* 2. Actor info line */}
        <div className={styles.metaRow}>
          <span className={styles.metaActor}>
            <UserOutlined className={styles.metaIcon} />
            <span className={styles.metaUsername}>{record.userName || "Unknown"}</span>
            {record.userId != null ? (
              <span className={styles.metaUserId}>(ID: {record.userId})</span>
            ) : null}
          </span>
          {renderRoleBadge(record.userRole, record.userRoleId)}
        </div>

        {/* 3. Location line */}
        <div className={styles.metaRow}>
          <AppstoreOutlined className={styles.metaIcon} />
          <span className={styles.metaLabel}>Page:</span>
          <span className={styles.metaValue}>{locationLabel}</span>
          {pagePath ? (
            <span className={styles.metaPathText}>{pagePath}</span>
          ) : null}
        </div>

        {/* API Endpoint & Method info */}
        {requestPath ? (
          <div className={styles.metaRow}>
            <ApiOutlined className={styles.metaIcon} />
            <span className={styles.metaLabel}>API:</span>
            <span className={`${styles.methodBadge} ${styles[`methodBadge--${requestMethod}`]}`}>
              {requestMethod}
            </span>
            <span className={styles.metaPathText}>{requestPath}</span>
          </div>
        ) : null}

        {/* 4. Timestamp line */}
        <div className={styles.metaRow}>
          <ClockCircleOutlined className={styles.metaIcon} />
          <span className={styles.metaValue}>{formattedTimestamp}</span>
        </div>

        {/* Description / Summary note */}
        {record.description ? (
          <div className={styles.metaRow} style={{ marginTop: 2 }}>
            <InfoCircleOutlined className={styles.metaIcon} />
            <span className={styles.descriptionBox}>{record.description}</span>
          </div>
        ) : null}
      </div>

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
      ) : !isAuthEvent ? (
        <div className={styles.noDataHintBox}>
          <Text type="secondary" className={styles.noDataHint}>
            Is action ka detail data capture nahi hua.
          </Text>
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
