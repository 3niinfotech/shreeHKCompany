import React, { useEffect, useState } from "react";
import { Modal, Typography, Spin, Empty } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarOutlined,
  BankOutlined,
  RightOutlined,
  IdcardOutlined,
  TeamOutlined,
  CheckCircleFilled,
  SafetyOutlined,
} from "@ant-design/icons";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import useAuthStore from "../../store/Auth.Store";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";
import styles from "../../assets/scss/pages/admin/companyYearPicker.module.scss";

const { Text, Title } = Typography;

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDayMonthYear = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getDate()} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
};

/** Expands a shortened fiscal segment ("24") against a reference year ("2023" -> 2024). */
const expandYear = (segment, reference) => {
  if (segment.length >= 4) return Number(segment);
  const prefix = String(reference || new Date().getFullYear()).slice(0, 4 - segment.length);
  return Number(`${prefix}${segment}`);
};

/** Fiscal labels arrive as "2023-24" or "2020-21-22-23"; segments drive the range and span badge. */
const getYearMeta = (item) => {
  const segments = String(item?.yearLabel || "").split(/[^0-9]+/).filter(Boolean);
  const startYear = segments.length ? expandYear(segments[0], new Date().getFullYear()) : null;
  const endYear = segments.length > 1
    ? expandYear(segments[segments.length - 1], startYear)
    : startYear
      ? startYear + 1
      : null;

  const fromLabel = formatDayMonthYear(item?.fromDate) || (startYear ? `1 Apr ${startYear}` : null);
  const toLabel = formatDayMonthYear(item?.toDate) || (endYear ? `31 Mar ${endYear}` : null);

  const today = new Date();
  const currentFiscalStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const isCurrent = startYear === currentFiscalStart;

  return {
    rangeLabel: fromLabel && toLabel ? `${fromLabel} - ${toLabel}` : fromLabel || toLabel || "",
    badge: segments.length > 2
      ? `${segments.length} Years`
      : isCurrent
        ? "Current Year"
        : "Previous Year",
    isCurrent,
  };
};

const CompanyHeaderArt = () => (
  <svg className={styles.headerArt} viewBox="0 0 240 110" aria-hidden="true">
    <g fill="#ffffff" fillOpacity="0.16">
      <rect x="148" y="16" width="48" height="82" rx="7" />
      <rect x="118" y="46" width="26" height="52" rx="5" />
      <rect x="200" y="38" width="24" height="60" rx="5" />
    </g>
    <g fill="#ffffff" fillOpacity="0.3">
      <rect x="158" y="26" width="9" height="9" rx="2" />
      <rect x="176" y="26" width="9" height="9" rx="2" />
      <rect x="158" y="43" width="9" height="9" rx="2" />
      <rect x="176" y="43" width="9" height="9" rx="2" />
      <rect x="158" y="60" width="9" height="9" rx="2" />
      <rect x="176" y="60" width="9" height="9" rx="2" />
    </g>
    <g fill="#ffffff" fillOpacity="0.12">
      <circle cx="98" cy="32" r="9" />
      <circle cx="112" cy="30" r="12" />
      <rect x="88" y="32" width="38" height="10" rx="5" />
    </g>
  </svg>
);

const YearHeaderArt = () => (
  <svg className={styles.headerArt} viewBox="0 0 240 110" aria-hidden="true">
    <rect x="132" y="18" width="76" height="68" rx="11" fill="#ffffff" fillOpacity="0.18" />
    <rect x="132" y="18" width="76" height="17" rx="8" fill="#ffffff" fillOpacity="0.3" />
    <g fill="#ffffff" fillOpacity="0.32">
      <rect x="142" y="44" width="11" height="9" rx="2" />
      <rect x="159" y="44" width="11" height="9" rx="2" />
      <rect x="176" y="44" width="11" height="9" rx="2" />
      <rect x="142" y="60" width="11" height="9" rx="2" />
      <rect x="159" y="60" width="11" height="9" rx="2" />
      <rect x="176" y="60" width="11" height="9" rx="2" />
    </g>
    <circle cx="200" cy="78" r="15" fill="#ffffff" fillOpacity="0.34" />
    <path d="M200 70v8l6 4" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" fill="none" />
    <g fill="#ffffff" fillOpacity="0.14">
      <rect x="218" y="70" width="16" height="20" rx="4" />
      <circle cx="226" cy="64" r="8" />
    </g>
  </svg>
);

