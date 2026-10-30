/**
 * PermanentDeleteModal.jsx
 *
 * Secure confirmation modal for permanently deleting a Company or Branch.
 * Uses: BaseModal, Ant Design Form, TanStack Query (useMutation + useQuery),
 *       axiosInstance (api), toastNotify, lucide-react icons.
 *
 * Props:
 *   type       - "company" | "branch"
 *   entity     - { id, name, shortcutName, ...extra fields }
 *   open       - boolean
 *   onClose    - () => void
 *   onDeleted  - (result) => void  called after successful delete
 */

import { useState, useEffect, useCallback } from "react";
import { Form, Input, Checkbox, Spin, Tag } from "antd";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trash2, AlertTriangle, ShieldAlert, Building2, GitBranch } from "lucide-react";
import { api } from "../../../api/client/axiosInstance";
import ENDPOINTS from "../../../api/endpoints";
import { toastSuccess, toastError } from "../../../utils/toastNotify";
import BaseModal from "./BaseModal";
import styles from "../../../assets/scss/components/permanentDeleteModal.module.scss";

// ─── helpers ─────────────────────────────────────────────────────────────────

const formatNumber = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString() : "0");

function ImpactRow({ label, value, danger }) {
  return (
    <div className={styles.impactRow}>
      <span className={styles.impactLabel}>{label}</span>
      <span className={danger ? styles.impactValueDanger : styles.impactValue}>
        {value}
      </span>
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

const PermanentDeleteModal = ({ type, entity, open, onClose, onDeleted }) => {
  const [form] = Form.useForm();
  const [confirmed, setConfirmed] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [rateLimitMs, setRateLimitMs] = useState(0);
  const [running, setRunning] = useState(false);

  const isCompany = type === "company";
  const impactUrl = isCompany
    ? ENDPOINTS.tenantCompany.deleteImpact
    : ENDPOINTS.branch.deleteImpact;
  const deleteUrl = isCompany
    ? ENDPOINTS.tenantCompany.delete
    : ENDPOINTS.branch.delete;
  const entityLabel = isCompany ? "Company" : "Branch";

  // Reset state whenever modal opens
  useEffect(() => {
    if (open) {
      form.resetFields();
      setConfirmed(false);
      setServerError(null);
      setRateLimitMs(0);
      setRunning(false);
    }
  }, [open, form]);

  // Countdown timer for rate-limit
  useEffect(() => {
    if (rateLimitMs <= 0) return;
    const interval = setInterval(() => {
      setRateLimitMs((prev) => {
        const next = prev - 1000;
        if (next <= 0) { clearInterval(interval); return 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitMs]);

  // ── Impact fetch ────────────────────────────────────────────────────────────
  const {
    data: impactData,
    isLoading: impactLoading,
    isError: impactError,
    refetch: refetchImpact,
  } = useQuery({
    queryKey: ["permanentDeleteImpact", type, entity?.id],
    queryFn: async () => {
      const res = await api.post(impactUrl, { id: entity?.id });
      return res.data?.Data || null;
    },
    enabled: open && !!entity?.id,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  // ── Delete mutation ─────────────────────────────────────────────────────────
  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(deleteUrl, payload, { timeout: 120000 });
      return res.data;
    },
    onSuccess: (data) => {
      setRunning(false);
      if (data?.status === false) {
        if (data?.retryAfterMs) {
          setRateLimitMs(data.retryAfterMs);
          setServerError(null);
        } else {
          setServerError(data.message || "Delete failed.");
          // Clear passwords on wrong password
          form.setFieldsValue({ password: "", confirmPassword: "" });
        }
        return;
      }
      toastSuccess(data?.message || `${entityLabel} permanently deleted.`);
      onDeleted?.(data?.Data || data);
      onClose?.();
    },
    onError: (err) => {
      setRunning(false);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        `Failed to delete ${entityLabel}.`;
      const retryAfter = err?.response?.data?.retryAfterMs;
      if (err?.response?.status === 429 || retryAfter) {
        setRateLimitMs(retryAfter || 15 * 60 * 1000);
        setServerError(null);
      } else if (err?.response?.status === 403) {
        setServerError(msg);
        form.setFieldsValue({ password: "", confirmPassword: "" });
      } else {
        setServerError(msg);
      }
    },
  });

  // ── Password mismatch check ─────────────────────────────────────────────────
  const password = Form.useWatch("password", form) || "";
  const confirmPassword = Form.useWatch("confirmPassword", form) || "";
  const confirmName = Form.useWatch("confirmName", form) || "";
  const passwordMismatch = password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword;

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    form
      .validateFields()
      .then((values) => {
        if (values.password !== values.confirmPassword) return;
        if (values.confirmName !== entity?.name) return;
        setServerError(null);
        setRunning(true);
        doDelete({
          id: entity?.id,
          password: values.password,
          confirmPassword: values.confirmPassword,
          confirmName: values.confirmName,
        });
      })
      .catch(() => {});
  }, [form, entity, doDelete]);

  // ── Submit button disabled logic ────────────────────────────────────────────
  const nameMatches = confirmName.trim() === (entity?.name || "").trim();
  const canSubmit =
    confirmed &&
    nameMatches &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    !passwordMismatch &&
    !impactLoading &&
    !impactError &&
    !isDeleting &&
    rateLimitMs <= 0;

  // ── Impact content ──────────────────────────────────────────────────────────
  const renderImpact = () => {
    if (impactLoading) {
      return (
        <div className={styles.loadingImpact}>
          <Spin size="small" /> &nbsp; Loading impact data…
        </div>
      );
    }
    if (impactError) {
      return (
        <div className={styles.serverErrorBanner}>
          <AlertTriangle size={14} />
          <span>
            Could not load impact data.{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); refetchImpact(); }}>
              Retry
            </a>
          </span>
        </div>
      );
    }
    if (!impactData) return null;

    const totalRows = impactData.totalRows ?? impactData.perCompany?.reduce((a, p) => a + (p.totalRows || 0), 0) ?? 0;
    const companyCount = isCompany ? 1 : (impactData.companyCount || 0);
    const transfers = impactData.sharedTransfers || impactData.perCompany?.reduce((a, p) => ({ count: a.count + (p.sharedTransfers?.count || 0), otherCompanyNames: [...a.otherCompanyNames, ...(p.sharedTransfers?.otherCompanyNames || [])] }), { count: 0, otherCompanyNames: [] });

    return (
      <>
        <div className={styles.impactCard}>
          <div className={styles.impactTitle}>Impact Preview</div>
          {!isCompany && (
            <ImpactRow label="Companies under this branch" value={companyCount} danger={companyCount > 0} />
          )}
          <ImpactRow label="Total records to be deleted" value={formatNumber(totalRows)} danger={totalRows > 0} />
          {!isCompany && impactData.companies?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className={styles.impactTitle} style={{ marginBottom: 6 }}>Companies to be deleted</div>
              <div className={styles.companiesList}>
                {impactData.companies.map((c) => (
                  <div key={c.id} className={styles.companyListItem}>
                    <Building2 size={12} />
                    <span>{c.name}</span>
                    {c.shortcutName && <Tag color="blue" style={{ marginLeft: 4 }}>{c.shortcutName}</Tag>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {transfers?.count > 0 && (
          <div className={styles.transferWarning}>
            <AlertTriangle size={14} className={styles.transferWarningIcon} />
            <span>
              <strong>{transfers.count}</strong> inter-company transfer record(s) shared with{" "}
              {transfers.otherCompanyNames.length > 0
                ? transfers.otherCompanyNames.join(", ")
                : "other companies"}{" "}
              will also be removed.
            </span>
          </div>
        )}
      </>
    );
  };

  // ── Modal content ───────────────────────────────────────────────────────────
  const modalContent = (
    <div role="alertdialog" aria-describedby="perm-del-warning">
      {/* Server error banner */}
      {serverError && (
        <div className={styles.serverErrorBanner}>
          <ShieldAlert size={14} />
          <span>{serverError}</span>
        </div>
      )}

      {/* Rate limit banner */}
      {rateLimitMs > 0 && (
        <div className={styles.rateLimitBanner}>
          🔒 Too many failed attempts. Try again in{" "}
          <strong>{Math.ceil(rateLimitMs / 60000)} minute(s)</strong>.
        </div>
      )}

      {/* Impact */}
      {renderImpact()}

      {/* Confirmation form */}
      <div className={styles.formSection}>
        <div className={styles.formSectionLabel}>Confirm Deletion</div>
        <Form
          form={form}
          layout="vertical"
          size="middle"
          autoComplete="off"
        >
          {/* Acknowledgement checkbox */}
          <Form.Item
            name="acknowledged"
            valuePropName="checked"
            rules={[{ required: true, transform: (v) => v || undefined, type: "boolean", message: "You must acknowledge this action." }]}
            className={styles.checkboxRow}
          >
            <Checkbox onChange={(e) => setConfirmed(e.target.checked)}>
              <span className={styles.checkboxLabel}>
                I understand this action is <strong>irreversible</strong> and all data will be permanently lost.
              </span>
            </Checkbox>
          </Form.Item>

          {/* Type exact name */}
          <Form.Item
            label={`Type the ${entityLabel.toLowerCase()} name to confirm`}
            name="confirmName"
            rules={[
              { required: true, message: `Please type the ${entityLabel.toLowerCase()} name.` },
              {
                validator: (_, val) =>
                  val?.trim() === entity?.name
                    ? Promise.resolve()
                    : Promise.reject(new Error(`Name does not match. Expected: "${entity?.name}"`)),
              },
            ]}
          >
            <Input
              placeholder={entity?.name || ""}
              onPaste={(e) => e.preventDefault()}
              autoComplete="off"
              disabled={rateLimitMs > 0}
            />
          </Form.Item>

          {/* Password */}
          <Form.Item
            label="Your login password"
            name="password"
            rules={[{ required: true, message: "Password is required." }]}
          >
            <Input.Password
              placeholder="Enter your password"
              autoComplete="new-password"
              disabled={rateLimitMs > 0}
            />
          </Form.Item>

          {/* Confirm password */}
          <Form.Item
            label="Confirm password"
            name="confirmPassword"
            rules={[{ required: true, message: "Please confirm your password." }]}
          >
            <Input.Password
              placeholder="Re-enter your password"
              autoComplete="new-password"
              disabled={rateLimitMs > 0}
            />
          </Form.Item>

          {/* Inline mismatch error */}
          {passwordMismatch && (
            <div className={styles.passwordMismatch}>
              ⚠ Passwords do not match.
            </div>
          )}
        </Form>
      </div>

      {/* Footer warnings */}
      <div className={styles.footerWarnings} id="perm-del-warning">
        <div className={styles.footerWarningLine}>
          <AlertTriangle size={12} /> Take a database backup before deleting.
        </div>
        {running && (
          <div className={styles.runningNote}>
            ⏳ Do not use the system while deletion is running.
          </div>
        )}
      </div>
    </div>
  );

  // ── Footer buttons ──────────────────────────────────────────────────────────
  const footer = [
    <button
      key="cancel"
      className="ant-btn"
      onClick={onClose}
      disabled={isDeleting}
      style={{ marginRight: 8 }}
    >
      Cancel
    </button>,
    <button
      key="delete"
      className="ant-btn ant-btn-dangerous ant-btn-primary"
      onClick={handleSubmit}
      disabled={!canSubmit}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: canSubmit ? "var(--color-error, #e53e3e)" : undefined,
        borderColor: canSubmit ? "var(--color-error, #e53e3e)" : undefined,
        color: canSubmit ? "#fff" : undefined,
        cursor: canSubmit ? "pointer" : "not-allowed",
        opacity: canSubmit ? 1 : 0.5,
      }}
    >
      {isDeleting ? <Spin size="small" style={{ marginRight: 4 }} /> : <Trash2 size={14} />}
      {isDeleting ? "Deleting…" : `Delete ${entityLabel} permanently`}
    </button>,
  ];

  return (
    <BaseModal
      isOpen={open}
      onClose={isDeleting ? undefined : onClose}
      width={520}
      title={
        <div className={styles.modalHeader}>
          <span className={styles.modalHeaderIcon}>
            {isCompany ? <Building2 size={20} /> : <GitBranch size={20} />}
          </span>
          <div className={styles.modalHeaderText}>
            <span className={styles.modalHeaderTitle}>
              Permanently Delete {entityLabel}
            </span>
            <span className={styles.modalHeaderSubtitle}>
              {entity?.name}{entity?.shortcutName ? ` (${entity.shortcutName})` : ""}
            </span>
          </div>
        </div>
      }
      content={modalContent}
      footer={footer}
      destroyOnHidden
      closable={!isDeleting}
      maskClosable={false}
    />
  );
};

export default PermanentDeleteModal;

