import React, { useEffect, useMemo, useState } from "react";
import { Modal, Typography, Empty, Button } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarOutlined,
  BankOutlined,
  RightOutlined,
  IdcardOutlined,
  TeamOutlined,
  CheckCircleFilled,
  SafetyOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import { api } from "../../api/client/axiosInstance";
import { ENDPOINTS } from "../../api/endpoints";
import useAuthStore from "../../store/Auth.Store";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { toastApiSuccess, toastApiError } from "../../utils/toastNotify";
import { SkeletonBlock, SkeletonCard } from "../common/skeleton";
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

  // Prefer DB date range (YYYY-MM-DD as local dates — avoid UTC shift)
  const parseLocalDate = (value) => {
    if (!value) return null;
    const s = String(value).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  let isCurrent = false;
  const from = parseLocalDate(item?.fromDate);
  const to = parseLocalDate(item?.toDate);
  if (from && to) {
    const endOfTo = new Date(to);
    endOfTo.setHours(23, 59, 59, 999);
    isCurrent = today >= from && today <= endOfTo;
  }
  if (!isCurrent && startYear != null) {
    isCurrent = startYear === currentFiscalStart;
  }

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

/** Custom hook to detect prefers-reduced-motion preference */
const usePrefersReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setReducedMotion(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  return reducedMotion;
};

/** Hook to animate text character-by-character */
const useTypewriter = (text, speed = 25, enabled = true) => {
  const [displayedText, setDisplayedText] = useState(enabled ? "" : text);
  const [isTyping, setIsTyping] = useState(enabled);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayedText(text || "");
      setIsTyping(false);
      return;
    }

    setDisplayedText("");
    setIsTyping(true);
    let i = 0;

    const timer = setInterval(() => {
      i++;
      if (i <= text.length) {
        setDisplayedText(text.slice(0, i));
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, enabled]);

  return { displayedText, isTyping };
};

const normalizeBranchId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const CompanyYearPicker = ({ open, onClose, force = false }) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectingKey, setSelectingKey] = useState(null);
  const [options, setOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const setSessionContext = useAuthStore((s) => s.setSessionContext);
  const setShowContextPicker = useAuthStore((s) => s.setShowContextPicker);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [yearCatalog, setYearCatalog] = useState([]);
  /** branchId → yearId[] ; if set, that branch only sees those years (new branch = current only) */
  const [branchYearMap, setBranchYearMap] = useState({});
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const activeCompanyId = useAuthStore((s) => s.companyId);
  const activeBranchId = useAuthStore((s) => s.branchId);
  const activeCompanyName = useAuthStore((s) => s.companyName);
  const activeYearId = useAuthStore((s) => s.yearId);
  const reducedMotion = usePrefersReducedMotion();

  // Login + profile switch: Branch → Year only (no Select Company step)
  const step = !selectedBranch ? "branch" : "year";

  const companiesForBranch = useMemo(() => {
    if (!selectedBranch) return [];
    return companyOptions.filter(
      (c) => normalizeBranchId(c.branchId) === normalizeBranchId(selectedBranch.branchId)
    );
  }, [companyOptions, selectedBranch]);

  const yearOptions = useMemo(() => {
    if (!selectedBranch) return [];

    const sortCurrentYearFirst = (list) =>
      [...list].sort((a, b) => {
        const aCurrent = getYearMeta(a).isCurrent ? 0 : 1;
        const bCurrent = getYearMeta(b).isCurrent ? 0 : 1;
        if (aCurrent !== bCurrent) return aCurrent - bCurrent;
        return Number(b.yearId) - Number(a.yearId);
      });

    const dedupe = (list) => {
      const seenYear = new Set();
      return list.filter((y) => {
        const key = String(y.yearLabel || y.yearId).trim().toLowerCase();
        if (!key || seenYear.has(key)) return false;
        seenYear.add(key);
        return true;
      });
    };

    let fromCatalog = dedupe(yearCatalog || []);

    // New branches: only years linked at create (current FY) — not every other company's years
    const bid = normalizeBranchId(selectedBranch.branchId);
    const linkedIds = bid != null ? branchYearMap?.[bid] || branchYearMap?.[String(bid)] : null;
    if (Array.isArray(linkedIds) && linkedIds.length > 0) {
      const allow = new Set(linkedIds.map((id) => String(id)));
      fromCatalog = fromCatalog.filter((y) => allow.has(String(y.yearId)));
    }

    if (fromCatalog.length) {
      return sortCurrentYearFirst(fromCatalog);
    }

    // Legacy fallback (no branch_year rows): unique years from combos
    return sortCurrentYearFirst(dedupe(options));
  }, [selectedBranch, yearCatalog, branchYearMap, options]);

  const branchCompaniesLabel = companiesForBranch
    .map((c) => c.companyName)
    .filter(Boolean)
    .join(" + ");

  const titleTextTarget = step === "year" ? "Select Financial Year" : "Select Branch";
  const titleSubtextTarget =
    step === "year"
      ? `${selectedBranch?.branchName ? `Branch : ${selectedBranch.branchName}` : ""}${
          branchCompaniesLabel ? ` · ${branchCompaniesLabel}` : ""
        }`
      : "First choose Branch — then Year";

  const { displayedText: titleText, isTyping: titleTyping } = useTypewriter(
    titleTextTarget,
    26,
    open && !loading && !reducedMotion
  );
  const { displayedText: titleSubtext } = useTypewriter(
    titleSubtextTarget,
    14,
    open && !loading && !reducedMotion
  );

  const resolveYearItemForBranch = (item) => {
    // Branch→Year: prefer ShreeHK International (or first ShreeHK) so stock/default company is correct
    if (!companiesForBranch.length) return item;
    const preferred =
      companiesForBranch.find((c) => /international/i.test(String(c.companyName || ""))) ||
      companiesForBranch.find((c) => /shree\s*hk/i.test(String(c.companyName || ""))) ||
      companiesForBranch[0];
    if (!preferred) return item;
    const match = options.find(
      (o) =>
        String(o.companyId) === String(preferred.companyId) &&
        (String(o.yearId) === String(item.yearId) ||
          String(o.yearLabel || "").toLowerCase() === String(item.yearLabel || "").toLowerCase())
    );
    return match || { ...item, companyId: preferred.companyId };
  };

  const selectContext = async (rawItem) => {
    if (!rawItem?.yearId) {
      toastApiError({ response: { data: { message: "Invalid year selection." } } });
      return;
    }

    // No company under branch yet → enter with Branch + Year; user adds company inside
    const branchOnly =
      !companiesForBranch.length &&
      selectedBranch?.branchId != null &&
      rawItem?.yearId != null;

    const item = branchOnly ? rawItem : resolveYearItemForBranch(rawItem);
    if (!branchOnly && (!item?.companyId || !item?.yearId)) {
      toastApiError({ response: { data: { message: "Invalid company/year selection." } } });
      return;
    }

    const itemKey = branchOnly
      ? `branch-${selectedBranch.branchId}-${rawItem.yearId}`
      : `${item.companyId}-${item.yearId}`;
    if (selectingKey) return;

    setSelectingKey(itemKey);
    try {
      const payload = branchOnly
        ? {
            branchId: selectedBranch.branchId,
            yearId: rawItem.yearId,
            companyId: 0,
          }
        : {
            companyId: item.companyId,
            yearId: item.yearId,
          };
      const res = await api.post(ENDPOINTS.session.context, payload);
      const { token: newToken, Data } = res.data || {};
      if (newToken) {
        login(user, newToken, {
          ...Data,
          companyLogo: Data.companyLogo || null,
        });
      } else {
        setSessionContext({
          ...Data,
          companyLogo: Data.companyLogo || null,
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

  const resolveCompanyForBranch = (branch, companies) => {
    const inBranch = (companies || []).filter(
      (c) => normalizeBranchId(c.branchId) === normalizeBranchId(branch.branchId)
    );
    if (!inBranch.length) return null;
    const sessionMatch = inBranch.find(
      (c) => activeCompanyId != null && String(c.companyId) === String(activeCompanyId)
    );
    if (sessionMatch) return sessionMatch;
    if (inBranch.length === 1) return inBranch[0];
    return null;
  };

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
  };

  const handleBranchSelect = (branch) => {
    setSelectedBranch(branch);
    // Always Branch → Year (no Select Company)
    setSelectedCompany(null);
  };

  useEffect(() => {
    if (!open) return;
    setSelectedBranch(null);
    setSelectedCompany(null);
    setLoading(true);
    api.get(ENDPOINTS.portal.companyYears)
      .then((res) => {
        const rows = res.data?.Data || [];
        const apiBranches = res.data?.Branches || [];
        const apiYears = res.data?.Years || [];
        const apiBranchYears = res.data?.BranchYears || {};

        setOptions(rows);
        setYearCatalog(Array.isArray(apiYears) ? apiYears : []);
        setBranchYearMap(
          apiBranchYears && typeof apiBranchYears === "object" ? apiBranchYears : {}
        );

        const companies = [];
        const seenCompanies = new Set();
        rows.forEach((item) => {
          if (!seenCompanies.has(item.companyId)) {
            seenCompanies.add(item.companyId);
            companies.push({
              branchId: normalizeBranchId(item.branchId),
              branchName: item.branchName || null,
              companyId: item.companyId,
              companyName: item.companyName,
              companyShortcutName: item.companyShortcutName,
              companyAddress: item.companyAddress,
              companyNumber: item.companyNumber,
            });
          }
        });
        setCompanyOptions(companies);

        // Branch step = ONLY master branches (HK / Dubai / Surat). Never company names.
        const branches = (apiBranches || [])
          .map((b) => {
            const id = Number(b.branchId);
            if (!Number.isFinite(id) || id <= 0) return null;
            return {
              branchId: id,
              branchName: b.branchName,
              branchShortcutName: b.branchShortcutName || null,
              branchAddress: b.branchAddress || null,
              branchNumber: b.branchNumber || null,
            };
          })
          .filter(Boolean)
          .sort((a, b) => String(a.branchName || "").localeCompare(String(b.branchName || "")));

        setBranchOptions(branches);

        if (rows.length === 0) {
          toastApiError({ response: { data: res.data } });
          setShowContextPicker(false);
          onClose?.();
          return;
        }

        // Profile switch: land on Financial Year for current branch (no company step)
        if (!force && activeCompanyId != null) {
          const currentCompany = companies.find((c) => String(c.companyId) === String(activeCompanyId));
          const branchFromCompany = currentCompany
            ? branches.find(
              (b) => normalizeBranchId(b.branchId) === normalizeBranchId(currentCompany.branchId)
            )
            : null;
          const branchFromSession = branches.find(
            (b) => normalizeBranchId(b.branchId) === normalizeBranchId(activeBranchId)
          );
          const branch = branchFromCompany || branchFromSession || (branches.length === 1 ? branches[0] : null);
          if (branch) {
            setSelectedBranch(branch);
            setSelectedCompany(null);
          }
        }
      })
      .catch((err) => toastApiError(err))
      .finally(() => setLoading(false));
  }, [open, onClose, setShowContextPicker, force, activeCompanyId, activeBranchId, activeCompanyName]);

  const modalTitle = (
    <div className={styles.modalTitle}>
      <div className={styles.titleIcon}>
        {step === "year" ? (
          <CalendarOutlined />
        ) : step === "company" ? (
          <BankOutlined />
        ) : (
          <ApartmentOutlined />
        )}
      </div>
      <div className={styles.titleTextWrap}>
        <div className={styles.titleText}>
          <span>{titleText}</span>
          {titleTyping && <span className={styles.typewriterCursor} />}
        </div>
        <Text className={`${styles.titleSubtext} ${titleSubtext ? styles.titleSubtextVisible : ""}`}>
          {titleSubtext}
        </Text>
      </div>
      {step === "year" ? <YearHeaderArt /> : <CompanyHeaderArt />}
    </div>
  );

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={force ? undefined : onClose}
      footer={
        force
          ? null
          : [
              <Button key="close" danger onClick={onClose}>
                Close
              </Button>,
            ]
      }
      closable={false}
      maskClosable={false}
      mask={{ closable: false }}
      centered
      className={styles.companyYearModal}
      classNames={{ mask: styles.companyYearMask }}
      styles={{ mask: { background: "rgb(235 235 235 / 45%)" } }}
      width="min(1080px, calc(100vw - 32px))"
      destroyOnHidden
    >
      {loading ? (
        <div className={styles.companyGrid} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} lines={3} withAvatar className={styles.companyCard} />
          ))}
        </div>
      ) : options.length === 0 ? (
        <Empty description="No company/year mapping found" className={styles.emptyState} />
      ) : (
        <div className={styles.modalBodyContent}>
          {step === "branch" && (
            <div className={styles.companyGrid} key="branch-grid">
              {branchOptions.map((item, index) => (
                <button
                  key={item.branchId}
                  type="button"
                  style={{ "--card-index": Math.min(index, 6) }}
                  className={styles.companyCard}
                  onClick={() => handleBranchSelect(item)}
                  aria-label={`Select branch ${item.branchName}`}
                >
                  <span className={styles.companyIcon}>
                    <ApartmentOutlined />
                  </span>

                  <span className={styles.companyBody}>
                    <Title level={5} className={styles.companyName} title={item.branchName}>
                      {item.branchName}
                    </Title>

                    <span className={styles.companyTag}>
                      <IdcardOutlined />
                      <span>{item.branchShortcutName || "Branch"}</span>
                    </span>

                    <span className={styles.companyMeta}>
                      <TeamOutlined />
                      <span>{item.branchAddress || item.branchNumber || "Select to view companies"}</span>
                    </span>
                  </span>

                  <span className={styles.companyArrow}>
                    <RightOutlined />
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === "company" && (
            <div className={styles.yearViewWrapper} key={`company-view-${selectedBranch.branchId}`}>
              <div className={styles.backWrapper}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => {
                    setSelectedBranch(null);
                    setSelectedCompany(null);
                  }}
                >
                  <ArrowLeftOutlined />
                  <span>Back to Branches</span>
                </button>
              </div>

              {companiesForBranch.length === 0 ? (
                <Empty description="No company mapped under this branch" className={styles.emptyState} />
              ) : (
                <div className={styles.companyGrid}>
                  {companiesForBranch.map((item, index) => {
                    const isActive = activeCompanyId != null
                      && String(item.companyId) === String(activeCompanyId);

                    return (
                      <button
                        key={item.companyId}
                        type="button"
                        style={{ "--card-index": Math.min(index, 6) }}
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
            </div>
          )}

          {step === "year" && (
            <div
              className={styles.yearViewWrapper}
              key={`year-view-${selectedCompany?.companyId || selectedBranch?.branchId || "branch"}`}
            >
              <div className={styles.backWrapper}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => {
                    setSelectedCompany(null);
                    setSelectedBranch(null);
                  }}
                >
                  <ArrowLeftOutlined />
                  <span>Back to Branches</span>
                </button>
              </div>

              <div className={styles.yearGrid}>
                {yearOptions.map((item, index) => {
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
                      style={{ "--card-index": Math.min(index, 6) }}
                      className={`${styles.yearCard} ${isActive ? styles.yearCardActive : ""} ${isSelecting ? styles.yearCardSelecting : ""}`}
                      onClick={() => selectContext(item)}
                      aria-label={`Select financial year ${item.yearLabel}`}
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
                          <span className={styles.yearArrow} aria-hidden="true">
                            <SkeletonBlock variant="icon" width={16} height={16} />
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
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default CompanyYearPicker;