const CompanyYearPicker = ({ open, onClose, force = false }) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectingKey, setSelectingKey] = useState(null);
  const [options, setOptions] = useState([]);
  const setSessionContext = useAuthStore((s) => s.setSessionContext);
  const setShowContextPicker = useAuthStore((s) => s.setShowContextPicker);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyOptions, setCompanyOptions] = useState([]);
  const yearOptions = selectedCompany
    ? options.filter(
      (x) => x.companyId === selectedCompany.companyId
    )
    : [];
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const activeCompanyId = useAuthStore((s) => s.companyId);
  const activeYearId = useAuthStore((s) => s.yearId);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get(ENDPOINTS.portal.companyYears)
      .then((res) => {
        const rows = res.data?.Data || [];

        setOptions(rows);

        const companies = [];
        const seen = new Set();

        rows.forEach((item) => {
          if (!seen.has(item.companyId)) {
            seen.add(item.companyId);

            companies.push({
              companyId: item.companyId,
              companyName: item.companyName,
              companyShortcutName: item.companyShortcutName,
              companyAddress: item.companyAddress,
              companyNumber: item.companyNumber,
            });
          }
        });

        setCompanyOptions(companies);
        // const seen = new Set();
        // const rows = rowsRaw.filter((item) => {
        //   const key = `${String(item.companyName || "").trim().toLowerCase()}::${String(item.yearLabel || "").trim().toLowerCase()}`;
        //   if (!key || seen.has(key)) return false;
        //   seen.add(key);
        //   return true;
        // });
        // setOptions(rows);

        if (rows.length === 0) {
          toastApiError({ response: { data: res.data } });
          setShowContextPicker(false);
          onClose?.();
        } else if (rows.length === 1) {
          selectContext(rows[0]);
        }
      })
      .catch((err) => toastApiError(err))
      .finally(() => setLoading(false));
  }, [open, onClose, setShowContextPicker]);

  const handleCompanySelect = (company) => {
    const years = options.filter(
      (x) => x.companyId === company.companyId
    );

    if (years.length === 1) {
      selectContext(years[0]);
      return;
    }

    setSelectedCompany(company);
  };

  const selectContext = async (item) => {
    const itemKey = `${item.companyId}-${item.yearId}`;
    if (selectingKey) return;

    setSelectingKey(itemKey);
    try {
      const res = await api.post(ENDPOINTS.session.context, {
        companyId: item.companyId,
        yearId: item.yearId,
      });
      const { token: newToken, Data } = res.data || {};
      if (newToken) {
        login(user, newToken, {
          companyId: Data.companyId,
          yearId: Data.yearId,
          companyName: Data.companyName,
          companyShortcutName: Data.companyShortcutName,
          companyLogo: Data.companyLogo || null,
          dbName: Data.dbName,
        });
      } else {
        setSessionContext({
          companyId: Data.companyId,
          yearId: Data.yearId,
          companyName: Data.companyName,
          companyShortcutName: Data.companyShortcutName,
          companyLogo: Data.companyLogo || null,
          dbName: Data.dbName,
        });
      }
      try {
        queryClient.clear();
      } catch (qcErr) {
        console.error("Failed to clear query cache:", qcErr);
      }
      toastApiSuccess(res.data);
      setShowContextPicker(false);
      onClose?.();
      return;
    } catch (err) {
      toastApiError(err);
    } finally {
      setSelectingKey(null);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedCompany(null);
    }
  }, [open]);

  const modalTitle = (
    <div className={styles.modalTitle}>
      <div className={styles.titleIcon}>
        {selectedCompany ? <CalendarOutlined /> : <BankOutlined />}
      </div>
      <div className={styles.titleTextWrap}>
        <div className={styles.titleText}>
          {selectedCompany ? "Select Financial Year" : "Select Company"}
        </div>
        <Text className={styles.titleSubtext}>
          {selectedCompany
            ? `Company : ${selectedCompany.companyName}`
            : "Choose your company to continue"}
        </Text>
      </div>
      {selectedCompany ? <YearHeaderArt /> : <CompanyHeaderArt />}
    </div>
  );

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={force ? undefined : onClose}
      footer={null}
      closable={!force}
      maskClosable={!force}
      centered
      className={styles.companyYearModal}
      width="min(1080px, calc(100vw - 32px))"
      destroyOnClose
    >
      {loading ? (
        <div className={styles.loaderWrap}>
          <Spin size="large" />
          <Text type="secondary">Loading available contexts...</Text>
        </div>
      ) : options.length === 0 ? (
        <Empty description="No company/year mapping found" className={styles.emptyState} />
      ) : (
        <>
          {selectedCompany && (
            <div className={styles.backWrapper}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setSelectedCompany(null)}
              >
                <ArrowLeftOutlined />
                <span>Back to Companies</span>
              </button>
            </div>
          )}

          {!selectedCompany && (
            <div className={styles.companyGrid}>
              {companyOptions.map((item) => {
                const isActive = activeCompanyId != null
                  && String(item.companyId) === String(activeCompanyId);

                return (
                  <button
                    key={item.companyId}
                    type="button"
                    className={`${styles.companyCard} ${isActive ? styles.companyCardActive : ""}`}
                    onClick={() => handleCompanySelect(item)}
                    aria-label={`Select ${item.companyName}`}
                  >
                    <span className={styles.companyIcon}>
                      <BankOutlined />
                    </span>

                    <span className={styles.companyBody}>
                      <Title level={5} className={styles.companyName} title={item.companyName}>
                        {item.companyName}
                      </Title>

                      <span className={styles.companyTag}>
                        <IdcardOutlined />
                        <span>{item.companyShortcutName || "Company"}</span>
                      </span>

                      <span className={styles.companyMeta}>
                        <TeamOutlined />
                        <span>{item.companyAddress || item.companyNumber || "Workspace access"}</span>
                      </span>
                    </span>

                    <span className={styles.companyArrow}>
                      <RightOutlined />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedCompany && (
            <>
              <div className={styles.yearGrid}>
                {yearOptions.map((item) => {
                  const isSelecting = selectingKey === `${item.companyId}-${item.yearId}`;
                  const meta = getYearMeta(item);
                  const isActive = activeYearId != null
                    ? String(item.yearId) === String(activeYearId)
                    : meta.isCurrent;

                  return (
                    <button
                      key={item.yearId}
                      type="button"
                      disabled={Boolean(selectingKey)}
                      className={`${styles.yearCard} ${isActive ? styles.yearCardActive : ""} ${isSelecting ? styles.yearCardSelecting : ""}`}
                      onClick={() => selectContext(item)}
                      aria-label={`Select fiscal year ${item.yearLabel}`}
                    >
                      <span className={styles.yearTop}>
                        <span className={styles.yearIcon}>
                          <CalendarOutlined />
                        </span>

                        <span className={styles.yearBody}>
                          <Title level={5} className={styles.yearLabel}>
                            {item.yearLabel}
                          </Title>
                          <span
                            className={`${styles.yearBadge} ${meta.isCurrent ? styles.yearBadgeCurrent : ""}`}
                          >
                            {meta.badge}
                          </span>
                        </span>

                        {isSelecting ? (
                          <span className={styles.yearArrow}>
                            <Spin size="small" />
                          </span>
                        ) : isActive ? (
                          <span className={styles.yearCheck}>
                            <CheckCircleFilled />
                          </span>
                        ) : (
                          <span className={styles.yearArrow}>
                            <RightOutlined />
                          </span>
                        )}
                      </span>

                      {meta.rangeLabel && (
                        <span className={styles.yearRange}>
                          <CalendarOutlined />
                          <span>{meta.rangeLabel}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className={styles.secureNote}>
                <SafetyOutlined />
                <span>Your data is safe and secure with end-to-end encryption</span>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
};

export default CompanyYearPicker;
