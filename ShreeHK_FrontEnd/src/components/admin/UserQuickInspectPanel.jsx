import React, { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Spin } from "antd";
import { CloseOutlined, HistoryOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import { resolveUploadUrl } from "../../utils/uploadBaseUrl";
import {
    buildActivityNarrative,
    formatActivityRelativeTime,
} from "../../utils/activityLogFormatters";
import styles from "../../assets/scss/pages/admin/userQuickInspect.module.scss";

const formatDate = (value) => (value && dayjs(value).isValid() ? dayjs(value).format("DD-MMM-YYYY") : "—");

const getDisplayName = (user) => {
    const full = [user?.fname, user?.lname].filter(Boolean).join(" ").trim();
    return full || user?.username || "User";
};

const getPhotoLabel = (user) => {
    const src = user?.profile_image;
    if (!src) return "—";
    const parts = String(src).split(/[/\\]/);
    return parts[parts.length - 1] || "—";
};

const UserQuickInspectPanel = ({
    user,
    roleName,
    visible,
    onClose,
}) => {
    const [auditRows, setAuditRows] = useState([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const fetchSeqRef = useRef(0);

    const displayName = useMemo(() => getDisplayName(user), [user]);

    useEffect(() => {
        if (!visible || !user?.id) {
            setAuditRows([]);
            return undefined;
        }

        const seq = ++fetchSeqRef.current;
        setAuditLoading(true);

        api.get(ENDPOINTS.admin.activityLog, {
            params: {
                userId: user.id,
                limit: 5,
                offset: 0,
                mutationsOnly: "1",
            },
        })
            .then((res) => {
                if (seq !== fetchSeqRef.current) return;
                setAuditRows(res.data?.Data || []);
            })
            .catch(() => {
                if (seq !== fetchSeqRef.current) return;
                setAuditRows([]);
            })
            .finally(() => {
                if (seq === fetchSeqRef.current) setAuditLoading(false);
            });

        return () => {
            fetchSeqRef.current += 1;
        };
    }, [visible, user?.id]);

    if (!user) return null;

    const isActive = Number(user.is_active) !== 0;

    const detailItems = [
        { label: "Name", value: displayName },
        { label: "Profile", value: roleName || "—" },
        { label: "Photo", value: getPhotoLabel(user) },
        { label: "Contact", value: user.mobileno || user.email || "—" },
        { label: "Department", value: user.department || "—" },
        { label: "Last Updated", value: formatDate(user.updated_at) },
    ];

    return (
        <div
            className={`${styles.panelRoot} ${visible ? styles.visible : ""}`}
            aria-hidden={!visible}
        >
            <aside className={styles.panel}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Quick Inspect</h3>
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close quick inspect"
                    >
                        <CloseOutlined style={{ fontSize: 12 }} />
                    </button>
                </div>

                <div className={styles.body}>
                    <div className={styles.profileBlock}>
                        <Avatar
                            size={150}
                            src={user.profile_image ? resolveUploadUrl(user.profile_image) : undefined}
                            className={styles.avatar}
                        >
                            {displayName.charAt(0).toUpperCase()}
                        </Avatar>
                        <h4 className={styles.displayName}>{displayName}</h4>
                        <p className={styles.userId}>User #{user.id}</p>
                    </div>

                    <dl className={styles.detailList}>
                        {detailItems.map((item) => (
                            <div key={item.label} className={styles.detailRow}>
                                <dt className={styles.detailLabel}>{item.label}</dt>
                                <dd className={styles.detailValue}>{item.value}</dd>
                            </div>
                        ))}
                    </dl>

                    <h5 className={styles.sectionTitle}>Security Settings</h5>
                    <div className={styles.securityRow}>
                        <span className={styles.detailLabel}>MFA</span>
                        <span className={isActive ? styles.mfaActive : styles.mfaInactive}>
                            {isActive ? "Active" : "Inactive"}
                        </span>
                    </div>

                    <h5 className={styles.sectionTitle}>Recent Audit Log</h5>
                    {auditLoading ? (
                        <p className={styles.auditLoading}>
                            <Spin size="small" /> Loading activity…
                        </p>
                    ) : auditRows.length === 0 ? (
                        <p className={styles.auditEmpty}>No recent activity for this user.</p>
                    ) : (
                        <ul className={styles.auditList}>
                            {auditRows.map((row, index) => (
                                <li key={row.id} className={styles.auditItem}>
                                    <span className={styles.auditIcon} aria-hidden>
                                        {index === 0 ? <HistoryOutlined /> : "•"}
                                    </span>
                                    <div className={styles.auditContent}>
                                        <p className={styles.auditText}>
                                            {buildActivityNarrative(row) || row.description || "Activity recorded"}
                                        </p>
                                        <p className={styles.auditTime}>
                                            {formatActivityRelativeTime(row.createdAt)}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </aside>
        </div>
    );
};

export default UserQuickInspectPanel;
